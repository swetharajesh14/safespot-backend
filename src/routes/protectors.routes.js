import express from "express";
import Protector from "../models/Protector.js";

const router = express.Router();

/**
 * GET protectors by userId
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const protectors = await Protector.find({ userId });
    res.json(protectors);
  } catch (err) {
    console.error("❌ Get protectors error:", err);
    res.status(500).json({ message: "Failed to fetch protectors" });
  }
});

/**
 * ADD protector
 */
router.post("/", async (req, res) => {
  try {
    const protector = await Protector.create(req.body);
    res.status(201).json(protector);
  } catch (err) {
    console.error("❌ Add protector error:", err);
    res.status(500).json({ message: "Failed to add protector" });
  }
});

export default router;
