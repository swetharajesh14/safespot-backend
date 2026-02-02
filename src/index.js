import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

await connectDB();

app.get("/", (req, res) => res.send("✅ SafeSpot backend running"));

app.use("/api/user", userRoutes);
app.use("/api/protectors", protectorsRoutes);
await mongoose.connect(process.env.MONGO_URI);


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
