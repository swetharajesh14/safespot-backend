import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true }, // "Swetha_01"
    name: { type: String, default: "New User" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    avatar: { type: String, default: "https://i.pravatar.cc/150?img=12" },

    // Optional safety profile fields
    bloodGroup: { type: String, default: "" },
    medicalNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
