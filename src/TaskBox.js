// TaskBox.jsx — INSTANCE-ONLY PANEL STORAGE

import React, { useContext } from "react";
import { ScheduleContext } from "./ScheduleContext";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import SortableItem from "./SortableItem";

export default function TaskBox({ panelId, instanceIds = [] }) {
  const {
    tasks,
    setTasks,          // <— MUST BE HERE
    instanceStoreRef,
    panels,
    setPanels
  } = useContext(ScheduleContext);

  const instanceStore = instanceStoreRef.current;

  // --------------------------------------------------------------------
  // 🟩 FULL LIST DROPPABLE OVERLAY
  // --------------------------------------------------------------------
  const { setNodeRef: setListZoneRef, isOver: listIsOver } = useDroppable({
    id: `dropzone-list-${panelId}`,
    data: {
      role: "taskbox",
      panelId,
    },
  });

  // --------------------------------------------------------------------
  // 🟩 EMPTY PANEL DROP ZONE
  // --------------------------------------------------------------------
  const { setNodeRef: setEmptyZoneRef, isOver: emptyIsOver } = useDroppable({
    id: `dropzone-empty-${panelId}`,
    disabled: instanceIds.length > 0,
    data: {
      role: "taskbox-empty",
      panelId,
    },
  });

  // --------------------------------------------------------------------
  // 🟩 BOTTOM DROP ZONE (append)
  // --------------------------------------------------------------------
  const { setNodeRef: setBottomZoneRef } = useDroppable({
    id: `dropzone-bottom-${panelId}`,
    data: {
      role: "taskbox-bottom",
      panelId,
    },
  });

  // --------------------------------------------------------------------
  // 🟩 "Add Task" — creates *single-mode* NEW TASK + instance
  // --------------------------------------------------------------------
  const handleAddTask = () => {
    const taskId = crypto.randomUUID();
    const instanceId = crypto.randomUUID();

    // Register instance in global store
    instanceStore[instanceId] = { taskId };

    // Create full task definition
    const newTask = {
      taskId,
      label: `Task ${instanceIds.length + 1}`,
      duplicateMode: "single",
    };

    // Add task to GLOBAL tasks list
    setTasks(prev => [...prev, newTask]);

    // Append instance to this TaskBox panel
    setPanels(prev =>
      prev.map(p =>
        p.id === panelId
          ? {
            ...p,
            props: {
              ...p.props,
              instanceIds: [...p.props.instanceIds, instanceId],
            },
          }
          : p
      )
    );
  };

  // --------------------------------------------------------------------
  // 🟩 Sortable list uses INSTANCE IDs only
  // --------------------------------------------------------------------
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Add Task button */}
      <button
        onClick={handleAddTask}
        style={{
          padding: "6px 10px",
          marginBottom: 8,
          background: "#3A4",
          borderRadius: 6,
          color: "white",
          border: "none",
        }}
      >
        + Add Task
      </button>

      {/* Scrollable list container */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 6,
          overflowX: "hidden",
          position: "relative",
        }}
      >
        {/* Invisible droppable overlay */}
        <div
          ref={setListZoneRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: -1,
            pointerEvents: "none",
          }}
        />

        {/* Empty state */}
        {instanceIds.length === 0 && (
          <div
            ref={setEmptyZoneRef}
            style={{
              height: 80,
              borderRadius: 6,
              border: "2px dashed rgba(255,255,255,0.2)",
              background: emptyIsOver
                ? "rgba(80,200,80,0.20)"
                : "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#aaa",
              fontSize: 12,
            }}
          >
            Drop task here
          </div>
        )}

        {/* Sortable instance list (vertical) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SortableContext
            items={instanceIds}
            strategy={verticalListSortingStrategy}
          >
            {instanceIds.map((instanceId) => {
              const inst = instanceStore[instanceId];
              if (!inst) return null;

              const task = tasks.find((t) => t.taskId === inst.taskId);
              if (!task) return null;

              return (
                <SortableItem
                  key={instanceId}
                  id={instanceId}
                  type="taskbox-item"
                  instanceId={instanceId}
                  taskId={inst.taskId}
                  label={task.label}
                  panelId={panelId}       // <—— FIXED
                />
              );
            })}
          </SortableContext>
        </div>

        {/* Bottom drop zone */}
        <div
          ref={setBottomZoneRef}
          style={{
            height: 40,
            marginTop: 4,
            borderRadius: 6,
          }}
        />
      </div>
    </div>
  );
}
