// TaskBox.jsx — now includes “Add Task” button + droppable fix

import React, { useContext } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";         // ✅ ADD THIS
import { ScheduleContext } from "./ScheduleContext";
import SortableItem from "./SortableItem";

export default function TaskBox({ panelId, containerId, disabled }) {
  const { containerState, setContainerState, instanceStoreRef } =
    useContext(ScheduleContext);

  const instanceIds = containerState[containerId] || [];

  // ----------------------------------------------------
  // MAKE TASKBOX DROPPABLE (fix for empty drop issue)
  // ----------------------------------------------------
  const { setNodeRef } = useDroppable({
    id: containerId,
    data: {
      role: "task-container",
      containerId
    },
    disabled
  });

  // ----------------------------------------------------
  // ADD NEW TASK TO THIS TASKBOX
  // ----------------------------------------------------
  const handleAddTask = () => {
    const taskId = crypto.randomUUID();
    const instId = crypto.randomUUID();

    // 1️⃣ store instance info
    instanceStoreRef.current[instId] = {
      taskId,
      instanceId: instId,
      label: `New Task`
    };

    // 2️⃣ append to this TaskBox container
    setContainerState(prev => ({
      ...prev,
      [containerId]: [...(prev[containerId] || []), instId]
    }));
  };

  return (
    <div
      ref={setNodeRef}                           // ✅ THIS MAKES IT DROPPABLE
      className="taskbox"
      data-role="taskbox"
      data-containerid={containerId}
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* SORTABLE ITEMS */}
      <SortableContext
        id={containerId}
        items={instanceIds}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
        data={{
          role: "task-container",
          containerId
        }}
      >
        {instanceIds.map(instId => {
          const inst = instanceStoreRef.current[instId];
          if (!inst) return null;

          return (
            <SortableItem
              key={instId}
              instanceId={instId}
              containerId={containerId}
            />
          );
        })}
      </SortableContext>

      {/* ADD TASK BUTTON */}
      <button
        onClick={handleAddTask}
        style={{
          marginTop: "auto",
          padding: "6px 10px",
          background: "#3A3F45",
          color: "white",
          border: "1px solid #555",
          borderRadius: 6,
          cursor: "pointer"
        }}
      >
        + Add Task
      </button>
    </div>
  );
}
