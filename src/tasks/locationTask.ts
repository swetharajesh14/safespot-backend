import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";



const LOCATION_TASK_NAME = "background-location-task";

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
    await fetch("https://safespot-backend-vx2w.onrender.com/api/journey/point", {
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
    });

    console.log("📍 Location sent:", latitude, longitude);
  } catch (err) {
    console.log("❌ Failed to send location:", err);
  }
});