// SortableItem.jsx — WORKING VERSION WITH POPUP + TRIGGER PROPS
import React, { useContext, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScheduleContext } from "./ScheduleContext";
import Popup from "@atlaskit/popup";
import Textfield from "@atlaskit/textfield";
import EditIcon from "@atlaskit/icon/glyph/edit";
import TrashIcon from "@atlaskit/icon/glyph/trash";

export default function SortableItem({ instanceId, containerId }) {
    const { instanceStoreRef, editItem, deleteItem, anyDragging } = useContext(ScheduleContext);

    const inst = instanceStoreRef.current[instanceId] || {};
    const label = inst.label ?? "Untitled";

    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState(label);

    const anchorRef = useRef(null); // 🔥 stable anchor

    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: instanceId,
        data: { type: "task", instanceId, containerId }
    });
        React.useEffect(() => {
            if (anyDragging && isOpen) {
                setIsOpen(false);
            }
        }, [anyDragging]);
    const save = () => {
        editItem(instanceId, draft.trim() || "Untitled");
        setIsOpen(false);
    };
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: "#2F343A",
        border: "1px solid #444",
        borderRadius: 6,
        padding: "6px 10px",
        marginBottom: 4,
        color: "white",
        cursor: "grab",
        fontSize: 14,
        touchAction: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "start",
    };


    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            style={style}
        >
            {/* 🔥 Stable non-draggable wrapper for popup trigger */}
            <div
                ref={anchorRef}
               

                style={{ display: "flex", borderRadius: 6 }}
            >
                <Popup
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    placement="right-start"
                    shouldCloseOnBlur={false}
                    referenceElement={anchorRef.current}
                    content={() => (
                        <div
                            data-dndkit-disable-drag
                            onPointerDown={(e) => e.stopPropagation()}
                            className="input"
                            style={{
                                background: "#1D2125",
                                padding: 10,
                                borderRadius: 4,
                                border: "1px solid #555",
                                width: 200,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 6
                            }}
                        >
                            <Textfield
                                appearance="standard"
                                autoFocus
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") save();
                                    e.stopPropagation();
                                }}
                            />
                            <button
                                onClick={() => deleteItem(instanceId)}
                                style={{
                                    background: "#C9372C",
                                    border: "none",
                                    width: 40,
                                    height: 40,
                                    borderRadius: 4,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer"
                                }}
                            >
                                <TrashIcon size="small" primaryColor="white" />
                            </button>


                        </div>
                    )}
                    trigger={(triggerProps) => (
                        <button
                            {...triggerProps}
                            data-dndkit-disable-drag
                            onClick={(e) => {
                                e.stopPropagation();
                                setDraft(label);
                                setIsOpen(!isOpen);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "white",
                                padding: 4
                            }}
                        >
                            <EditIcon size="small" />
                        </button>
                    )}
                />
            </div>
            <div style={{ marginLeft: 10 }}>{label}</div>
        </div>
    );
}
