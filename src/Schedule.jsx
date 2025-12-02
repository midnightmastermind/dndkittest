import { useDroppable } from "@dnd-kit/core";
import { TaskItem } from "./TaskBox";
// IMPORTANT: you MUST adjust this import.
// TaskItem lives inside TaskBox.js, so we need Named Export.
// I will show how to fix TaskBox.js after this.


// ---------- Build 12:00 AM – 11:30 PM in 30-min increments ----------
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


// ---------- Single time slot droppable ----------
function TimeSlot({ panelId, slot, tasks, assignedIds }) {
    const droppableId = `${panelId}-slot-${slot.id}`;

    const { setNodeRef, isOver } = useDroppable({
        id: droppableId,
        data: {
            role: "task-slot",
            panelId,
            slotId: slot.id,
            hour: slot.hour,
            minute: slot.minute,
        },
    });

    return (
        <div
            ref={setNodeRef}
            style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                padding: "4px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                background: isOver ? "rgba(80,200,80,0.18)" : "transparent",
                transition: "background 80ms",
                minHeight: 80,
                boxSizing: "border-box",
            }}
        >
            {/* Time label */}
            <div
                style={{
                    width: 70,
                    fontSize: 11,
                    opacity: 0.65,
                    userSelect: "none",
                    color: "white",
                    alignSelf: "start",
                }}
            >
                {slot.label}
            </div>

            {/* Content area */}
            <div
                style={{
                    flex: 1,
                    marginLeft: 8,
                    borderRadius: 4,
                    padding: "6px 6px",
                    minHeight: 65,
                    background: "rgba(255,255,255,0.04)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                }}
            >
                {assignedIds.map((taskId) => {
                    const task = tasks.find((t) => t.id === taskId);
                    if (!task) return null;

                    return (
                        <TaskItem
                            key={taskId}
                            id={taskId}
                            draggableId={`task-${taskId}-slot-${slot.id}`}   // UNIQUE PER SLOT
                            label={task.label}
                            panelId={panelId}
                        />

                    );
                })}
            </div>
        </div>
    );
}


// ---------- Schedule panel ----------
export default function Schedule({ panel, tasks }) {
    const timeSlots = panel.timeSlots || {};

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
                <TimeSlot
                    key={slot.id}
                    panelId={panel.id}
                    slot={slot}
                    tasks={tasks}
                    assignedIds={timeSlots[slot.id] || []}
                />
            ))}
        </div>
    );
}
