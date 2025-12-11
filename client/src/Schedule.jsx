import React, { useContext, useRef, useLayoutEffect } from "react";
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

  // ⭐ Track visible scrollable bounds for clipping
  const scrollRef = useRef(null);
  const visibleBoundsRef = useRef(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    visibleBoundsRef.current = { top: rect.top, bottom: rect.bottom };
  });

  // ⭐ Choose preview or real container map
  const containerMap = React.useMemo(() => {
    if (previewContainersRef.current && typeof previewContainersRef.current === "object") {
      return previewContainersRef.current;
    }
    return state.containers;
  }, [state.containers, previewContainersRef.current]);

  const slots = generateSlots(containerId);

  return (
    <div
      ref={scrollRef}
      className="schedule-scroll"
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
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
            panelBounds={visibleBoundsRef}  // ⭐ PASSED DOWN
          />
        );
      })}
    </div>
  );
};


const Slot = React.memo(
  ({ slotId, label, instanceIds, disabled, panelBounds }) => {
    // ⭐ TOP
    const { setNodeRef: setTopDrop } = useDroppable({
      id: `${slotId}-top`,
      data: { role: `schedule:top`, containerId: slotId,  panelBounds: panelBounds.current  }
    });
    // ⭐ Primary droppable zone with clipping metadata
    const { setNodeRef: setListDrop } = useDroppable({
      id: slotId,
      data: {
        type: "slot",
        containerId: slotId,
        role: "schedule:list",
        panelBounds: panelBounds.current   // ⭐ CRITICAL FOR CLIPPING
      },
      disabled
    });
    // ⭐ BOTTOM
    const { setNodeRef: setBottomDrop } = useDroppable({
      id: `${slotId}-bottom`,
      data: { role: `schedule:bottom`, containerId: slotId,  panelBounds: panelBounds.current }
    });
    return (
      <div
        className="schedule"
        data-role="schedule"
        data-containerid={slotId}
        style={{
          background: "#2D333B",
          border: "1px solid #444",
          borderRadius: 6,
          pointerEvents: "auto",
          marginBottom: 5
        }}
      >
        <div
          ref={setTopDrop}
          style={{
            color: "#9AA0A6",
            fontSize: 12,
            padding: "2px 4px",
            borderRadius: 4,
            pointerEvents: "auto"
          }}
        >
          {label}
        </div>

        <div
          ref={setListDrop}
          style={{
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <SortableContext
            id={slotId}
            items={instanceIds}
            strategy={verticalListSortingStrategy}
            disabled={disabled}
          >
            {instanceIds.map((id) => (
              <SortableItem key={id} instanceId={id} containerId={slotId} />
            ))}
          </SortableContext>
        </div>
        <div ref={setBottomDrop} style={{ height: 10, pointerEvents: "auto"}} />

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
