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
const mongoURI = "mongodb://swetha:SafeSpot2026@cluster0-shard-00-00.ktyl7lp.mongodb.net:27017,cluster0-shard-00-01.ktyl7lp.mongodb.net:27017,cluster0-shard-00-02.ktyl7lp.mongodb.net:27017/safespot?ssl=true&replicaSet=atlas-ktyl7lp-shard-0&authSource=admin&retryWrites=true&w=majority";

const connectWithRetry = () => {
  mongoose.connect(mongoURI, { family: 4, serverSelectionTimeoutMS: 5000 })
    .then(() => console.log("✅ DB Connected Successfully!"))
    .catch(err => {
      console.log("❌ DB Error:", err.message);
      setTimeout(connectWithRetry, 5000);
    });
};
connectWithRetry();

// 2. SCHEMAS
const ProtectorSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  photo: String
});
const Protector = mongoose.model('Protector', ProtectorSchema);

const HistorySchema = new mongoose.Schema({
  userId: String,
  latitude: Number,
  longitude: Number,
  speed: { type: Number, default: 0 },
  accelX: Number, accelY: Number, accelZ: Number,
  gyroX: Number, gyroY: Number, gyroZ: Number,
  intensity: { type: String, default: 'Idle' },
  isAbnormal: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});
const History = mongoose.model("History", HistorySchema);

// 3. ROUTES

// ROOT CHECK
app.get('/', (req, res) => {
  res.send('<h1>✅ SafeSpot Backend is Fully Operational!</h1>');
});

// --- PROTECTOR (CONTACTS) SECTION ---

// ADD CONTACT
app.post('/api/protectors', async (req, res) => {
  try {
    const { userId, name, phone, photo } = req.body;
    const newContact = new Protector({ userId, name, phone, photo });
    await newContact.save();
    console.log(`👤 Contact Saved: ${name} for User: ${userId}`);
    res.status(200).json({ success: true, message: "Contact saved successfully!", data: newContact });
  } catch (err) {
    console.error("Save Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET CONTACTS
app.get('/api/protectors/:userId', async (req, res) => {
  try {
    const contacts = await Protector.find({ userId: req.params.userId });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE CONTACT
app.delete('/api/protectors/:id', async (req, res) => {
  try {
    const result = await Protector.findByIdAndDelete(req.params.id);
    if (result) {
      console.log(`🗑️ Contact Deleted: ${req.params.id}`);
      res.status(200).json({ success: true, message: "Contact deleted successfully!" });
    } else {
      res.status(404).json({ success: false, message: "Contact not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ANALYTICS & HISTORY SECTION ---

app.post("/api/history", async (req, res) => {
  try {
    const data = req.body;
    // Logic for intensity
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
    res.status(200).json({ intensity, isAbnormal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/:userId', async (req, res) => {
    try {
        const logs = await History.find({ userId: req.params.userId }).sort({ timestamp: -1 }).limit(50);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. START
const port = process.env.PORT || 10000;
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});