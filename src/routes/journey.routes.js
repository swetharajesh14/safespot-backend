import express from "express";
import JourneyPoint from "../models/JourneyPoint.js";

const router = express.Router();

// ✅ simple ping (to confirm route mounted)
router.get("/ping", (req, res) => {
  res.json({ ok: true, message: "journey routes working ✅" });
});

// ✅ helper: today's dateKey in YYYY-MM-DD (server local)
const getTodayDateKey = () => new Date().toISOString().slice(0, 10);

// ✅ 1) SAVE POINT (this is what your background task calls)
router.post("/point", async (req, res) => {
  try {
    const { userId, dateKey, ts, lat, lng, speed, accuracy } = req.body;

    if (!userId || !dateKey || !ts || lat === undefined || lng === undefined) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields: userId, dateKey, ts, lat, lng",
      });
    }

    const doc = await JourneyPoint.create({
      userId,
      dateKey,
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
    console.log("POST /journey/point error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ✅ 2) DEBUG: get raw points saved today (so we confirm DB writes)
router.get("/points/:userId/today", async (req, res) => {
  try {
    const { userId } = req.params;
    const dateKey = getTodayDateKey();

    const points = await JourneyPoint.find({ userId, dateKey })
      .sort({ ts: 1 })
      .limit(500);

    res.json({
      ok: true,
      userId,
      dateKey,
      count: points.length,
      points,
    });
  } catch (err) {
    console.log("GET /journey/points/:userId/today error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ✅ 3) REAL TODAY SUMMARY (your Journey UI calls this)
router.get("/:userId/today", async (req, res) => {
  try {
    const { userId } = req.params;
    const dateKey = getTodayDateKey();

    const points = await JourneyPoint.find({ userId, dateKey })
      .sort({ ts: 1 })
      .limit(2000);

    if (!points.length) {
      return res.json({
        userId,
        date: dateKey,
        summary: {
          activeTime: "0m",
          distance: "0.0 km",
          sessions: "0",
          zones: "No data yet",
        },
        events: [],
      });
    }

    // ---- compute distance + active time from points ----
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

    let distanceM = 0;
    let activeMs = 0;

    const moveThresholdM = 10; // ignore GPS noise
    const idleGapMs = 2 * 60 * 1000; // 2 minutes gap => treat as new session

    let sessions = 1;
    let lastMoveTs = points[0].ts;
    let lastTs = points[0].ts;

    const events = [];

    // format time
    const fmtTime = (d) =>
      new Date(d).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });

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

      // session detection
      if (dt > idleGapMs) {
        sessions += 1;
        events.push({
          time: fmtTime(cur.ts),
          title: "New session started",
          subtitle: "Long gap detected",
          type: "start",
        });
      }

      // movement detection
      if (dM >= moveThresholdM) {
        distanceM += dM;
        activeMs += dt;
        lastMoveTs = cur.ts;
      }

      lastTs = cur.ts;
    }

    // add end event
    events.push({
      time: fmtTime(lastTs),
      title: "Last updated",
      subtitle: "Most recent location point",
      type: "end",
    });

    // convert formats
    const km = distanceM / 1000;
    const mins = Math.round(activeMs / 60000);

    const activeTime =
      mins >= 60
        ? `${Math.floor(mins / 60)}h ${mins % 60}m`
        : `${mins}m`;

    const summary = {
      activeTime,
      distance: `${km.toFixed(2)} km`,
      sessions: String(sessions),
      zones: "Private", // you selected private mode
    };

    res.json({
      userId,
      date: dateKey,
      summary,
      events,
    });
  } catch (err) {
    console.log("GET /journey/:userId/today error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

export default router;