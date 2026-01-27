/*const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

// TWO SEPARATE FILES
const PROTECTORS_FILE = './protectors.json';
const HISTORY_FILE = './history.json';

// Helper: Universal Load
const loadData = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    try {
        return JSON.parse(fs.readFileSync(filePath));
    } catch (e) { return []; }
};

// Helper: Universal Save
const saveData = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// ==========================================
// 1. EMERGENCY CONTACTS (Protectors) - FIXED
// ==========================================
app.get('/api/protectors/:userId', (req, res) => {
    const data = loadData(PROTECTORS_FILE);
    const userContacts = data.filter(p => p.userId === req.params.userId);
    res.json(userContacts);
});

app.post('/api/protectors', (req, res) => {
    const data = loadData(PROTECTORS_FILE);
    const newContact = { 
        ...req.body, 
        _id: Date.now().toString() // Gives every contact a unique ID
    };
    data.push(newContact);
    saveData(PROTECTORS_FILE, data);
    console.log("✅ Contact Saved to DB:", newContact.name);
    res.status(201).json(newContact);
});

app.delete('/api/protectors/:id', (req, res) => {
    let data = loadData(PROTECTORS_FILE);
    data = data.filter(p => p._id !== req.params.id);
    saveData(PROTECTORS_FILE, data);
    res.json({ message: "Deleted" });
});

// ==========================================
// 2. ANALYTICS & MOVEMENT (History)
// ==========================================
app.post('/api/history', (req, res) => {
    const history = loadData(HISTORY_FILE);
    const newPing = {
        _id: Date.now().toString(),
        ...req.body,
        isAbnormal: req.body.speed > 3.0, 
        timestamp: new Date().toISOString()
    };
    history.push(newPing);
    saveData(HISTORY_FILE, history);
    res.status(201).json(newPing);
});

app.get('/api/analytics/:userId', (req, res) => {
    const history = loadData(HISTORY_FILE).filter(h => h.userId === req.params.userId);
    const today = new Date().toISOString().split('T')[0];
    const todaysLogs = history.filter(log => log.timestamp.startsWith(today));

    // Dashboard calculations
    const activeMinutes = todaysLogs.length; 
    const avgSpeed = todaysLogs.length > 0 
        ? (todaysLogs.reduce((sum, log) => sum + log.speed, 0) / todaysLogs.length).toFixed(2)
        : 0;

    res.json({
        activeTime: `${(activeMinutes / 60).toFixed(1)} hrs`,
        avgSpeed: `${avgSpeed} m/s`,
        consistency: activeMinutes > 50 ? "Stable" : "Analyzing...",
        abnormalCount: todaysLogs.filter(l => l.isAbnormal).length,
        heatmap: Array(24).fill(0).map((_, hr) => todaysLogs.filter(l => new Date(l.timestamp).getHours() === hr).length),
        timeline: todaysLogs.filter(l => l.isAbnormal).map(l => ({
            time: new Date(l.timestamp).toLocaleTimeString(),
            title: "Speed Deviation",
            type: "Medium"
        }))
    });
});

app.listen(3000, '0.0.0.0', () => {
    console.log("🚀 SERVER RUNNING - Contacts & Analytics are separate and active!");
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

// DATABASE CONNECTION
// REPLACE 'YOUR_PASSWORD' with your actual MongoDB Atlas password
const mongoURI = "mongodb+srv://swetha:SafeSpot2026@cluster0.abcde.mongodb.net/safespot?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ DB Connected to Atlas"))
  .catch(err => console.error("❌ DB Connection Error:", err));

// --- SCHEMAS ---
const protectorSchema = new mongoose.Schema({
  userId: String,
  name: String,
  phone: String,
  photo: String
});

const historySchema = new mongoose.Schema({
  userId: String,
  latitude: Number,
  longitude: Number,
  timestamp: { type: Date, default: Date.now }
});

const Protector = mongoose.model('Protector', protectorSchema);
const History = mongoose.model("History", historySchema);

// --- API ROUTES ---

app.get('/', (req, res) => res.send('Server is Live and Running'));

// SAVE PROTECTOR (Contact)
app.post('/api/protectors', async (req, res) => {
  try {
    console.log("📥 Received Protector Data:", req.body);
    const { userId, name, phone, photo } = req.body;
    
    const newProtector = new Protector({ userId, name, phone, photo });
    await newProtector.save();
    
    res.status(200).json({ message: "Contact Saved Successfully", data: newProtector });
  } catch (err) {
    console.error("❌ Save Protector Error:", err);
    res.status(500).json({ error: "Failed to save contact", details: err.message });
  }
});

// SAVE HISTORY (Location)
app.post("/api/history", async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
    const newHistory = new History({ userId, latitude, longitude });
    await newHistory.save();
    res.status(200).json({ message: "Activity saved" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save activity" });
  }
});

// GET HISTORY
app.get('/api/history/:userId', async (req, res) => {
  try {
    const history = await History.find({ userId: req.params.userId }).sort({ timestamp: -1 });
    res.json(history);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE PROTECTOR
app.delete('/api/protectors/:id', async (req, res) => {
  try {
    const result = await Protector.findByIdAndDelete(req.params.id);
    if (result) res.status(200).json({ message: "Deleted" });
    else res.status(404).json({ message: "ID not found" });
  } catch (err) { res.status(500).json(err); }
});

// --- SOCKET LOGIC ---
io.on('connection', (socket) => {
  console.log('📡 Device Connected');
  socket.on('update_location', (data) => {
    io.emit('location_update', data);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});