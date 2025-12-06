// SortableItem.jsx — FINAL MERGED VERSION
import React, { useContext, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScheduleContext } from "./ScheduleContext";

export default function SortableItem({ instanceId, containerId }) {
    const { instanceStoreRef } = useContext(ScheduleContext);

    const inst = instanceStoreRef.current[instanceId] || {};
    const label = inst.label ?? "Untitled";

    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: instanceId,
        data: {
            type: "task",
            instanceId,
            containerId
        }
    });
    const [isOpen, setIsOpen] = useState(false);
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: "#2F343A",
        border: "1px solid #444",
        borderRadius: 6,
        padding: "2px 10px",
        marginBottom: 6,
        color: "white",
        cursor: "grab",
        userSelect: "none",
        fontSize: 14
    };
const isDragDisabled = (eventTarget) => {
  return eventTarget.closest("[data-dndkit-disable-drag]");
};
const handleClick = () => {
  setIsOpen(!isOpen)
};
    return (
  <div
    ref={setNodeRef}
    {...attributes}
    {...listeners}
    style={{
      transform: CSS.Transform.toString(transform),
      transition,
      ...style,
      touchAction: "none",
      display: "flex",
      height: isOpen ? "100px" : "30px",
      alignItems: "center"
    }}
  >
    <button
      data-dndkit-disable-drag
      onClick={handleClick}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{ marginLeft: -10, height: "33px", width: "30px", marginTop:-2, marginDown: -10, marginRight: 5 }}
    >
      o
    </button>

    {label}
  </div>
);
}
