// TaskBox.js
import { useDraggable } from "@dnd-kit/core";

export default function TaskBox({ panel, tasks, disabled }) {
  return (
    <div style={{ padding: 8, overflow: "hidden" }}>
      {panel.tasks.map((taskId) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return null;

        // ⭐ TaskBox does NOT provide instanceId
        // A new instanceId will be created when dropped into a time-slot
        const draggableId = `taskbox-${taskId}-${Math.random()}`;

        return (
          <TaskItem
            key={draggableId}
            draggableId={draggableId}
            taskId={taskId}
            label={task.label}
            fromPanelId={panel.id}
            fromSlotId={null}
            disabled={disabled}
            isFromTimeSlot={false}
          />
        );
      })}
    </div>
  );
}

// ⭐ Exported so Schedule can reuse it
export function TaskItem({
  draggableId,
  taskId,
  label,
  fromPanelId,
  fromSlotId,
  disabled,
  isFromTimeSlot,
}) {
  const { setNodeRef, attributes, listeners, transform } = useDraggable({
    id: String(draggableId),  
    disabled,
    data: {
      role: "task",
      taskId: String(taskId),
      fromPanelId: fromPanelId ?? null,
      fromSlotId: fromSlotId ?? null,

      // ⭐ IMPORTANT:
      // distinguishes TaskBox drag vs TimeSlot drag
      isFromTimeSlot: !!isFromTimeSlot,
      instanceId: isFromTimeSlot ? draggableId : null,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        padding: 8,
        marginBottom: 6,
        background: "#334",
        color: "white",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "grab",
        userSelect: "none",
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
    >
      {label}
    </div>
  );
}