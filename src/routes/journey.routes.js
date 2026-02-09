import express from "express";
import JourneyPoint from "../models/JourneyPoint.js";

const router = express.Router();

/* =========================
   HELPERS
========================= */

/** IST dateKey (YYYY-MM-DD) */
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
  return `${y}-${m}-${d}`;
};

/** Haversine distance (meters) */
const toRad = v => (v * Math.PI) / 180;
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

/** Format time */
const fmtTime = d =>
  new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

/* =========================
   ROUTES
========================= */

/** Ping */
router.get("/ping", (_, res) => {
  res.json({ ok: true, message: "journey routes working ✅" });
});

/** 1️⃣ SAVE POINT */
router.post("/point", async (req, res) => {
  try {
    const { userId, dateKey, ts, lat, lng, speed, accuracy } = req.body;

    if (!userId || !ts || lat === undefined || lng === undefined) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields",
      });
    }

    const finalDateKey = dateKey || getTodayDateKey();

    const doc = await JourneyPoint.create({
      userId,
      dateKey: finalDateKey,
      ts: new Date(ts),
      loc: {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      },
      speed: Number(speed ?? 0),
      accuracy: Number(accuracy ?? 0),
    });

    res.json({ ok: true, message: "Point saved ✅", id: doc._id });
  } catch (err) {
    console.log("POST /point error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

/** 2️⃣ RAW POINTS (today) */
router.get("/points/:userId/today", async (req, res) => {
  try {
    const { userId } = req.params;
    const dateKey = getTodayDateKey();

    const points = await JourneyPoint.find({ userId, dateKey })
      .sort({ ts: 1 })
      .limit(3000);

    res.json({ ok: true, userId, dateKey, count: points.length, points });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

/** 3️⃣ TODAY STATUS */
router.get("/:userId/today/status", async (req, res) => {
  try {
    const { userId } = req.params;
    const dateKey = getTodayDateKey();

    const last = await JourneyPoint.findOne({ userId, dateKey }).sort({ ts: -1 });

    if (!last) {
      return res.json({ ok: true, status: "STOPPED", lastTs: null });
    }

    const diffMin = (Date.now() - new Date(last.ts).getTime()) / 60000;
    const speed = Number(last.speed ?? 0);

    let status = "IDLE";
    if (diffMin > 10) status = "STOPPED";
    else if (speed > 0.8) status = "MOVING";

    res.json({
      ok: true,
      status,
      lastTs: last.ts,
      lastLat: last.loc.coordinates[1],
      lastLng: last.loc.coordinates[0],
    });
  } catch (err) {
    console.log("STATUS error:", err);
    res.status(500).json({ ok: false });
  }
});

/** 4️⃣ TODAY SUMMARY + TIMELINE */
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

    let distanceM = 0;
    let activeMs = 0;
    let sessions = 1;

    const events = [];
    const sessionGapMs = 10 * 60 * 1000;
    const moveThresholdM = 10;

    events.push({
      time: fmtTime(points[0].ts),
      title: "Started tracking",
      subtitle: "Journey started",
      type: "start",
    });

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];

      const prevCoord = { lat: prev.loc.coordinates[1], lng: prev.loc.coordinates[0] };
      const curCoord = { lat: cur.loc.coordinates[1], lng: cur.loc.coordinates[0] };

      const dM = haversineMeters(prevCoord, curCoord);
      const dt = new Date(cur.ts) - new Date(prev.ts);

      if (dt > sessionGapMs) {
        sessions++;
        events.push({
          time: fmtTime(cur.ts),
          title: "New session",
          subtitle: "Long gap detected",
          type: "start",
        });
      }

      if (dM >= moveThresholdM && dt > 0) {
        distanceM += dM;
        activeMs += dt;
      }
    }

    events.push({
      time: fmtTime(points.at(-1).ts),
      title: "Last updated",
      subtitle: "Latest location point",
      type: "end",
    });

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
    console.log("SUMMARY error:", err);
    res.status(500).json({ ok: false });
  }
});

console.log("✅ journey.routes.js loaded");

export default router;