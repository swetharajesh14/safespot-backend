import mongoose from "mongoose";

const protectorSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    photo: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Protector", protectorSchema);
