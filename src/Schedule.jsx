// Schedule.jsx — multiple independent schedules
import React, { useContext } from "react";
import { ScheduleContext } from "./ScheduleContext";
import {
  SortableContext,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import SortableItem from "./SortableItem";

function generateSlots(containerId) {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const HH = h.toString().padStart(2, "0");
      const MM = m.toString().padStart(2, "0");

      out.push({
        id: `${containerId}-${HH}:${MM}`, // 🔥 containerId already starts with schedule-<panelId>
        label: `${HH}:${MM}`
      });
    }
  }
  return out;
}

export default function Schedule({ containerId, disabled }) {
  const { containerState } = useContext(ScheduleContext);

  const slots = generateSlots(containerId);    // 🔥 unique slot IDs per panel

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        margin: 10
      }}
    >
      {slots.map((slot) => (
        <Slot
          key={slot.id}
          slotId={slot.id}
          label={slot.label}
          disabled={disabled}
          instanceIds={containerState[slot.id] || []}
        />
      ))}
    </div>
  );
}

function Slot({ slotId, label, instanceIds, disabled }) {
  const { setNodeRef } = useDroppable({
    id: slotId,
    data: {
      type: "slot",
      containerId: slotId,
    },
    disabled
  });

  return (
    <div
      ref={setNodeRef}
      className="taskbox"
      data-role="taskbox"
       data-containerid={slotId}
      style={{
        background: "#2D333B",
        border: "1px solid #444",
        padding: 6,
        borderRadius: 6,
      }}
    >
      <div style={{ color: "#9AA0A6", fontSize: 12, marginBottom: 4 }}>
        {label}
      </div>

      <SortableContext
        id={slotId}
        items={instanceIds}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
        data={{
          role: "task-container",
          containerId: slotId
        }}
      >
        {instanceIds.map((id) => (
          <SortableItem key={id} instanceId={id} containerId={slotId} isDragPreview={true}/>
        ))}
      </SortableContext>
    </div>
  );
}
