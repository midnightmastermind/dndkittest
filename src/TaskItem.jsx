// TaskItem.jsx

import React, { forwardRef } from "react";

const TaskItem = forwardRef(function TaskItem(
  {
    instanceId,
    taskId,
    label,
    sortableAttributes = {},
    sortableListeners = {},
    sortableStyle = {},
  },
  ref
) {
  return (
    <div
      ref={ref}
      {...sortableAttributes}
      {...sortableListeners}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        background: "#2D333B",
        border: "1px solid #444",
        color: "white",
        cursor: "grab",
        display: "inline-flex",
        alignItems: "center",
        height: "20px",
        ...sortableStyle,
      }}
    >
      {label}
    </div>
  );
});

export default TaskItem;
