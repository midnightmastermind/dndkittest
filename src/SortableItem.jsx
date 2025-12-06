// SortableItem.jsx — FINAL MERGED VERSION
import React, { useContext } from "react";
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

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: "#2F343A",
        border: "1px solid #444",
        borderRadius: 6,
        padding: "8px 10px",
        marginBottom: 6,
        color: "white",
        cursor: "grab",
        userSelect: "none",
        fontSize: 14
    };

    return (
        <div ref={setNodeRef} {...attributes} {...listeners} style={style}>
            {label}
        </div>
    );
}
