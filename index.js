const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION CONFIG
// Using the Direct Shard connection string to bypass DNS SRV issues
// REPLACE your current mongoURI with this exact string:
// Replace the entire mongoURI line with this:
//const mongoURI = "mongodb://swetha:SafeSpot2026@cluster0-shard-00-00.ktyl7lp.mongodb.net:27017,cluster0-shard-00-01.ktyl7lp.mongodb.net:27017,cluster0-shard-00-02.ktyl7lp.mongodb.net:27017/safespot?ssl=true&replicaSet=atlas-ktyl7lp-shard-0&authSource=admin&retryWrites=true&w=majority";

// In your mongoose.connect, add the 'family: 4' option:
/*mongoose.connect(mongoURI, { family: 4 })
  .then(() => console.log("✅ DB Connected Successfully!"))
  .catch(err => console.log("❌ DB Error:", err.message));*/

// 1. DEFINE the function first
const mongoURI = process.env.MONGODB_URI;

const connectWithRetry = () => {
  // Only call connect here!
  mongoose.connect(mongoURI)
    .then(() => console.log("✅ DB Connected Successfully!"))
    .catch(err => {
      console.log("❌ DB Error:", err.message);
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();
// 2. SCHEMAS
const Protector = mongoose.model('Protector', new mongoose.Schema({
  userId: String, 
  name: String, 
  phone: String, 
  photo: String
}));

const historySchema = new mongoose.Schema({
  userId: String,
  latitude: Number,
  longitude: Number,
  speed: { type: Number, default: 0 },
  accelX: { type: Number, default: 0 }, 
  accelY: { type: Number, default: 0 }, 
  accelZ: { type: Number, default: 0 },
  gyroX: { type: Number, default: 0 }, 
  gyroY: { type: Number, default: 0 }, 
  gyroZ: { type: Number, default: 0 },
  intensity: { type: String, default: 'Idle' },
  isAbnormal: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const History = mongoose.model("History", historySchema);

// 3. ANALYTICS ENGINE (GET DATA)
app.get('/api/analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await History.find({ userId, timestamp: { $gte: startOfDay } }) .sort({ timestamp: -1 });

    const totalSpeed = logs.reduce((sum, log) => sum + (log.speed || 0), 0);
    const avgSpeedValue = logs.length > 0 ? (totalSpeed / logs.length).toFixed(2) : "0.00";

    const activeMinutes = logs.filter(log => log.intensity !== 'Idle' || log.speed > 0.1).length;
    const activeTimeStr = activeMinutes < 60 ? `${activeMinutes} mins` : `${(activeMinutes / 60).toFixed(1)} hrs`;

    let stabilityScore = 100;
    if (logs.length > 0) {
      const recentLogs = logs.slice(0, 5); 
      const totalRotation = recentLogs.reduce((sum, log) => 
        sum + Math.abs(log.gyroX || 0) + Math.abs(log.gyroY || 0) + Math.abs(log.gyroZ || 0), 0);
      
      const avgRotation = totalRotation / recentLogs.length;
      stabilityScore = Math.max(10, Math.min(100, 100 - (avgRotation * 40)));
    }

    const heatmap = Array(24).fill(0);
    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      if (log.speed > 0.1 || log.intensity !== 'Idle') heatmap[hour] += 2;
    });

    res.json({
      activeTime: activeTimeStr,
      avgSpeed: `${avgSpeedValue} m/s`,
      heatmap: heatmap,
      currentIntensity: logs.length > 0 ? logs[0].intensity : 'Idle',
      stabilityScore: Math.round(stabilityScore),
      timeline: logs.filter(l => l.isAbnormal).map(l => ({
        time: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: l.intensity === 'High-intensity' ? "Emergency Shake" : "Abnormal Movement",
        type: "High"
      })).slice(0, 3)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. DATA INGESTION (POST DATA)
app.post("/api/history", async (req, res) => {
  try {
    const { userId, latitude, longitude, speed, accelX, accelY, accelZ, gyroX, gyroY, gyroZ } = req.body;

    const motionMag = Math.sqrt((accelX || 0)**2 + (accelY || 0)**2 + (accelZ || 0)**2);
    
    let intensity = 'Idle';
    if (motionMag > 1.2 || speed > 0.2) intensity = 'Light';
    if (motionMag > 2.5 || speed > 1.5) intensity = 'Moderate';
    if (motionMag > 4.0 || speed > 3.0) intensity = 'High-intensity';

    const rotationMag = Math.sqrt((gyroX || 0)**2 + (gyroY || 0)**2 + (gyroZ || 0)**2);
    const isAbnormal = motionMag > 4.5 || rotationMag > 6.0;

    const newHistory = new History({ 
      userId, latitude, longitude, speed, 
      accelX, accelY, accelZ, 
      gyroX, gyroY, gyroZ, 
      intensity, isAbnormal,
      timestamp: new Date()
    });

    await newHistory.save();

    if (isAbnormal) {
      io.emit(`alert_${userId}`, { msg: "Abnormal movement detected!", intensity });
      console.log(`🚨 Alert Emitted for ${userId}`);
    }

    res.status(200).json({ message: "Activity Analyzed", intensity, isAbnormal });
  } catch (error) { 
    console.error("Ingestion Error:", error);
    res.status(500).json({ error: "Ingestion Failed" }); 
  }
});

// 5. PROTECTOR ROUTES
app.get('/api/protectors/:userId', async (req, res) => {
  try {
    const userContacts = await Protector.find({ userId: req.params.userId });
    res.json(userContacts);
  } catch (err) { res.status(500).send(err); }
});

app.post('/api/protectors', async (req, res) => {
  try {
    const newP = new Protector(req.body); 
    await newP.save();
    res.status(200).json({ message: "Saved" });
  } catch (err) { res.status(500).send(err); }
});

app.delete('/api/protectors/:id', async (req, res) => {
  try {
    await Protector.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. START SERVER
const port = process.env.PORT || 10000;
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});