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
}); */

const express = require('express');
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
});