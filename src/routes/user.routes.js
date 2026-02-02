import express from "express";
import User from "../models/User.js";

const router = express.Router();

/**
 * GET user profile
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("❌ Fetch user error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * UPDATE / CREATE user profile
 */
router.put("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { $set: req.body },
      { new: true, upsert: true }
    );

    res.json(updatedUser);
  } catch (err) {
    console.error("❌ Save user error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
