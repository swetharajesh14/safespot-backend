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

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
const mongoURI = "mongodb+srv://swetha:SafeSpot2026@cluster0.ktyl7lp.mongodb.net/safespot?retryWrites=true&w=majority";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ DB Connected to Atlas"))
  .catch(err => console.error("❌ DB Connection Error:", err));

// 2. SCHEMAS
const protectorSchema = new mongoose.Schema({
  userId: String,
  name: String,
  phone: String,
  photo: String
});
const Protector = mongoose.model('Protector', protectorSchema);

// 3. API ROUTES

// FIX: This route was missing, which caused the "Cannot GET" error
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
    const { userId, name, phone, photo } = req.body;
    const newContact = new Protector({ userId, name, phone, photo });
    await newContact.save();
    res.status(201).json(newContact);
  } catch (err) {
    res.status(500).json({ error: "Failed to save" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});