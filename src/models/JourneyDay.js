import mongoose from "mongoose";

const journeyDaySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    dateKey: { type: String, required: true, index: true },

    activeSeconds: { type: Number, default: 0 },
    distanceMeters: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 },
    flags: { type: Number, default: 0 },
    zonesLabel: { type: String, default: "Mostly Safe" },
  },
  { timestamps: true }
);

journeyDaySchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export default mongoose.model("JourneyDay", journeyDaySchema);
