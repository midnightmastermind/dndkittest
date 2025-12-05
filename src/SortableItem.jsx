// SortableItem.jsx — unified instance-based draggable
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import TaskItem from "./TaskItem";

export default function SortableItem({
  id,                 // always instanceId
  instanceId,
  taskId,
  label,
  type,               // <-- ADDED
  panelId = null,
  fromSlotId = null,
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id, 
    data: {
      role: "task",
      type,           // <-- CRITICAL
      instanceId,
      taskId,
      panelId: panelId,    // previously panelId was undefined
      slotId: fromSlotId,      // previously slotId was missing
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <TaskItem
      ref={setNodeRef}
      sortableAttributes={attributes}
      sortableListeners={listeners}
      sortableStyle={style}
      instanceId={instanceId}
      taskId={taskId}
      label={label}
    />
  );
}
