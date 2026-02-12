import express from "express";
import History from "../models/History.js";

const router = express.Router();

/**
 * ✅ GET latest live location
 * /api/live/:userId
 * returns { ok, userId, lat, lng, ts }
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const last = await History.findOne(
      { userId, latitude: { $ne: null }, longitude: { $ne: null } },
      { latitude: 1, longitude: 1, timestamp: 1 }
    ).sort({ timestamp: -1 });

    if (!last) {
      return res.status(404).json({ ok: false, message: "No location yet" });
    }

    res.json({
      ok: true,
      userId,
      lat: Number(last.latitude),
      lng: Number(last.longitude),
      ts: last.timestamp,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

/**
 * ✅ LIVE MAP PAGE (no API key needed) using OpenStreetMap + Leaflet
 * /live/:userId
 */
router.get("/page/:userId", async (req, res) => {
  const { userId } = req.params;

  // IMPORTANT: Render URL (your backend)
  const BASE = "https://safespot-backend-vx2w.onrender.com";

  res.setHeader("Content-Type", "text/html");
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SafeSpot Live - ${userId}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body { height: 100%; margin: 0; }
    #map { height: 100%; width: 100%; }
    .badge {
      position: absolute; top: 12px; left: 12px; z-index: 9999;
      background: rgba(255,255,255,0.95); padding: 10px 12px;
      border-radius: 12px; font-family: system-ui, -apple-system, Segoe UI, Roboto;
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
    }
    .title { font-weight: 800; font-size: 14px; color: #7A294E; }
    .sub { margin-top: 4px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="badge">
    <div class="title">SafeSpot Live</div>
    <div class="sub">Tracking: ${userId}</div>
    <div class="sub" id="status">Connecting…</div>
  </div>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const API = "${BASE}/api/live/${userId}";
    const statusEl = document.getElementById("status");

    const map = L.map("map").setView([9.9252, 78.1198], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    let marker = null;
    let firstFit = true;

    async function tick() {
      try {
        const res = await fetch(API, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.message || "No data");

        const lat = Number(json.lat), lng = Number(json.lng);
        const ts = json.ts ? new Date(json.ts).toLocaleString("en-IN") : "";

        statusEl.textContent = "Last update: " + ts;

        if (!marker) {
          marker = L.marker([lat, lng]).addTo(map).bindPopup("${userId}");
        } else {
          marker.setLatLng([lat, lng]);
        }

        if (firstFit) {
          map.setView([lat, lng], 16);
          firstFit = false;
        }
      } catch (e) {
        statusEl.textContent = "Waiting for location…";
      }
    }

    tick();
    setInterval(tick, 5000);
  </script>
</body>
</html>`);
});

export default router;