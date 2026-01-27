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
mongoose.connect(mongoURI).then(() => console.log("✅ DB Connected")).catch(err => console.log(err));

// 2. SCHEMAS (Updated for Category 1 & 2)
const Protector = mongoose.model('Protector', new mongoose.Schema({
  userId: String, name: String, phone: String, photo: String
}));

// Define the Schema first
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

// Create the Model once
const History = mongoose.model("History", historySchema);
// 3. ANALYTICS ENGINE (Category 3, 4, & 5)
app.get('/api/analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const startOfDay = new Date(); 
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await History.find({ userId, timestamp: { $gte: startOfDay } });

    // 1. Calculate Avg Speed FIRST (Fixes the initialization error)
    const totalSpeed = logs.reduce((sum, log) => sum + (log.speed || 0), 0);
    const avgSpeedValue = logs.length > 0 ? (totalSpeed / logs.length).toFixed(2) : "0.00";

    // 2. Calculate Active Time
    const activeMinutes = logs.filter(log => log.intensity !== 'Idle' || log.speed > 0.2).length;
    const activeTimeStr = activeMinutes < 60 
      ? `${activeMinutes} mins` 
      : `${(activeMinutes / 60).toFixed(1)} hrs`;

    // 3. Heatmap
    // Inside app.get('/api/analytics/:userId')
const heatmap = Array(24).fill(0);

logs.forEach(log => {
  const hour = new Date(log.timestamp).getHours();
  // FIX: Count it if there is ANY speed or ANY motion detected
  if (log.speed > 0.1 || log.intensity !== 'Idle') {
    heatmap[hour] += 2; // Increment by 2 to make the bar grow faster
  }
});

    // 4. Send Response
    res.json({
      activeTime: activeTimeStr,
      avgSpeed: `${avgSpeedValue} m/s`, // Use the new variable name here
      heatmap: heatmap,
      timeline: logs.filter(l => l.isAbnormal).map(l => ({
        time: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: "Irregular Movement",
        type: "High"
      })).slice(-3)
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});
// 4. DATA INGESTION (Category 1, 2, & 4)
app.post("/api/history", async (req, res) => {
  try {
    // 1. EXTRACT ALL SENSOR DATA (Category 1.A)
    const { userId, latitude, longitude, speed, accelX, accelY, accelZ, gyroX, gyroY, gyroZ } = req.body;

    // 2. FETCH PERSONAL BASELINE (Category 4.1)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const pastLogs = await History.find({ userId, timestamp: { $gte: weekAgo } });
    
    // Calculate personal average speed baseline
    const avgSpeedBaseline = pastLogs.length > 0 
      ? pastLogs.reduce((sum, log) => sum + (log.speed || 0), 0) / pastLogs.length 
      : 1.2; // Default to 1.2 m/s if no history exists

    // 3. CLASSIFICATION LOGIC (Category 2.2)
    let intensity = 'Idle';
    if (speed > 0.3) intensity = 'Light';
    if (speed > 1.5) intensity = 'Moderate';
    if (speed > 3.0) intensity = 'High-intensity';

    // 4. DEVIATION DETECTION (Category 4.2)
    // Flag if speed is 2x your normal baseline or if rotation is extreme
    const rotationMagnitude = Math.sqrt((gyroX || 0)**2 + (gyroY || 0)**2 + (gyroZ || 0)**2);
    const isAbnormal = (speed > (avgSpeedBaseline * 2) && speed > 2.5) || rotationMagnitude > 8;

    const newHistory = new History({ 
      userId, latitude, longitude, speed, 
      accelX, accelY, accelZ, 
      gyroX, gyroY, gyroZ, 
      intensity, isAbnormal 
    });

    await newHistory.save();

    if (isAbnormal) {
      io.emit(`alert_${userId}`, { msg: "Abnormal movement pattern detected!" });
    }

    res.status(200).json({ message: "Activity Analyzed", intensity, isAbnormal });
  } catch (error) { 
    console.error("Ingestion Error:", error);
    res.status(500).json({ error: "Ingestion Failed" }); 
  }
});

// PRESERVED CONTACT ROUTES
app.get('/api/protectors/:userId', async (req, res) => {
  const userContacts = await Protector.find({ userId: req.params.userId });
  res.json(userContacts);
});
app.post('/api/protectors', async (req, res) => {
  const newP = new Protector(req.body); await newP.save();
  res.status(200).json({ message: "Saved" });
});
const port = process.env.PORT || 10000;
server.listen(port, () => console.log(`🚀 Server on port ${port}`));