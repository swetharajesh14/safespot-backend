import express from "express";
import User from "../models/User.js";

const router = express.Router();

// GET user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SAVE user (create or update)
router.put("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const updated = await User.findOneAndUpdate(
      { userId },
      { $set: { ...req.body, userId } }, // ensures userId stored
      { new: true, upsert: true }
    );

    res.json(updated);
  } catch (err) {
    console.error("❌ Save user error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
