/*const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app); 

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
const mongoURI = "mongodb+srv://swetha:SafeSpot2026@cluster0.ktyl7lp.mongodb.net/safespot?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ DB Connected to Atlas"))
  .catch(err => console.error("❌ DB Connection Error:", err));

// 2. SCHEMAS
const Protector = mongoose.model('Protector', new mongoose.Schema({
  userId: String, name: String, phone: String, photo: String
}));

const History = mongoose.model("History", new mongoose.Schema({
  userId: String, latitude: Number, longitude: Number, timestamp: { type: Date, default: Date.now }
}));

// 3. ROUTES
app.get('/', (req, res) => res.send('Server Active and Live'));

// NEW: This is what fixes the blank screen in your app
app.get('/api/protectors/:userId', async (req, res) => {
  try {
    const userContacts = await Protector.find({ userId: req.params.userId });
    res.json(userContacts); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/protectors', async (req, res) => {
  try {
    const newP = new Protector(req.body);
    await newP.save();
    res.status(200).json({ message: "Saved Successfully", data: newP });
  } catch (err) { res.status(500).json(err); }
});

app.post("/api/history", async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
    const newHistory = new History({ userId, latitude, longitude });
    await newHistory.save();
    res.status(200).json({ message: "Activity saved successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save activity" });
  }
});

// 4. SOCKET LOGIC
io.on('connection', (socket) => {
  console.log('📡 Device Connected');
  socket.on('update_location', (data) => {
    io.emit('location_update', data); 
  });
});

const port = process.env.PORT || 10000;
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
}); 
*/



















/*const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app); 

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
const mongoURI = "mongodb+srv://swetha:SafeSpot2026@cluster0.ktyl7lp.mongodb.net/safespot?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ DB Connected to Atlas"))
  .catch(err => console.error("❌ DB Connection Error:", err));

// 2. SCHEMAS
const Protector = mongoose.model('Protector', new mongoose.Schema({
  userId: String, 
  name: String, 
  phone: String, 
  photo: String
}));

const History = mongoose.model("History", new mongoose.Schema({
  userId: String, 
  latitude: Number, 
  longitude: Number, 
  speed: { type: Number, default: 0 }, // Added speed for analytics
  timestamp: { type: Date, default: Date.now }
}));

// 3. ROUTES

app.get('/', (req, res) => res.send('Server Active and Live'));

// --- CONTACT ROUTES (PRESERVED) ---
app.get('/api/protectors/:userId', async (req, res) => {
  try {
    const userContacts = await Protector.find({ userId: req.params.userId });
    res.json(userContacts); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/protectors', async (req, res) => {
  try {
    const newP = new Protector(req.body);
    await newP.save();
    res.status(200).json({ message: "Saved Successfully", data: newP });
  } catch (err) { res.status(500).json(err); }
});

app.delete('/api/protectors/:id', async (req, res) => {
  try {
    await Protector.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json(err); }
});

// --- MOVEMENT & ANALYTICS ROUTES (NEW) ---

// This route calculates the data for your frontend "cards" and "heatmap"
app.get('/api/analytics/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Get today's logs
    const logs = await History.find({
      userId: userId,
      timestamp: { $gte: startOfDay }
    }).sort({ timestamp: 1 });

    // 1. Calculate Active Time (based on number of 1-minute pings)
    const activeMinutes = logs.length;
    
    // 2. Calculate Avg Speed
    const totalSpeed = logs.reduce((sum, log) => sum + (log.speed || 0), 0);
    const avgSpeed = logs.length > 0 ? (totalSpeed / logs.length).toFixed(2) : "0.00";

    // 3. Generate 24-Hour Heatmap
    const heatmap = Array(24).fill(0);
    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      heatmap[hour] += 1;
    });

    // 4. Create Abnormal Timeline (Speed > 3.0 m/s)
    const timeline = logs
      .filter(log => (log.speed || 0) > 3.0)
      .map(log => ({
        time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: "Speed Deviation Detected",
        type: "Medium"
      }));

    res.json({
      activeTime: `${(activeMinutes / 60).toFixed(1)} hrs`,
      avgSpeed: `${avgSpeed} m/s`,
      heatmap: heatmap,
      timeline: timeline.slice(-10) // Show last 10 events
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/history", async (req, res) => {
  try {
    const { userId, latitude, longitude, speed } = req.body;
    const newHistory = new History({ 
      userId, 
      latitude, 
      longitude, 
      speed: speed || 0 
    });
    await newHistory.save();
    console.log(`📍 Movement Logged for ${userId}: ${speed || 0} m/s`);
    res.status(200).json({ message: "Activity saved successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save activity" });
  }
});

// 4. SOCKET LOGIC
io.on('connection', (socket) => {
  console.log('📡 Device Connected to Socket');
  socket.on('update_location', (data) => {
    io.emit('location_update', data); 
  });
});

const port = process.env.PORT || 10000;
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
}); */







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

// 1. DATABASE CONNECTION
const mongoURI = "mongodb+srv://swetha:SafeSpot2026@cluster0.ktyl7lp.mongodb.net/safespot?retryWrites=true&w=majority";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ DB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// 2. SCHEMAS
const Protector = mongoose.model('Protector', new mongoose.Schema({
  userId: String, name: String, phone: String, photo: String
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

    // CRITICAL: Sort by timestamp -1 ensures the dashboard sees the latest shake
    const logs = await History.find({ userId, timestamp: { $gte: startOfDay } })
                              .sort({ timestamp: -1 });

    // 3.1 Avg Speed
    const totalSpeed = logs.reduce((sum, log) => sum + (log.speed || 0), 0);
    const avgSpeedValue = logs.length > 0 ? (totalSpeed / logs.length).toFixed(2) : "0.00";

    // 3.2 Active Time (Logs count as minutes if not Idle)
    const activeMinutes = logs.filter(log => log.intensity !== 'Idle' || log.speed > 0.1).length;
    const activeTimeStr = activeMinutes < 60 ? `${activeMinutes} mins` : `${(activeMinutes / 60).toFixed(1)} hrs`;

    // 3.3 Stability Index Calculation
    let stabilityScore = 100;
    if (logs.length > 0) {
      // Look at the last 5 logs for a more responsive UI
      const recentLogs = logs.slice(0, 5); 
      const totalRotation = recentLogs.reduce((sum, log) => 
        sum + Math.abs(log.gyroX || 0) + Math.abs(log.gyroY || 0) + Math.abs(log.gyroZ || 0), 0);
      
      const avgRotation = totalRotation / recentLogs.length;
      // Adjusted sensitivity so shakes visibly drop the score
      stabilityScore = Math.max(10, Math.min(100, 100 - (avgRotation * 40)));
    }

    // 3.4 Heatmap (Hourly)
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

    // 4.1 Classification Logic (Lowered thresholds for easier testing)
    const motionMag = Math.sqrt((accelX || 0)**2 + (accelY || 0)**2 + (accelZ || 0)**2);
    
    let intensity = 'Idle';
    if (motionMag > 1.2 || speed > 0.2) intensity = 'Light';
    if (motionMag > 2.5 || speed > 1.5) intensity = 'Moderate';
    if (motionMag > 4.0 || speed > 3.0) intensity = 'High-intensity';

    // 4.2 Deviation Detection
    const rotationMag = Math.sqrt((gyroX || 0)**2 + (gyroY || 0)**2 + (gyroZ || 0)**2);
    const isAbnormal = motionMag > 4.5 || rotationMag > 6.0;

    const newHistory = new History({ 
      userId, latitude, longitude, speed, 
      accelX, accelY, accelZ, 
      gyroX, gyroY, gyroZ, 
      intensity, isAbnormal,
      timestamp: new Date() // Ensures timestamp is always current
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

const port = process.env.PORT || 10000;
server.listen(port, () => console.log(`🚀 Server on port ${port}`));