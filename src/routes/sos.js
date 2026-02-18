import express from "express";
import Protector from "../models/Protector.js";
import { sendWhatsAppMessage } from "../services/whatsapp.js";
import { sendFast2SMS } from "../services/fast2sms.js";


const router = express.Router();

/**
 * POST /api/sos/trigger
 * body: { userId, lat, lng, intensity }
 */
router.post("/trigger", async (req, res) => {
  try {
    const { userId, lat, lng, intensity } = req.body;

    if (!userId || lat == null || lng == null) {
      return res
        .status(400)
        .json({ ok: false, message: "Missing userId/lat/lng" });
    }

    // ✅ fetch protectors
    const protectors = await Protector.find({ userId }).lean();
    if (!protectors.length) {
      return res.status(404).json({ ok: false, message: "No protectors found" });
    }

    const numbers = protectors
  .map((p) => p.phone)
  .filter(Boolean);

const msg =
  `🚨 SOS ALERT 🚨\n` +
  `User: ${userId}\n` +
  `Reason: ${intensity || "Unknown"}\n` +
  `Location: https://maps.google.com/?q=${lat},${lng}`;

const smsResult = await sendFast2SMS({ numbers, message: msg });

return res.json({
  ok: true,
  sentTo: numbers.length,
  callNumber: protectors[0].phone,
  smsResult,
});
    // ✅ env vars check
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

      const waPhone = String(p.phone).replace(/\D/g, ""); // digits only

      try {
        const result = await sendWhatsAppMessage(waPhone, msg);
        results.push({ to: waPhone, ok: true, response: result });
      } catch (err) {
        results.push({ to: waPhone, ok: false, error: err.message });
      }
    }

    // ✅ return AFTER loop
    return res.json({
      ok: true,
      sentTo: results.filter((x) => x.ok).length,
      callNumber: protectors[0].phone,
      results,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

export default router;