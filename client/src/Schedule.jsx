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
        id: `${containerId}-${HH}:${MM}`,
        label: `${HH}:${MM}`
      });
    }
  }
  return out;
}

const Schedule = ({ containerId, disabled }) => {
  const { state, previewContainersRef } = useContext(ScheduleContext);

  // ⭐ MEMOIZED containerMap to avoid re-render storm
  const containerMap = React.useMemo(() => {
    if (
      previewContainersRef.current &&
      typeof previewContainersRef.current === "object"
    ) {
      return previewContainersRef.current;
    }
    return state.containers;
  }, [state.containers, previewContainersRef.current]);

  const slots = generateSlots(containerId);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 5
      }}
    >
      {slots.map((slot) => {
        const instanceIds = containerMap[slot.id] || [];

        return (
          <Slot
            key={slot.id}
            slotId={slot.id}
            label={slot.label}
            disabled={disabled}
            instanceIds={instanceIds}
          />
        );
      })}
    </div>
  );
}
const Slot = React.memo(
  ({ slotId, label, instanceIds, disabled }) => {
    const { setNodeRef } = useDroppable({
      id: slotId,
      data: {
        type: "slot",
        containerId: slotId,
        role: "schedule-list"
      },
      disabled
    });

    return (
      <div
        ref={setNodeRef}
        className="schedule"
        data-role="schedule"
        data-containerid={slotId}
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

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
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
              <SortableItem key={id} instanceId={id} containerId={slotId} />
            ))}
          </SortableContext>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.slotId === next.slotId &&
    prev.disabled === next.disabled &&
    prev.instanceIds === next.instanceIds
);


export default Schedule;
export { Slot };