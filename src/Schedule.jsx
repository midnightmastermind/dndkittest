import { useDroppable } from "@dnd-kit/core";

export default function Schedule({ panel, tasks }) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: panel.id,
    data: {
      role: "panel",
      droppableType: "schedule",   // This panel accepts tasks only
    },
  });
  console.log(active);
  // ⭐ Detect if the dragged item is a TASK
  const isTaskBeingDragged =
    active?.data?.current?.role === "task";

  // ⭐ Only highlight if a TASK is dragged over it
  const showHighlight = isOver && isTaskBeingDragged;

  return (
    <div
      ref={setNodeRef}
      style={{
        padding: 12,
        height: "100%",
        borderRadius: 8,
        border: "1px dashed #aaa",
        background: showHighlight
          ? "rgba(80,200,80,0.25)"
          : "rgba(255,255,255,0.1)",
        overflowY: "auto",
        userSelect: "none",
      }}
    >
      {panel.tasks.map((taskId) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return null;

        return (
          <div
            key={task.id}
            style={{
              padding: 8,
              marginBottom: 6,
              background: "#556",
              color: "white",
              borderRadius: 6,
            }}
          >
            {task.label}
          </div>
        );
      })}
    </div>
  );
}
