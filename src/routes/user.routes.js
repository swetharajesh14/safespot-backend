import express from "express";
import User from "../models/User.js";

const router = express.Router();

/**
 * GET /api/user/:userId
 * Returns profile. If not exists, auto-creates (so app always gets data).
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    let user = await User.findOne({ userId });
    if (!user) {
      user = await User.create({ userId, name: userId }); // minimal seed
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * PUT /api/user/:userId
 * Updates profile fields.
 */
router.put("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const updated = await User.findOneAndUpdate(
      { userId },
      { $set: req.body },
      { new: true, upsert: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
