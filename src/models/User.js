import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    avatar: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
