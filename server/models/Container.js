import mongoose from "mongoose";

const ContainerSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },  // YOU supply this
    containerId: { type: String, required: true },
    gridId: { type: String, required: true },   // <-- REQUIRED
    items: { type: [String], default: [] },
    userId: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Container", ContainerSchema);
