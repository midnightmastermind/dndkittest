// TaskBox.jsx — CLEAN & FIXED (with LIST DROPPABLE wrapper)

import React, { useContext } from "react";
import {
  SortableContext,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

import { ScheduleContext } from "./ScheduleContext";
import SortableItem from "./SortableItem";

import { createInstance, updateContainer } from "./state/actions";
import { emit } from "./socket";

export default function TaskBox({ containerId, disabled }) {
  const { state, dispatch, instanceStoreRef, previewContainersRef } =
    useContext(ScheduleContext);

  const gridId = state.gridId;

  // -------------------------------
  // Choose preview vs real list
  // -------------------------------
  let instanceIds = state.containers[containerId] || [];

  if (previewContainersRef.current?.[containerId]) {
    instanceIds = previewContainersRef.current[containerId];
  }

  // Filter out missing instances
  const safeInstanceIds = instanceIds.filter(
    id => instanceStoreRef.current[id]
  );

  // -------------------------------
  // ⭐ TOP drop zone
  // -------------------------------
  const { setNodeRef: setTopDrop } = useDroppable({
    id: `${containerId}-top`,
    data: { role: "taskbox-top", containerId }
  });

  // -------------------------------
  // ⭐ LIST drop zone (CRITICAL FIX)
  // -------------------------------
  const { setNodeRef: setListDrop } = useDroppable({
    id: `${containerId}-list`,
    data: { role: "taskbox-list", containerId }
  });

  // -------------------------------
  // ⭐ BOTTOM drop zone
  // -------------------------------
  const { setNodeRef: setBottomDrop } = useDroppable({
    id: `${containerId}-bottom`,
    data: { role: "taskbox-bottom", containerId }
  });

  // -------------------------------
  // Add Task
  // -------------------------------
  const handleAddTask = () => {
    const instId = crypto.randomUUID();
    const inst = {
      instanceId: instId,
      taskId: instId,
      label: "New Task",
      children: [],
      gridId
    };

    dispatch(createInstance(inst));
    emit("create_instance", { gridId, instance: inst });

    const next = [...safeInstanceIds, instId];

    dispatch(updateContainer({ containerId, items: next }));
    emit("update_container", { gridId, containerId, items: next });
  };

  return (
    <div
      className="taskbox"
      data-containerid={containerId}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto"
      }}
    >
      {/* ⭐ THIN TOP DROPPABLE */}
      <div
        ref={setTopDrop}
        style={{
          height: 10,
          pointerEvents: "auto"
        }}
      />

      {/* ⭐ LIST DROPPABLE WRAPPER (prevents flicker!) */}
      <div
        ref={setListDrop}
        style={{
          width: "100%",
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          gap: "3px"
        }}
      >
        <SortableContext
          id={containerId}
          items={safeInstanceIds}
          strategy={verticalListSortingStrategy}
          disabled={disabled}
        >
          {safeInstanceIds.map(instId => {
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
      </div>

      {/* ⭐ REAL BOTTOM DROPPABLE */}
      <div
        ref={setBottomDrop}
        style={{
          flex: 1,
          pointerEvents: "auto"
        }}
      />

      <button
        onClick={handleAddTask}
        style={{
          padding: "6px 10px",
          background: "#3A3F45",
          color: "white",
          borderRadius: 6,
          cursor: "pointer",
          border: "1px solid #555",
          marginBottom: 10
        }}
      >
        + Add Task
      </button>
    </div>
  );
}
