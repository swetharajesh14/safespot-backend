import express from "express";
import History from "../models/History.js";

const router = express.Router();

/** ✅ Ping */
router.get("/ping", (req, res) =>
  res.json({ ok: true, message: "history route working ✅" })
);

/** ✅ IST Helpers */
const IST_TZ = "Asia/Kolkata";

const getISTDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;

  return `${y}-${m}-${d}`; // YYYY-MM-DD
};

/**
 * ✅ UTC range for IST dateKey:
 * start = YYYY-MM-DD 00:00 IST
 * end   = next day 00:00 IST
 */
const rangeForISTDateKey = (dateKey) => {
  const start = new Date(`${dateKey}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

const getWeekDateKeysEndingToday = () => {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(getISTDateKey(d));
  }
  return out;
};

const getMonthDateKeys = (year, month1to12) => {
  const mm = String(month1to12).padStart(2, "0");
  const first = new Date(`${year}-${mm}-01T00:00:00+05:30`);

  const keys = [];
  const cur = new Date(first);

  while (true) {
    const k = getISTDateKey(cur);
    const [y, m] = k.split("-").map(Number);
    if (y !== Number(year) || m !== Number(month1to12)) break;
    keys.push(k);
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
};

/** ✅ Metrics */
const computeMetricsFromLogs = (logs) => {
  const total = logs.length;

  if (!total) {
    return {
      activeMins: 0,
      avgSpeed: 0,
      stability: 100,
      intensity: "Idle",
      abnormalCount: 0,
      total: 0,
    };
  }

  const abnormalCount = logs.filter((l) => l.isAbnormal).length;
  const stability = Math.max(0, Math.round(100 - (abnormalCount / total) * 100));

  const avgSpeed = logs.reduce((s, l) => s + Number(l.speed ?? 0), 0) / total;

  // Intensity mode (most frequent)
  const freq = {};
  for (const l of logs) {
    const key = l.intensity || "Idle";
    freq[key] = (freq[key] || 0) + 1;
  }
  const intensity =
    Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || "Idle";

  // Active logs
  const activeLogs = logs.filter(
    (l) => (l.intensity && l.intensity !== "Idle") || Number(l.speed ?? 0) > 0.2
  );

  let activeMins = 0;
  if (activeLogs.length >= 2) {
    const first = new Date(activeLogs[0].timestamp).getTime();
    const last = new Date(activeLogs[activeLogs.length - 1].timestamp).getTime();
    activeMins = Math.round(Math.max(0, last - first) / 60000);
  } else if (activeLogs.length === 1) {
    activeMins = 1;
  }

  return { activeMins, avgSpeed, stability, intensity, abnormalCount, total };
};

const fmtActive = (mins) =>
  mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} mins`;
const fmtSpeed = (v) => `${Number(v || 0).toFixed(1)} m/s`;

/**
 * ✅ POST /api/history
 */
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

    res.status(200).json({ ok: true, intensity, isAbnormal });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

/**
 * ✅ GET latest logs
 */
router.get("/:userId/latest", async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(Number(req.query.limit || 50), 200);

    const logs = await History.find({ userId }).sort({ timestamp: -1 }).limit(limit);

    res.json({ ok: true, userId, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

/**
 * ✅ SUMMARY: DAY
 * GET /api/history/:userId/summary/day?date=YYYY-MM-DD
 */
router.get("/:userId/summary/day", async (req, res) => {
  try {
    const { userId } = req.params;
    const dateKey = String(req.query.date || getISTDateKey(new Date()));
    const { start, end } = rangeForISTDateKey(dateKey);

    const logs = await History.find({
      userId,
      timestamp: { $gte: start, $lt: end },
    }).sort({ timestamp: 1 });

    const m = computeMetricsFromLogs(logs);

    res.json({
      ok: true,
      range: "day",
      dateKey,
      cards: {
        activeTime: fmtActive(m.activeMins),
        avgSpeed: fmtSpeed(m.avgSpeed),
        stability: `${m.stability}%`,
        intensity: m.intensity,
      },
      series: [
        {
          label: dateKey,
          activeMins: m.activeMins,
          avgSpeed: Number(m.avgSpeed.toFixed(2)),
          stability: m.stability,
          totalLogs: m.total,
          abnormalLogs: m.abnormalCount,
        },
      ],
    });
  } catch (err) {
    console.log("DAY summary error:", err);
    res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

/**
 * ✅ SUMMARY: WEEK (last 7 days)
 * GET /api/history/:userId/summary/week
 */
router.get("/:userId/summary/week", async (req, res) => {
  try {
    const { userId } = req.params;
    const keys = getWeekDateKeysEndingToday();

    // ✅ correct: range from first day start -> last day end
    const firstRange = rangeForISTDateKey(keys[0]);
    const lastRange = rangeForISTDateKey(keys[keys.length - 1]);

    const logs = await History.find({
      userId,
      timestamp: { $gte: firstRange.start, $lt: lastRange.end },
    }).sort({ timestamp: 1 });

    // group by dateKey, ensure all 7 exist
    const map = Object.fromEntries(keys.map((k) => [k, []]));

    for (const l of logs) {
      const k = getISTDateKey(new Date(l.timestamp));
      if (!map[k]) map[k] = [];
      map[k].push(l);
    }

    const series = keys.map((k) => {
      const m = computeMetricsFromLogs(map[k] || []);
      return {
        label: k,
        activeMins: m.activeMins,
        avgSpeed: Number(m.avgSpeed.toFixed(2)),
        stability: m.stability,
        totalLogs: m.total,
        abnormalLogs: m.abnormalCount,
      };
    });

    // ✅ cards based on totals (not avg) - looks better
    const totalActive = series.reduce((s, x) => s + x.activeMins, 0);
    const avgSpeed =
      series.reduce((s, x) => s + x.avgSpeed, 0) / (series.length || 1);
    const avgStability =
      series.reduce((s, x) => s + x.stability, 0) / (series.length || 1);

    res.json({
      ok: true,
      range: "week",
      dateKeys: keys,
      cards: {
        activeTime: fmtActive(totalActive),
        avgSpeed: fmtSpeed(avgSpeed),
        stability: `${Math.round(avgStability)}%`,
        intensity: "Week",
      },
      series,
    });
  } catch (err) {
    console.log("WEEK summary error:", err);
    res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

/**
 * ✅ SUMMARY: MONTH
 * GET /api/history/:userId/summary/month?year=2026&month=2
 */
router.get("/:userId/summary/month", async (req, res) => {
  try {
    const { userId } = req.params;

    const todayKey = getISTDateKey(new Date());
    const [cy, cm] = todayKey.split("-").map(Number);

    const year = Number(req.query.year || cy);
    const month = Number(req.query.month || cm);

    const keys = getMonthDateKeys(year, month);

    const firstRange = rangeForISTDateKey(keys[0]);
    const lastRange = rangeForISTDateKey(keys[keys.length - 1]);

    const logs = await History.find({
      userId,
      timestamp: { $gte: firstRange.start, $lt: lastRange.end },
    }).sort({ timestamp: 1 });

    const map = Object.fromEntries(keys.map((k) => [k, []]));

    for (const l of logs) {
      const k = getISTDateKey(new Date(l.timestamp));
      if (!map[k]) map[k] = [];
      map[k].push(l);
    }

    const series = keys.map((k) => {
      const m = computeMetricsFromLogs(map[k] || []);
      return {
        label: k,
        activeMins: m.activeMins,
        avgSpeed: Number(m.avgSpeed.toFixed(2)),
        stability: m.stability,
        totalLogs: m.total,
        abnormalLogs: m.abnormalCount,
      };
    });

    const totalActive = series.reduce((s, x) => s + x.activeMins, 0);
    const avgSpeed =
      series.reduce((s, x) => s + x.avgSpeed, 0) / (series.length || 1);
    const avgStability =
      series.reduce((s, x) => s + x.stability, 0) / (series.length || 1);

    res.json({
      ok: true,
      range: "month",
      year,
      month,
      dateKeys: keys,
      cards: {
        activeTime: fmtActive(totalActive),
        avgSpeed: fmtSpeed(avgSpeed),
        stability: `${Math.round(avgStability)}%`,
        intensity: "Month",
      },
      series,
    });
  } catch (err) {
    console.log("MONTH summary error:", err);
    res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

export default router;