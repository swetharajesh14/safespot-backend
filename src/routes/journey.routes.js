import express from "express";

const router = express.Router();

// ✅ Simple test route (so you stop seeing "Cannot GET")
router.get("/:userId/today", async (req, res) => {
  const { userId } = req.params;

  // For now demo JSON (Step-2 we’ll fetch from MongoDB)
  return res.json({
    userId,
    date: new Date().toISOString().slice(0, 10),
    summary: {
      activeTime: "0m",
      distance: "0.0 km",
      sessions: "0",
      zones: "No data yet",
    },
    events: [],
  });
});

export default router;
