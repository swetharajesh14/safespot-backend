import mongoose from "mongoose";

const journeyEventSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    dateKey: { type: String, required: true, index: true },
    ts: { type: Date, required: true, index: true },
    type: { type: String, enum: ["start", "move", "idle", "flag", "end"], required: true },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("JourneyEvent", journeyEventSchema);
