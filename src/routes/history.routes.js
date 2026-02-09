import express from "express";
import History from "../models/History.js";

const router = express.Router();

router.get("/ping", (req, res) =>
  res.json({ ok: true, message: "history route working ✅" })
);

const getTodayRangeIST = () => {
  const now = new Date();
  // IST day start/end in UTC by using locale string trick
  const istDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
  const startIST = new Date(`${istDateStr}T00:00:00+05:30`);
  const endIST = new Date(`${istDateStr}T23:59:59.999+05:30`);
  return { start: startIST, end: endIST };
};

// ✅ Save movement log (your existing)
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

    // ✅ Better abnormal: don’t flag just one spike
    const isAbnormal = motionMag > 4.5;

    const log = new History({ ...data, intensity, isAbnormal });
    await log.save();

    res.status(200).json({ ok: true, intensity, isAbnormal, motionMag });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ GET today logs
router.get("/:userId/today", async (req, res) => {
  try {
    const { userId } = req.params;
    const { start, end } = getTodayRangeIST();

    const logs = await History.find({
      userId,
      timestamp: { $gte: start, $lte: end },
    })
      .sort({ timestamp: -1 })
      .limit(2000);

    res.json({ ok: true, userId, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ GET today abnormal logs
router.get("/:userId/abnormal/today", async (req, res) => {
  try {
    const { userId } = req.params;
    const { start, end } = getTodayRangeIST();

    const logs = await History.find({
      userId,
      isAbnormal: true,
      timestamp: { $gte: start, $lte: end },
    })
      .sort({ timestamp: -1 })
      .limit(2000);

    res.json({ ok: true, userId, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ GET latest logs (history screen)
router.get("/:userId/latest", async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(Number(req.query.limit || 50), 200);

    const logs = await History.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({ ok: true, userId, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
router.get("/routes-check", (req,res)=> {
  res.json({ ok:true, latest:true, today:true, abnormal:true });
});
export default router;