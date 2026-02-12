import express from "express";
import Protector from "../models/Protector.js"; // change path if your model is inside index.js
import fetch from "node-fetch"; // only if using node<18, otherwise remove

const router = express.Router();

/**
 * POST /api/sos/trigger
 * body: { userId, lat, lng, intensity }
 */
router.post("/trigger", async (req, res) => {
  try {
    const { userId, lat, lng, intensity } = req.body;

    if (!userId || lat == null || lng == null) {
      return res.status(400).json({ ok: false, message: "Missing userId/lat/lng" });
    }

    // ✅ fetch protectors
    const protectors = await Protector.find({ userId }).lean();
    if (!protectors.length) {
      return res.status(404).json({ ok: false, message: "No protectors found" });
    }

    // ✅ WhatsApp message text
    const msg =
      `🚨 SOS ALERT 🚨\n` +
      `User: ${userId}\n` +
      `Intensity: ${intensity || "Unknown"}\n` +
      `Location: https://maps.google.com/?q=${lat},${lng}`;

    /**
     * ✅ OPTION: WhatsApp Business Cloud API
     * You must set these in Render Environment variables:
     * WHATSAPP_TOKEN
     * WHATSAPP_PHONE_NUMBER_ID
     */
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      return res.status(200).json({
        ok: true,
        warning: "WhatsApp env vars missing, route works but no message sent",
        msgPreview: msg,
        callNumber: protectors[0].phone,
        sentTo: protectors.length,
      });
    }

    // ✅ send WhatsApp to ALL protectors
    const results = [];
    for (const p of protectors) {
      if (!p.phone) continue;

      const waPhone = String(p.phone).replace(/\D/g, ""); // keep digits only (91xxxx)

      const r = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: waPhone,
          type: "text",
          text: { body: msg },
        }),
      });

      const j = await r.json();
      results.push({ to: waPhone, ok: r.ok, response: j });
    }

    return res.json({
      ok: true,
      sentTo: results.filter((x) => x.ok).length,
      callNumber: protectors[0].phone, // app will auto-call this
      results,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

export default router;