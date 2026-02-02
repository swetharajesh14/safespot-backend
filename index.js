require('node:dns').setServers(['8.8.8.8', '8.8.4.4']); // Force Google DNS
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

// This string targets a single node directly to bypass whitelist/DNS lag
// Ensure the password and database name ('safespot') are perfectly typed

// NEW FRESH URI
// A simplified direct connection to one shard
 // Clean string for cloud deployment
// This string bypasses the DNS SRV record by pointing directly to the cluster shards
const mongoURI = "mongodb://admin_user:SafeSpot123@cluster0-shard-00-00.ktyl7lp.mongodb.net:27017/safespot?ssl=true&authSource=admin&directConnection=true";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ Render connected to Atlas successfully!"))
  .catch(err => console.log("❌ Render failed to connect:", err));
const connectDB = async () => {
  console.log("🚀 Step 1: Initiating connection request...");
  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 15000, // Wait 15 seconds before giving up
      family: 4 // Force IPv4 to bypass hotspot issues
    });
    console.log("✅ Step 2: Connection established with Atlas!");
    console.log("📂 Step 3: Linked to 'safespot' database.");
  } catch (err) {
    console.log("❌ CONNECTION FAILED!");
    console.log("Reason:", err.message);
    // If it fails, we try again in 5 seconds
    setTimeout(connectDB, 5000);
  }
};

connectDB();
// 2. SCHEMAS
const Protector = mongoose.model('Protector', new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  photo: String
}));

const History = mongoose.model("History", new mongoose.Schema({
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
}));

// 3. ROUTES

// ROOT CHECK (Fixes "Cannot GET /")
app.get('/', (req, res) => {
  res.send('<h1>✅ SafeSpot Backend is Fully Operational!</h1>');
});

// --- CONTACTS (MY CIRCLE) ROUTES ---

app.post('/api/protectors', async (req, res) => {
  try {
    const newContact = new Protector(req.body);
    await newContact.save();
    console.log(`👤 Contact Saved: ${req.body.name}`);
    res.status(200).json({ success: true, message: "Contact saved successfully!" });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/protectors/:userId', async (req, res) => {
  try {
    const contacts = await Protector.find({ userId: req.params.userId });
    res.json(contacts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/protectors/:id', async (req, res) => {
  try {
    await Protector.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Contact deleted successfully!" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ANALYTICS ENGINE (CALCULATIONS) ---

app.get('/api/analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await History.find({ userId, timestamp: { $gte: startOfDay } }).sort({ timestamp: -1 });

    // Calculate Heatmap (Activity per hour)
    const heatmap = Array(24).fill(0);
    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      if (log.intensity !== 'Idle') heatmap[hour] += 1;
    });

    // Stability Score calculation based on Gyroscope data
    let stabilityScore = 100;
    if (logs.length > 0) {
      const recent = logs.slice(0, 10);
      const totalRot = recent.reduce((s, l) => s + Math.abs(l.gyroX || 0) + Math.abs(l.gyroY || 0), 0);
      stabilityScore = Math.max(10, 100 - (totalRot * 5));
    }

    res.json({
      heatmap,
      stabilityScore: Math.round(stabilityScore),
      currentIntensity: logs.length > 0 ? logs[0].intensity : 'Idle',
      logsFound: logs.length
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- DATA INGESTION ---
app.post("/api/history", async (req, res) => {
  try {
    const data = req.body;
    const motionMag = Math.sqrt((data.accelX || 0)**2 + (data.accelY || 0)**2 + (data.accelZ || 0)**2);
    
    let intensity = 'Idle';
    if (motionMag > 1.2) intensity = 'Light';
    if (motionMag > 2.5) intensity = 'Moderate';
    if (motionMag > 4.0) intensity = 'High-intensity';

    const isAbnormal = motionMag > 4.5;
    const log = new History({ ...data, intensity, isAbnormal });
    await log.save();

    if (isAbnormal) {
      io.emit(`alert_${data.userId}`, { msg: "Abnormal movement!", intensity });
    }
    res.status(200).json({ success: true, intensity, isAbnormal });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. START
const port = process.env.PORT || 10000;
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});