// Schedule.jsx
import { useDroppable } from "@dnd-kit/core";
import { TaskItem } from "./TaskBox";

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

function TimeSlot({ panel, slot, tasks }) {
  const droppableId = `${panel.id}-slot-${slot.id}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      role: "task-slot",
      panelId: panel.id,
      slotId: slot.id,
    },
  });

  // ⭐ Always normalized entries
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
}

export default function Schedule({ panel, tasks }) {
  return (
    <div
      style={{
        height: "100%",
        borderRadius: 8,
        border: "1px dashed #aaa",
        background: "rgba(255,255,255,0.06)",
        overflowY: "auto",
        userSelect: "none",
      }}
    >
      {TIME_SLOTS.map((slot) => (
        <TimeSlot key={slot.id} panel={panel} slot={slot} tasks={tasks} />
      ))}
    </div>
  );
}