import mongoose from "mongoose";

const journeyEventSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },

    // "YYYY-MM-DD" (very useful for day queries)
    dateKey: { type: String, required: true, index: true },

    ts: { type: Date, required: true, index: true },

    type: {
      type: String,
      enum: ["start", "move", "idle", "flag", "end"],
      required: true,
      index: true,
    },

    title: { type: String, required: true },
    subtitle: { type: String, required: true },

    // optional event location
    loc: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },
  },
  { timestamps: true }
);

journeyEventSchema.index({ loc: "2dsphere" });

export default mongoose.model("JourneyEvent", journeyEventSchema);
