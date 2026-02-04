import express from "express";
const router = express.Router();

// ✅ simple ping (to confirm route mounted)
router.get("/ping", (req, res) => {
  res.json({ ok: true, message: "journey routes working ✅" });
});

// ✅ the route your frontend is calling
router.get("/:userId/today", async (req, res) => {
  const { userId } = req.params;

  res.json({
    userId,
    date: new Date().toISOString().slice(0, 10),
    summary: {
      activeTime: "0m",
      distance: "0.0 km",
      sessions: "0",
      zones: "No data yet"
    },
    events: []
  });
});


export default router;
