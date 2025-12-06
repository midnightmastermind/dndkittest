// Schedule.jsx — updated for containerState
import React, { useContext } from "react";
import { ScheduleContext } from "./ScheduleContext";
import {
  SortableContext,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import SortableItem from "./SortableItem";

function generateSlots() {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      out.push({ id: `${hh}:${mm}`, label: `${hh}:${mm}` });
    }
  }
  return out;
}

const SLOT_DEFINITION = generateSlots();

export default function Schedule({ panel }) {
  const { containerState } = useContext(ScheduleContext);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 6
      }}
    >
      {SLOT_DEFINITION.map((slot) => (
        <Slot
          key={slot.id}
          slotId={slot.id}
          label={slot.label}
          instanceIds={containerState[slot.id] || []}
        />
      ))}
    </div>
  );
}

function Slot({ slotId, label, instanceIds }) {
  const { setNodeRef } = useDroppable({
    id: slotId,
    data: {
      type: "slot",
      containerId: slotId
    }
  });

  return (
    <div
      ref={setNodeRef}
      data-slot={slotId}
      style={{
        background: "#2D333B",
        border: "1px solid #444",
        padding: 6,
        borderRadius: 6
      }}
    >
      <div style={{ color: "#9AA0A6", fontSize: 12, marginBottom: 4 }}>
        {label}
      </div>

      <SortableContext
        id={slotId}
        items={instanceIds}
        strategy={verticalListSortingStrategy}
        data={{
          role: "task-container",
          containerId: slotId
        }}
      >
        {instanceIds.map((id) => (
          <SortableItem key={id} instanceId={id} containerId={slotId}/>
        ))}
      </SortableContext>
    </div>
  );
}
