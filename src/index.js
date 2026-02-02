import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

import userRoutes from "./routes/user.routes.js";
import protectorsRoutes from "./routes/protectors.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Only ONE place connects to MongoDB
connectDB();

app.use("/api/user", userRoutes);
app.use("/api/protectors", protectorsRoutes);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
