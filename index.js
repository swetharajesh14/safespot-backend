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
// Using the long string to bypass local DNS/Whitelist flickering
const mongoURI = "mongodb://swetha:SafeSpot2026@cluster0-shard-00-00.ktyl7lp.mongodb.net:27017,cluster0-shard-00-01.ktyl7lp.mongodb.net:27017,cluster0-shard-00-02.ktyl7lp.mongodb.net:27017/safespot?ssl=true&replicaSet=atlas-ktyl7lp-shard-0&authSource=admin&retryWrites=true&w=majority";

const connectWithRetry = () => {
  mongoose.connect(mongoURI, { family: 4 }) // family: 4 forces IPv4
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

const History = mongoose.model("History", new mongoose.Schema({
  userId: String,
  latitude: Number,
  longitude: Number,
  speed: { type: Number, default: 0 },
  intensity: { type: String, default: 'Idle' },
  isAbnormal: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
}));

// 3. ROUTES

// --- ROOT ROUTE (Fixes "Cannot GET /") ---
app.get('/', (req, res) => {
  res.send('<h1>✅ SafeSpot Backend is Live!</h1><p>Database is connected and API is ready.</p>');
});

// --- PROTECTOR / CONTACT ROUTES ---

// GET: Fetch all contacts for a specific user
app.get('/api/protectors/:userId', async (req, res) => {
  try {
    const userContacts = await Protector.find({ userId: req.params.userId });
    res.json(userContacts);
  } catch (err) { 
    res.status(500).json({ error: "Failed to fetch contacts" }); 
  }
});

// POST: Add a new contact
app.post('/api/protectors', async (req, res) => {
  try {
    const { userId, name, phone, photo } = req.body;
    if (!userId || !name || !phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const newP = new Protector({ userId, name, phone, photo }); 
    await newP.save();
    res.status(200).json({ message: "Contact Saved Successfully", contact: newP });
  } catch (err) { 
    res.status(500).json({ error: "Failed to save contact" }); 
  }
});

// DELETE: Remove a contact by its ID
app.delete('/api/protectors/:id', async (req, res) => {
  try {
    const deleted = await Protector.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Contact not found" });
    res.status(200).json({ message: "Contact Deleted Successfully" });
  } catch (err) { 
    res.status(500).json({ error: "Failed to delete contact" }); 
  }
});

// --- HISTORY / ANALYTICS ROUTES ---
app.post("/api/history", async (req, res) => {
  try {
    const newHistory = new History(req.body);
    await newHistory.save();
    res.status(200).json({ message: "Activity Logged" });
  } catch (error) { 
    res.status(500).json({ error: "Ingestion Failed" }); 
  }
});

// 4. START SERVER
const port = process.env.PORT || 10000;
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});