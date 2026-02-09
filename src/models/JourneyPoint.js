import mongoose from "mongoose";

const journeyPointSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    dateKey: { type: String, required: true, index: true },
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

journeyPointSchema.index({ loc: "2dsphere" });
journeyPointSchema.index({ ts: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.model("JourneyPoint", journeyPointSchema);