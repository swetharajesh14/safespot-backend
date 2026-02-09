import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },

    latitude: Number,
    longitude: Number,
    speed: { type: Number, default: 0 },

    accelX: { type: Number, default: 0 },
    accelY: { type: Number, default: 0 },
    accelZ: { type: Number, default: 0 },

    gyroX: { type: Number, default: 0 },
    gyroY: { type: Number, default: 0 },
    gyroZ: { type: Number, default: 0 },

    intensity: { type: String, default: "Idle" },
    isAbnormal: { type: Boolean, default: false },

    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("History", historySchema);