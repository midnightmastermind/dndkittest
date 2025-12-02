import { useDraggable } from "@dnd-kit/core";

export default function TaskBox({ panel, tasks, disabled }) {
    return (
        <div style={{ padding: 8, overflow: "hidden" }}>
            {panel.tasks.map((taskId) => {
                const task = tasks.find((t) => t.id === taskId);
                if (!task) return null;

                return (
                    <TaskItem
                        key={taskId}
                        id={taskId}
                        draggableId={`task-${taskId}-panel-${panel.id}`}   // UNIQUE
                        label={task.label}
                        panelId={panel.id}
                    />

                );
            })}
        </div>
    );
}

export function TaskItem({ id, draggableId, label, panelId, disabled }) {
    const { setNodeRef, attributes, listeners, transform } = useDraggable({
        id: draggableId,   // <-- use custom unique ID
        disabled: disabled,
        data: {
            role: "task",                    // REQUIRED so Grid knows this is a task
            fromPanelId: panelId,
            taskId: id,
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

                /* REQUIRED: dnd-kit overlay + GPU smooth transform */
                transform: transform
                    ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
                    : undefined,
            }}
        >
            {label}
        </div>
    );
}
