// Schedule.jsx
import React, { useLayoutEffect, useRef, useContext } from "react";
import { ScheduleContext } from "./ScheduleContext";
import TimeSlot from "./TimeSlot";

const TIME_SLOTS = (() => {
  const slots = [];
  const fmt = (h, m) => {
    const suffix = h < 12 ? "AM" : "PM";
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:${m.toString().padStart(2, "0")} ${suffix}`;
  };

  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const id = `${String(h).padStart(2, "0")}:${String(m)
        .toString()
        .padStart(2, "0")}`;
      slots.push({ id, label: fmt(h, m) });
    }
  }
  return slots;
})();

export default React.memo(function Schedule({ panelId, gridActive }) {
  const containerRef = useRef(null);

  const { scheduleState, instanceStoreRef } = useContext(ScheduleContext);
  const instanceStore = instanceStoreRef.current;

  if (!scheduleState[panelId]) scheduleState[panelId] = {};
  const panelSlots = scheduleState[panelId];

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        borderRadius: 8,
        border: "1px dashed #aaa",
        background: "rgba(255,255,255,0.06)",
        overflowY: gridActive ? "hidden" : "auto",
      }}
    >
      {TIME_SLOTS.map(slot => {
        // scheduleState stores only instanceIds
        const instanceIds = panelSlots[slot.id] || [];

        return (
          <TimeSlot
            key={slot.id}
            slot={slot}
            panelId={panelId}
            instanceIds={instanceIds}
            instanceStore={instanceStore}
            disableDrop={gridActive}
          />
        );
      })}
    </div>
  );
});
