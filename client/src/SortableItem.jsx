import React, { useContext, useRef, useState } from "react";
import {
    useSortable,
    SortableContext,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Popup from "@atlaskit/popup";
import Textfield from "@atlaskit/textfield";
import EditIcon from "@atlaskit/icon/glyph/edit";
import TrashIcon from "@atlaskit/icon/glyph/trash";

import { ScheduleContext } from "./ScheduleContext";

export default function SortableItem({
    instanceId,
    isDragPreview = false
}) {
    const { state, instanceStoreRef, editItem, deleteItem, anyDragging } =
        useContext(ScheduleContext);

    const inst = state.instances[instanceId] || {};
    const [collapsed, setCollapsed] = useState(true);
    const containerId = Object.keys(state.containers).find(
        cid => state.containers[cid].includes(instanceId)
    );
    const {
        label = "Untitled",
        children: rawChildren,
        childrenSortable = false
    } = inst;

    const children = Array.isArray(rawChildren) ? rawChildren : [];

    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState(label);
    const anchorRef = useRef(null);

    // draggable only when collapsed
    const sortableDisabled = children.length > 0 && !collapsed;

    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: instanceId,
        disabled: sortableDisabled,
        data: { type: "task", instanceId, containerId }
    });

    React.useEffect(() => {
        if (anyDragging && isOpen) setIsOpen(false);
        if (isDragging && !collapsed) setCollapsed(true);
    }, [anyDragging, isDragging]);

    const save = () => {
        editItem(instanceId, draft.trim() || "Untitled");
        setIsOpen(false);
    };
    // freeze-render flag
    const shouldHideChildren = isDragging || collapsed;

    const wrapperStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        width: "100%",
        opacity: isDragging ? 0.5 : 1,
    };

    const rowStyle = {
        background: "#2F343A",
        border: "1px solid #444",
        borderRadius: 6,
        padding: "6px 10px",
        color: "white",
        cursor: sortableDisabled ? "default" : "grab",
        display: "flex",
        alignItems: "center",
        fontSize: 14,
        touchAction: "none"
    };

    // ---------------------------------------------------
    // CHILDREN DROPPABLE + BOTTOM SLOT
    // ---------------------------------------------------
    const childContainerId = `children-${instanceId}`;
    const isChildDroppable = childrenSortable && !collapsed && !isDragPreview;

    const { setNodeRef: setDroppableChildren } = useDroppable({
        id: childContainerId,
        data: { role: "nested-container", containerId: childContainerId },
        disabled: !isChildDroppable
    });

    // ⭐ bottom droppable sentinel
    const bottomId = `bottom-${childContainerId}`;
    const { setNodeRef: setBottomRef } = useDroppable({
        id: bottomId,
        data: { role: "nested-bottom-slot", containerId: childContainerId },
        disabled: !isChildDroppable
    });

    const toggleCollapse = () => {
        instanceStoreRef.current[instanceId].collapsed = !collapsed;
        setCollapsed(!collapsed);
    };

    return (
        <div
            ref={setNodeRef}
            style={wrapperStyle}
        >
            {/* Parent row */}
            <div style={rowStyle}  {...(!sortableDisabled ? attributes : {})}
                {...(!sortableDisabled ? listeners : {})} data-dndkit-disable-drag={sortableDisabled}>
                {children.length > 0 && (
                    <button
                        data-dndkit-disable-drag
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => {
                            e.stopPropagation();
                            toggleCollapse();
                        }}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            marginRight: 6,
                            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                            transition: "transform 150ms ease",
                            color: "white",
                            fontSize: 14
                        }}
                    >
                        ▶
                    </button>
                )}

                {/* Editor popup */}
                <div
                    ref={anchorRef}
                    data-dndkit-disable-drag
                    onPointerDown={e => e.stopPropagation()}
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
                                onPointerDown={e => e.stopPropagation()}
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
                                    autoFocus
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={e => {
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
                        trigger={triggerProps => (
                            <button
                                {...triggerProps}
                                data-dndkit-disable-drag
                                onClick={e => {
                                    e.stopPropagation();
                                    setDraft(label);
                                    setIsOpen(!isOpen);
                                }}
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

            {/* ----------------------------------------------
                CHILDREN DRAWER
                Drawer remains mounted so animation works.
                But child content is frozen while dragging.
            ----------------------------------------------- */}
            <div className={`collapsible-drawer ${collapsed ? "closed" : "open"}`}>

                {(children.length > 0 || childrenSortable) && (
                    <div
                        style={{
                            paddingLeft: 10,
                            background:
                                "linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(0,0,0,0.15)), #262a30",
                            borderLeft: "1px solid #444"
                        }}
                    >
                        <div
                            ref={isChildDroppable ? setDroppableChildren : null}
                            style={{
                                paddingTop: 5,
                                opacity: collapsed ? 0 : 1,
                                transition: "opacity 150ms ease"
                            }}
                        >
                            {/* FREEZE CHILD CONTENT DURING DRAG */}
                            {!shouldHideChildren && (
                                childrenSortable ? (
                                    <SortableContext
                                        id={childContainerId}
                                        items={children}
                                        strategy={verticalListSortingStrategy}
                                        data={{
                                            role: "nested-container",
                                            containerId: childContainerId
                                        }}
                                    >
                                        {children.map(childId => (
                                            <SortableItem
                                                key={childId}
                                                instanceId={childId}
                                                containerId={childContainerId}
                                            />
                                        ))}

                                        {/* Bottom drop zone */}
                                        <div
                                            ref={setBottomRef}
                                            style={{ height: 40, opacity: 0.2 }}
                                        />
                                    </SortableContext>
                                ) : (
                                    children.map(childId => (
                                        <SortableItem
                                            key={childId}
                                            instanceId={childId}
                                            containerId={childContainerId}
                                        />
                                    ))
                                )
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
