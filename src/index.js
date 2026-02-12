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
import journeyRoutes from "./routes/journey.routes.js"; // ✅ ADD
import historyRoutes from "./routes/history.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import sosRouter from "./routes/sos.js";


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use("/api/user", userRoutes);
app.use("/api/protectors", protectorsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/journey", journeyRoutes); // ✅ ADD

app.use("/api/history", historyRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/sos", sosRouter);


app.get("/", (req, res) => {
  res.send("SafeSpot backend is running ✅");
});

import http from "http";
import { Server } from "socket.io";

const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});