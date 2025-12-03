import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { TaskItem } from "./TaskBox";

// Build 24h time slots (memoized by module scope)
const TIME_SLOTS = (() => {
  const slots = [];
  const formatLabel = (hour, minute) => {
    const suffix = hour < 12 ? "AM" : "PM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const mm = minute.toString().padStart(2, "0");
    return `${displayHour}:${mm} ${suffix}`;
  };

  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const id = `${h.toString().padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}`;
      slots.push({
        id,
        label: formatLabel(h, m),
        hour: h,
        minute: m,
      });
    }
  }
  return slots;
})();

const TimeSlot = React.memo(function TimeSlot({ panel, slot, tasks, innerDropDisabled }) {
  const droppableId = `${panel.id}-slot-${slot.id}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    disabled: innerDropDisabled,
    data: {
      role: "task-slot",
      panelId: panel.id,
      slotId: slot.id,
    },
  });

  const slotEntries = (panel.timeSlots?.[slot.id] || []).map((entry) => ({
    taskId: entry.taskId,
    instanceId: entry.instanceId,
  }));

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "4px 8px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: isOver ? "rgba(80,200,80,0.18)" : "transparent",
        transition: "background 80ms",
        minHeight: 80,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 70,
          fontSize: 11,
          opacity: 0.65,
          color: "white",
          alignSelf: "start",
        }}
      >
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
        }}
      >
        {slotEntries.map((entry) => {
          const task = tasks.find((t) => String(t.id) === String(entry.taskId));
          if (!task) return null;

          return (
            <TaskItem
              key={entry.instanceId}
              draggableId={entry.instanceId}
              taskId={entry.taskId}
              label={task.label}
              fromPanelId={panel.id}
              fromSlotId={slot.id}
              disabled={false}
              isFromTimeSlot={true}
            />
          );
        })}
      </div>
    </div>
  );
},
// -------------------------
// Memo comparison function
// -------------------------
(prev, next) => {
  // If the panel changed slots array for this slot, re-render
  const prevSlot = prev.panel.timeSlots?.[prev.slot.id] || [];
  const nextSlot = next.panel.timeSlots?.[next.slot.id] || [];
  if (prevSlot !== nextSlot) return false;

  // If tasks list changes (labels), re-render
  if (prev.tasks !== next.tasks) return false;

  // Slot itself never changes (static), so ignore it.
  return true;
});


const Schedule = React.memo(function Schedule({ panel, tasks, innerDropDisabled }) {
    console.log(innerDropDisabled);
  return (
    <div
      style={{
        height: "100%",
        borderRadius: 8,
        border: "1px dashed #aaa",
        background: "rgba(255,255,255,0.06)",
        overflowY: innerDropDisabled ? "hidden" : "auto",
        userSelect: "none",
      }}
    >
      {TIME_SLOTS.map((slot) => (
        <TimeSlot key={slot.id} panel={panel} slot={slot} tasks={tasks} innerDropDisabled={innerDropDisabled}/>
      ))}
    </div>
  );
},
// Compare only this panel + tasks
(prev, next) => {
  if (prev.panel !== next.panel) return false;
  if (prev.tasks !== next.tasks) return false;
  return true;
});

export default Schedule;


