/*import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

import userRoutes from "./routes/user.routes.js";
import protectorsRoutes from "./routes/protectors.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

dotenv.config();

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// db
connectDB();

// routes
app.use("/api/user", userRoutes);
app.use("/api/protectors", protectorsRoutes);
app.use("/api/upload", uploadRoutes);

// health check
app.get("/", (req, res) => {
  res.send("SafeSpot backend is running ✅");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
}); */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

import userRoutes from "./routes/user.routes.js";
import protectorsRoutes from "./routes/protectors.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
// import journeyRoutes from "./routes/journey.routes.js"; // <-- enable later when you create it
import journeyRoutes from "./routes/journey.routes.js";


dotenv.config();

const app = express();

// ✅ Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api/journey", journeyRoutes);
// ✅ DB connect
connectDB();

// ✅ Routes
app.get("/", (req, res) => {
  res.send("SafeSpot backend is running ✅");
});

app.use("/api/user", userRoutes);
app.use("/api/protectors", protectorsRoutes);
app.use("/api/upload", uploadRoutes);
// app.use("/api/journey", journeyRoutes); // <-- enable later

// ✅ 404 Handler (helps you debug wrong URLs)
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
});

// ✅ Error Handler (prevents server crash + shows real error)
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

