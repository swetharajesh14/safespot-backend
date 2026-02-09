import express from "express";
import History from "../models/History.js";

const router = express.Router();

router.get("/ping", (req, res) =>
  res.json({ ok: true, message: "history route working ✅" })
);

router.post("/", async (req, res) => {
  try {
    const data = req.body;

    const motionMag = Math.sqrt(
      (data.accelX || 0) ** 2 +
      (data.accelY || 0) ** 2 +
      (data.accelZ || 0) ** 2
    );

    let intensity = "Idle";
    if (motionMag > 1.2) intensity = "Light";
    if (motionMag > 2.5) intensity = "Moderate";
    if (motionMag > 4.0) intensity = "High-intensity";

    const isAbnormal = motionMag > 4.5;

    const log = new History({ ...data, intensity, isAbnormal });
    await log.save();

    res.status(200).json({ success: true, intensity, isAbnormal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;