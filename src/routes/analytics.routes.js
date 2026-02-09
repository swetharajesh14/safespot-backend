import express from "express";
import History from "../models/History.js";

const router = express.Router();

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await History.find({
      userId,
      timestamp: { $gte: startOfDay },
    }).sort({ timestamp: -1 });

    const heatmap = Array(24).fill(0);
    logs.forEach((log) => {
      const hour = new Date(log.timestamp).getHours();
      if (log.intensity !== "Idle") heatmap[hour] += 1;
    });

    let stabilityScore = 100;
    if (logs.length > 0) {
      const recent = logs.slice(0, 10);
      const totalRot = recent.reduce(
        (s, l) =>
          s +
          Math.abs(l.gyroX || 0) +
          Math.abs(l.gyroY || 0),
        0
      );
      stabilityScore = Math.max(10, 100 - totalRot * 5);
    }

    res.json({
      heatmap,
      stabilityScore: Math.round(stabilityScore),
      currentIntensity: logs.length ? logs[0].intensity : "Idle",
      logsFound: logs.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;