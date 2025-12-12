// models/Instance.js
import mongoose from "mongoose";

const InstanceSchema = new mongoose.Schema(
  {
    instanceId: { type: String, required: true },
    taskId: { type: String, required: true },
    gridId: { type: String, required: true },   // <-- REQUIRED
    label: { type: String, default: "Untitled" },
    children: { type: [String], default: [] },

    // 🔹 NEW: props object with parent + sortable flags
    props: {
      parent: { type: Boolean, default: false },
      sortable: { type: Boolean, default: false }
    },

    userId: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Instance", InstanceSchema);
