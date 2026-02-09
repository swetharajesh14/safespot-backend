import express from "express";
import JourneyPoint from "../models/JourneyPoint.js";

const router = express.Router();

/** ✅ Ping (confirm route is mounted) */
router.get("/ping", (req, res) => {
  res.json({ ok: true, message: "journey routes working ✅" });
});
router.get("/routes-check", (req, res) => {
  res.json({ ok: true, hasPointPost: true });
});
/** ✅ IST dateKey helper (YYYY-MM-DD) */
const getTodayDateKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const d = parts.find(p => p.type === "day").value;
  return `${y}-${m}-${d}`; // YYYY-MM-DD
};
/** ✅ Haversine distance (meters) */
const toRad = (v) => (v * Math.PI) / 180; 
const haversineMeters = (a, b) => {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
};

/** ✅ Format time for timeline */
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * ✅ 1) SAVE POINT
 * POST /api/journey/point
 * Body: { userId, dateKey?, ts, lat, lng, speed?, accuracy? }
 */
router.post("/point", async (req, res) => {
  try {
    const { userId, dateKey, ts, lat, lng, speed, accuracy } = req.body;

    if (!userId || !ts || lat === undefined || lng === undefined) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields: userId, ts, lat, lng",
      });
    }

    const finalDateKey = dateKey || getTodayDateKey();

    const doc = await JourneyPoint.create({
      userId,
      dateKey: finalDateKey,
      ts: new Date(ts),
      loc: {
        type: "Point",
        coordinates: [Number(lng), Number(lat)], // [lng, lat]
      },
      speed: Number(speed ?? 0),
      accuracy: Number(accuracy ?? 0),
    });

    return res.json({ ok: true, message: "Point saved ✅", id: doc._id });
  } catch (err) {
    console.log("POST /api/journey/point error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * ✅ 2) DEBUG: GET today raw points
 * GET /api/journey/points/:userId/today
 */
router.get("/points/:userId/today", async (req, res) => {
  try {
    const { userId } = req.params;
    const dateKey = getTodayDateKey();

    const points = await JourneyPoint.find({ userId, dateKey })
      .sort({ ts: 1 })
      .limit(2000);

    res.json({
      ok: true,
      userId,
      dateKey,
      count: points.length,
      points,
    });
  } catch (err) {
    console.log("GET /api/journey/points/:userId/today error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * ✅ 3) DEBUG: GET latest points (any date) - optional helper
 * GET /api/journey/points/:userId
 */
router.get("/points/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const points = await JourneyPoint.find({ userId })
      .sort({ ts: -1 })
      .limit(200);

    res.json({
      ok: true,
      userId,
      count: points.length,
      points,
    });
  } catch (err) {
    console.log("GET /api/journey/points/:userId error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * ✅ 4) REAL TODAY SUMMARY (used by Journey UI)
 * GET /api/journey/:userId/today
 */
router.get("/:userId/today", async (req, res) => {
  try {
    const { userId } = req.params;
    const dateKey = getTodayDateKey();

    const points = await JourneyPoint.find({ userId, dateKey })
      .sort({ ts: 1 })
      .limit(5000);

    if (!points.length) {
      return res.json({
        userId,
        date: dateKey,
        summary: {
          activeTime: "0m",
          distance: "0.0 km",
          sessions: "0",
          zones: "Private",
        },
        events: [],
      });
    }

    // ---- Compute summary ----
    let distanceM = 0;
    let activeMs = 0;

    const moveThresholdM = 10; // ignore GPS noise under 10m
    const sessionGapMs = 10 * 60 * 1000; // 10 min gap => new session

    let sessions = 1;
    let lastTs = points[0].ts;

    const events = [];

    events.push({
      time: fmtTime(points[0].ts),
      title: "Started tracking",
      subtitle: "Tracking began",
      type: "start",
    });

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];

      const prevCoord = {
        lat: prev.loc.coordinates[1],
        lng: prev.loc.coordinates[0],
      };
      const curCoord = {
        lat: cur.loc.coordinates[1],
        lng: cur.loc.coordinates[0],
      };

      const dM = haversineMeters(prevCoord, curCoord);
      const dt = new Date(cur.ts).getTime() - new Date(prev.ts).getTime();

      // new session if gap is large
      if (dt > sessionGapMs) {
        sessions += 1;
        events.push({
          time: fmtTime(cur.ts),
          title: "New session started",
          subtitle: "Long gap detected",
          type: "start",
        });
      }

      // count movement only if beyond noise
      if (dM >= moveThresholdM && dt > 0 && dt < 30 * 60 * 1000) {
        distanceM += dM;
        activeMs += dt;
      }

      lastTs = cur.ts;
    }

    events.push({
      time: fmtTime(lastTs),
      title: "Last updated",
      subtitle: "Most recent location point",
      type: "end",
    });

    // ---- Format outputs ----
    const km = distanceM / 1000;
    const mins = Math.round(activeMs / 60000);

    const activeTime =
      mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

    res.json({
      userId,
      date: dateKey,
      summary: {
        activeTime,
        distance: `${km.toFixed(2)} km`,
        sessions: String(sessions),
        zones: "Private",
      },
      events,
    });
  } catch (err) {
    console.log("GET /api/journey/:userId/today error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});
console.log("✅ journey.routes.js loaded at", new Date().toISOString());

export default router;