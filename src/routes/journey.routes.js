import express from "express";
import JourneyPoint from "../models/JourneyPoint.js";
import JourneyEvent from "../models/JourneyEvent.js";
import JourneyDay from "../models/JourneyDay.js";

const router = express.Router();

const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

/**
 * POST /api/journey/point
 * Body: { userId, dateKey, ts, lat, lng, speed, accuracy }
 */
router.post("/point", async (req, res) => {
  try {
    const { userId, dateKey, ts, lat, lng, speed = 0, accuracy = 0 } = req.body;

    if (!userId || !dateKey || !ts || typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "Missing/invalid fields" });
    }

    const pointTs = new Date(ts);

    // 1) Save raw point (TTL auto)
    await JourneyPoint.create({
      userId,
      dateKey,
      ts: pointTs,
      loc: { type: "Point", coordinates: [lng, lat] },
      speed,
      accuracy,
    });

    // 2) Ensure day summary exists
    const day = await JourneyDay.findOneAndUpdate(
      { userId, dateKey },
      { $setOnInsert: { userId, dateKey, zonesLabel: "Mostly Safe" } },
      { upsert: true, new: true }
    );

    // 3) Distance + active time update using last point
    const last = await JourneyPoint.findOne({ userId, dateKey }).sort({ ts: -1 }).lean();

    // NOTE: last includes the current point too because we just saved.
    // So find previous point:
    const prev = await JourneyPoint.findOne({ userId, dateKey, ts: { $lt: pointTs } })
      .sort({ ts: -1 })
      .lean();

    if (prev) {
      const [prevLng, prevLat] = prev.loc.coordinates;
      const dist = haversineMeters(prevLat, prevLng, lat, lng);

      // time delta in seconds
      const dt = Math.max(0, (pointTs.getTime() - new Date(prev.ts).getTime()) / 1000);

      // "active" if speed > 0.6 m/s OR moved more than 8m in that interval
      const isActive = speed > 0.6 || dist > 8;

      await JourneyDay.updateOne(
        { userId, dateKey },
        {
          $inc: {
            distanceMeters: dist,
            activeSeconds: isActive ? dt : 0,
          },
        }
      );
    } else {
      // first point of day -> START event once
      const existingStart = await JourneyEvent.findOne({ userId, dateKey, type: "start" }).lean();
      if (!existingStart) {
        await JourneyEvent.create({
          userId,
          dateKey,
          ts: pointTs,
          type: "start",
          title: "Day started",
          subtitle: "Background tracking started",
        });

        // sessions +1 when day starts
        await JourneyDay.updateOne({ userId, dateKey }, { $inc: { sessions: 1 } });
      }
    }

    // 4) Create periodic MOVE event (every ~20 mins) for timeline richness
    const twentyMinsAgo = new Date(pointTs.getTime() - 20 * 60 * 1000);
    const recentMove = await JourneyEvent.findOne({
      userId,
      dateKey,
      type: "move",
      ts: { $gte: twentyMinsAgo },
    }).lean();

    if (!recentMove && (speed > 0.6)) {
      await JourneyEvent.create({
        userId,
        dateKey,
        ts: pointTs,
        type: "move",
        title: "Moving",
        subtitle: `Speed ${speed.toFixed(1)} m/s`,
      });
    }

    return res.json({ message: "Point saved ✅" });
  } catch (err) {
    console.error("POST /journey/point error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/journey/:userId/day?date=YYYY-MM-DD
 * Returns { summary, events }
 */
router.get("/:userId/day", async (req, res) => {
  try {
    const { userId } = req.params;
    const dateKey = req.query.date;

    if (!dateKey) return res.status(400).json({ message: "date is required" });

    const day =
      (await JourneyDay.findOne({ userId, dateKey }).lean()) ??
      ({
        userId,
        dateKey,
        activeSeconds: 0,
        distanceMeters: 0,
        sessions: 0,
        flags: 0,
        zonesLabel: "No data yet",
      });

    const events = await JourneyEvent.find({ userId, dateKey }).sort({ ts: 1 }).lean();

    // format for your UI
    const summary = {
      activeTime: `${Math.floor(day.activeSeconds / 60)}m`,
      distance: `${(day.distanceMeters / 1000).toFixed(1)} km`,
      sessions: String(day.sessions),
      zones: day.zonesLabel,
    };

    const formattedEvents = events.map((e) => {
      const t = new Date(e.ts);
      const time = t.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      return { time, title: e.title, subtitle: e.subtitle, type: e.type };
    });

    return res.json({ summary, events: formattedEvents });
  } catch (err) {
    console.error("GET /journey/day error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
