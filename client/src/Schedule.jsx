// Schedule.jsx
import React, {
  useContext,
  useRef,
  useLayoutEffect,
  useState,
  useMemo,
} from "react";
import { ScheduleContext } from "./ScheduleContext";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import SortableItem from "./SortableItem";

/* ------------------------------------------------------------
   TIME SLOTS
------------------------------------------------------------ */
function generateSlots(containerId) {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const HH = h.toString().padStart(2, "0");
      const MM = m.toString().padStart(2, "0");

      out.push({
        id: `${containerId}-${HH}:${MM}`,
        label: `${HH}:${MM}`,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------
   SCHEDULE
------------------------------------------------------------ */
const Schedule = ({ containerId, disabled }) => {
  const { state, previewContainersRef } = useContext(ScheduleContext);

  const scrollRef = useRef(null);

  // 👇 This is what we pass into dnd-kit for clipping
  const [panelBounds, setPanelBounds] = useState(null);

  // 🔥 Measure once on mount + on scroll/resize.
  //    IMPORTANT: dependency array is [] so this effect itself
  //    does NOT loop; only real scroll/resize events call setState.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateBounds = () => {
      const rect = el.getBoundingClientRect();
      setPanelBounds((prev) => {
        if (
          prev &&
          prev.top === rect.top &&
          prev.bottom === rect.bottom
        ) {
          // No change → no state update → no extra renders
          return prev;
        }
        return { top: rect.top, bottom: rect.bottom };
      });
    };

    updateBounds(); // initial

    el.addEventListener("scroll", updateBounds);
    window.addEventListener("resize", updateBounds);

    return () => {
      el.removeEventListener("scroll", updateBounds);
      window.removeEventListener("resize", updateBounds);
    };
  }, []); // 🚨 DO NOT add `panelBounds` here

  // Use preview containers during drag, real containers otherwise
  const containerMap =
    previewContainersRef.current &&
    typeof previewContainersRef.current === "object"
      ? previewContainersRef.current
      : state.containers;

  const slots = useMemo(
    () => generateSlots(containerId),
    [containerId]
  );

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
            panelBounds={panelBounds} // 👈 pass the current bounds
          />
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------
   SLOT
------------------------------------------------------------ */
const Slot = React.memo(function Slot({
  slotId,
  label,
  instanceIds,
  disabled,
  panelBounds,
}) {
  // TOP droppable
  const { setNodeRef: setTopDrop } = useDroppable({
    id: `${slotId}-top`,
    data: {
      role: "schedule:top",
      containerId: slotId,
      panelBounds,
    },
  });

  // MAIN LIST droppable
  const { setNodeRef: setListDrop } = useDroppable({
    id: slotId,
    data: {
      role: "schedule:list",
      containerId: slotId,
      panelBounds,
    },
    disabled,
  });

  // BOTTOM droppable
  const { setNodeRef: setBottomDrop } = useDroppable({
    id: `${slotId}-bottom`,
    data: {
      role: "schedule:bottom",
      containerId: slotId,
      panelBounds,
    },
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
        marginBottom: 5,
      }}
    >
      {/* Time label / top droppable */}
      <div
        ref={setTopDrop}
        style={{
          color: "#9AA0A6",
          fontSize: 12,
          padding: "2px 4px",
          borderRadius: 4,
          pointerEvents: "auto",
        }}
      >
        {label}
      </div>

      {/* Main list area */}
      <div
        ref={setListDrop}
        style={{
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          margin: "0px 5px",
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

      {/* Bottom spacer droppable */}
      <div
        ref={setBottomDrop}
        style={{ height: 10, pointerEvents: "auto" }}
      />
    </div>
  );
},
// Memo: only re-render a slot if its key props actually change
(prev, next) =>
  prev.slotId === next.slotId &&
  prev.disabled === next.disabled &&
  prev.instanceIds === next.instanceIds &&
  prev.panelBounds?.top === next.panelBounds?.top &&
  prev.panelBounds?.bottom === next.panelBounds?.bottom
);

export default Schedule;
export { Slot };