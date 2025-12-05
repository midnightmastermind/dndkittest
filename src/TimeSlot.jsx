// TimeSlot.jsx — horizontal schedule row using unified instance IDs
import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import SortableItem from "./SortableItem";
export default function TimeSlot({
  slot,
  panelId,
  instanceIds,
  instanceStore,
  disableDrop = false,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${panelId}-${slot.id}`,
    disabled: disableDrop,
    data: {
      role: "slot",
      panelId,
      slotId: slot.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "4px 8px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: isOver ? "rgba(80,200,80,0.18)" : "transparent",
        minHeight: 80,
      }}
    >
      <div style={{ width: 70, fontSize: 11, opacity: 0.65, color: "white" }}>
        {slot.label}
      </div>

      <div
        style={{
          flex: 1,
          marginLeft: 8,
          borderRadius: 4,
          padding: "2px 6px",
          minHeight: 65,
          background: "rgba(255,255,255,0.04)",
          display: "flex",
          gap: 6,
          overflowX: "auto",
        }}
      >
        <SortableContext items={instanceIds} strategy={horizontalListSortingStrategy}>
          {instanceIds.map(iid => {
            const inst = instanceStore[iid];
            if (!inst) return null;

            return (
              <SortableItem
                key={iid}
                id={iid}
                type="schedule-item"
                instanceId={iid}
                taskId={inst.taskId}
                label={inst.label}
                panelId={panelId}
                fromSlotId={slot.id}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}
