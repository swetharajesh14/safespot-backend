const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io"); // 1. Missing Import

const app = express();
const server = http.createServer(app); 

// 2. Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Allows your phone to connect
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
const HistorySchema = new mongoose.Schema({
  userId: String,
  latitude: Number,
  longitude: Number,
  timestamp: { type: Date, default: Date.now }
});


// POST route to save history
// Post location history
app.post("/api/history", async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
    
    // Inga thaan namma "New" entry create panrom
    const newHistory = new History({
      userId,
      latitude,
      longitude
    });

    await newHistory.save();
    console.log("Activity Saved for:", userId);
    res.status(200).json({ message: "Activity saved successfully" });
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ error: "Failed to save activity" });
  }
});

// MongoDB Connection
const mongoURI = "mongodb://127.0.0.1:27017/safespot";
mongoose.connect(mongoURI).then(() => console.log("✅ DB Connected"));

const Protector = mongoose.model('Protector', new mongoose.Schema({
  userId: String, name: String, phone: String, photo: String
}));
// History Schema
const historySchema = new mongoose.Schema({
  userId: String,
  latitude: Number,
  longitude: Number,
  timestamp: { type: Date, default: Date.now }
});

const History = mongoose.model("History", historySchema);

// API Routes
app.get('/', (req, res) => res.send('Server Active'));

app.post('/api/protectors', async (req, res) => {
  try {
    const newP = new Protector(req.body);
    await newP.save();
    res.status(200).json({ message: "Saved" });
  } catch (err) { res.status(500).json(err); }
});

app.get('/api/history/:userId', async (req, res) => {
  try {
    // find() nu irunthalthaan ella data-vum varum
    const history = await History.find({ userId: req.params.userId }).sort({ timestamp: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. SOCKET LOGIC
io.on('connection', (socket) => {
  console.log('📡 New Device Connected to Socket');

  socket.on('update_location', (data) => {
    console.log(`📍 Location from ${data.name}:`, data.latitude, data.longitude);
    
    // This sends the data to your map.tsx listener
    // We use a general event name to make it easier for the demo
    io.emit('location_update', data); 
    
    // Also keeping your specific one just in case
    io.emit(`guardian_view_${data.userId}`, data);
  });

  socket.on('disconnect', () => {
    console.log('❌ Device disconnected');
  });
});
// API: Remove Protector
// API: Remove Protector
// index.js (Backend)
app.delete('/api/protectors/:id', async (req, res) => {
  try {
    const idToDelete = req.params.id;
    console.log("Attempting to delete ID from DB:", idToDelete);

    // This is the critical line
    const result = await Protector.findByIdAndDelete(idToDelete);

    if (result) {
      console.log("✅ Successfully removed from MongoDB");
      res.status(200).json({ message: "Deleted" });
    } else {
      console.log("❌ ID not found in MongoDB");
      res.status(404).json({ message: "ID not found" });
    }
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json(err);
  }
});
// 4. Start Server
server.listen(3000, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://192.168.1.19:3000`);
});