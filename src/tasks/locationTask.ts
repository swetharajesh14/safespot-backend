import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { Linking, Alert } from "react-native";

const LOCATION_TASK_NAME = "background-location-task";

/* ================================
   🔗 LIVE TRACK LINK (change if needed)
================================ */
const LIVE_LINK =
  "https://safespot-backend-vx2w.onrender.com/live/page/Swetha_01";

/* ================================
   🚨 Prevent spam alerts
================================ */
let abnormalSharedOnce = false;

/* ================================
   📲 WhatsApp Share Function
================================ */
async function shareOnWhatsAppAbnormal() {
  const text = `⚠️ SafeSpot Alert!

Abnormal movement detected.

Track me live:
${LIVE_LINK}`;

  const appUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
  const webUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  try {
    const can = await Linking.canOpenURL(appUrl);
    await Linking.openURL(can ? appUrl : webUrl);
  } catch {
    Alert.alert("WhatsApp not available");
  }
}

/* ================================
   🧠 Background Location Task
================================ */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.log("❌ Background location error:", error);
    return;
  }

  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  const coords = locations[0].coords;

  const latitude = coords.latitude;
  const longitude = coords.longitude;
  const speed = coords.speed ?? 0;
  const accuracy = coords.accuracy ?? 0;

  try {
    /* ================================
       1️⃣ SEND JOURNEY POINT
    ================================= */
    await fetch(
      "https://safespot-backend-vx2w.onrender.com/api/journey/point",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "Swetha_01",
          ts: new Date().toISOString(),
          lat: latitude,
          lng: longitude,
          speed,
          accuracy,
        }),
      }
    );

    /* ================================
       2️⃣ SAVE HISTORY (for analytics)
    ================================= */
    await fetch(
      "https://safespot-backend-vx2w.onrender.com/api/history",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "Swetha_01",
          latitude,
          longitude,
          speed,
        }),
      }
    );

    console.log("📍 Location sent:", latitude, longitude);

    /* ================================
       3️⃣ CHECK ABNORMAL STATUS
    ================================= */
    const res2 = await fetch(
      "https://safespot-backend-vx2w.onrender.com/api/history/Swetha_01/abnormal/today"
    );

    const json = await res2.json();

    const isAbnormalNow =
      Array.isArray(json?.logs) && json.logs.length > 0;

    /* ================================
       4️⃣ AUTO WHATSAPP ALERT
    ================================= */
    if (isAbnormalNow && !abnormalSharedOnce) {
      abnormalSharedOnce = true;
      await shareOnWhatsAppAbnormal();
    }

    /* Reset if normal again */
    if (!isAbnormalNow) {
      abnormalSharedOnce = false;
    }
  } catch (err) {
    console.log("❌ Failed to send location:", err);
  }
});

/* ================================
   🚀 START TRACKING FUNCTION
================================ */
export async function startJourneyTracking() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission denied");

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted")
    throw new Error("Background permission denied");

  const isRunning = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  );

  if (!isRunning) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000,
      distanceInterval: 10,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "SafeSpot Tracking Active",
        notificationBody: "Your safety monitoring is running",
      },
    });
  }
}