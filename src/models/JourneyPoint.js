import mongoose from "mongoose";

const journeyPointSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD

    // ❌ remove index:true here
    ts: { type: Date, required: true },

    loc: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },

    speed: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ✅ Geo queries
journeyPointSchema.index({ loc: "2dsphere" });

// ✅ TTL index (ONLY index on ts)
journeyPointSchema.index(
  { ts: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 } // 30 days
);

export default mongoose.model("JourneyPoint", journeyPointSchema);
