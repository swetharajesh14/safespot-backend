import mongoose from "mongoose";

const journeyPointSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },

    // Timestamp of point
    ts: { type: Date, required: true, index: true },

    // GeoJSON point: [lng, lat]
    loc: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },

    // Optional metadata
    speed: { type: Number, default: 0 }, // m/s
    accuracy: { type: Number, default: 0 }, // meters
  },
  { timestamps: true }
);

// Geo index for map queries later
journeyPointSchema.index({ loc: "2dsphere" });

// ✅ TTL: delete documents 30 days after ts
// 30 days = 60 * 60 * 24 * 30 seconds
journeyPointSchema.index({ ts: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.model("JourneyPoint", journeyPointSchema);
