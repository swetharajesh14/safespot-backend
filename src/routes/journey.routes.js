import express from "express";
import JourneyPoint from "../models/JourneyPoint.js";

const router = express.Router();

/** Helpers */
const toDateKey = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const fmtTime = (date) => {
  const d = new Date(date);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
};

const haversineMeters = (a, b) => {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(s1 + Math.cos(lat1) * Math.cos(lat2) * s2));
  return R * c;
};

const formatDuration = (mins) => {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/**
 * POST /api/journey/point
 * Body: { userId, dateKey, ts, lat, lng, speed, accuracy }
 */
router.post("/point", async (req, res) => {
  try {
    const { userId, dateKey, ts, lat, lng, speed, accuracy } = req.body || {};

    if (!userId || !dateKey || !ts || lat == null || lng == null) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const doc = await JourneyPoint.create({
      userId,
      dateKey,
      ts: new Date(ts),
      lat,
      lng,
      speed: speed ?? 0,
      accuracy: accuracy ?? 0,
    });

    return res.json({ ok: true, id: doc._id });
  } catch (e) {
    console.log("journey/point error:", e);
    return res.status(500).json({ message: "Failed to save point" });
  }
});

/**
 * GET /api/journey/:userId/today
 * Returns: { userId, date, summary, events }
 */
router.get("/:userId/today", async (req, res) => {
  try {
    const { userId } = req.params;
    const dateKey = toDateKey(new Date());

    const points = await JourneyPoint.find({ userId, dateKey })
      .sort({ ts: 1 })
      .limit(5000)
      .lean();

    if (!points.length) {
      return res.json({
        userId,
        date: dateKey,
        summary: { activeTime: "0m", distance: "0.0 km", sessions: "0", zones: "No data yet" },
        events: [],
      });
    }

    // distance
    let distM = 0;
    for (let i = 1; i < points.length; i++) {
      distM += haversineMeters(points[i - 1], points[i]);
    }

    // active time (simple): count minutes where speed >= 0.5 m/s OR moved > 15m between samples
    let activeMinutes = 0;
    for (let i = 1; i < points.length; i++) {
      const dtMin = (new Date(points[i].ts) - new Date(points[i - 1].ts)) / 60000;
      if (dtMin <= 0) continue;

      const moved = haversineMeters(points[i - 1], points[i]);
      const moving = (points[i].speed ?? 0) >= 0.5 || moved >= 15;
      if (moving) activeMinutes += Math.min(dtMin, 5); // cap spikes
    }

    // events (simple & clean)
    const first = points[0];
    const last = points[points.length - 1];

    const events = [];
    events.push({
      time: fmtTime(first.ts),
      title: "Started tracking",
      subtitle: `Accuracy ~${Math.round(first.accuracy ?? 0)}m`,
      type: "start",
    });

    // detect idle segments (no movement for >= 10 minutes)
    let idleStartIdx = null;
    for (let i = 1; i < points.length; i++) {
      const moved = haversineMeters(points[i - 1], points[i]);
      const dtMin = (new Date(points[i].ts) - new Date(points[i - 1].ts)) / 60000;

      const idle = moved < 8 && (points[i].speed ?? 0) < 0.3; // roughly stationary
      if (idle && idleStartIdx === null) idleStartIdx = i - 1;

      if ((!idle || i === points.length - 1) && idleStartIdx !== null) {
        const startTs = new Date(points[idleStartIdx].ts);
        const endTs = new Date(points[i].ts);
        const idleMins = (endTs - startTs) / 60000;

        if (idleMins >= 10) {
          events.push({
            time: fmtTime(startTs),
            title: "Long idle",
            subtitle: `Stationary • ${Math.round(idleMins)} mins`,
            type: "idle",
          });
        }
        idleStartIdx = null;
      }
    }

    events.push({
      time: fmtTime(last.ts),
      title: "Tracking updated",
      subtitle: "Latest location received",
      type: "end",
    });

    // zones (placeholder logic)
    const zones = distM > 2000 ? "Normal day" : "Low movement";

    return res.json({
      userId,
      date: dateKey,
      summary: {
        activeTime: formatDuration(activeMinutes),
        distance: `${(distM / 1000).toFixed(1)} km`,
        sessions: "1",
        zones,
      },
      events,
    });
  } catch (e) {
    console.log("journey/today error:", e);
    return res.status(500).json({ message: "Failed to load today journey" });
  }
});

export default router;
