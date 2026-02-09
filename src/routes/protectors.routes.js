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

/**
 * DELETE protector by id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Protector.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Protector not found" });
    }

    res.json({ ok: true, message: "Protector removed successfully" });
  } catch (err) {
    console.error("❌ Delete protector error:", err);
    res.status(500).json({ message: "Failed to delete protector" });
  }
});

export default router;
