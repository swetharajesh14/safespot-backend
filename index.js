const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app); 

// 1. Updated Socket.io to use the server instance
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// 2. FIXED: Replaced 127.0.0.1 with your Atlas Connection String
// Replace PASSWORD with your NEW MongoDB Atlas password
const mongoURI ="mongodb+srv://swetha:SafeSpot2026@cluster0.ktyl7lp.mongodb.net/?appName=Cluster";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ DB Connected to Atlas"))
  .catch(err => console.error("❌ DB Connection Error:", err));

// Schemas
const Protector = mongoose.model('Protector', new mongoose.Schema({
  userId: String, name: String, phone: String, photo: String
}));

const History = mongoose.model("History", new mongoose.Schema({
  userId: String,
  latitude: Number,
  longitude: Number,
  timestamp: { type: Date, default: Date.now }
}));

// Routes
app.get('/', (req, res) => res.send('Server Active and Live'));

app.post("/api/history", async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
    const newHistory = new History({ userId, latitude, longitude });
    await newHistory.save();
    console.log("Activity Saved for:", userId);
    res.status(200).json({ message: "Activity saved successfully" });
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ error: "Failed to save activity" });
  }
});

app.post('/api/protectors', async (req, res) => {
  try {
    const newP = new Protector(req.body);
    await newP.save();
    res.status(200).json({ message: "Saved" });
  } catch (err) { res.status(500).json(err); }
});

app.get('/api/history/:userId', async (req, res) => {
  try {
    const history = await History.find({ userId: req.params.userId }).sort({ timestamp: -1 });
    res.json(history);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/protectors/:id', async (req, res) => {
  try {
    const result = await Protector.findByIdAndDelete(req.params.id);
    if (result) res.status(200).json({ message: "Deleted" });
    else res.status(404).json({ message: "ID not found" });
  } catch (err) { res.status(500).json(err); }
});

// Socket Logic
io.on('connection', (socket) => {
  console.log('📡 New Device Connected to Socket');
  socket.on('update_location', (data) => {
    console.log(`📍 Location from ${data.name}:`, data.latitude, data.longitude);
    io.emit('location_update', data); 
    io.emit(`guardian_view_${data.userId}`, data);
  });
  socket.on('disconnect', () => console.log('❌ Device disconnected'));
});

// 3. FIXED: server.listen instead of app.listen (Required for Socket.io)
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});