// SortableItem.jsx
import React, { useContext, useRef, useState, useEffect } from "react";
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

const SortableItem = ({ instanceId, containerId, isDragPreview = false }) => {
    const {
        state,
        editItem,
        deleteItem,
        anyDragging,
        toggleParentSortable,
        previewContainersRef
    } = useContext(ScheduleContext);

    const inst = state.instances[instanceId] || {};
    const [collapsed, setCollapsed] = useState(true);

    const { label = "Untitled" } = inst;
    const props = inst.props || {};
    const isParent = !!props.parent;
    const childrenSortable = !!props.sortable; // driven from props.sortable

    // 🔹 Actual nested children come from the containers map
    const childContainerId = `children-${instanceId}`;

    let children = state.containers[childContainerId] || [];
    // allow drag-over preview to show nested reordering too
    if (previewContainersRef?.current?.[childContainerId]) {
        children = previewContainersRef.current[childContainerId];
    }
    const childIds = children.filter((id) => state.instances[id]);

    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState(label);
    const anchorRef = useRef(null);

    const hasChildren = childIds.length > 0;
    const isChildDroppable = childrenSortable && !collapsed && !isDragPreview;

    // draggable only when collapsed (so expanded lists aren't dragged as a block)
    const sortableDisabled = hasChildren && !collapsed && isChildDroppable;
    const sortableId = isDragPreview ? `overlay-${instanceId}` : instanceId;

    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: sortableId,
        disabled: sortableDisabled,
        data: { id: sortableId, type: "task", role: "task", instanceId, containerId },

    });

    useEffect(() => {
        if (anyDragging && isOpen) setIsOpen(false);
        if (isDragging && !collapsed) setCollapsed(true);
    }, [anyDragging, isDragging, collapsed, isOpen]);

    const save = () => {
        editItem(instanceId, draft.trim() || "Untitled");
        setIsOpen(false);
    };
    // freeze-render flag
    const shouldHideChildren = isDragging || collapsed;


    const wrapperStyle = {
        transform: CSS.Transform.toString(transform),
          transition: isDragPreview ? undefined : transition,
        width: "100%",
        maxWidth: isDragPreview ? "300px" : "unset",
        opacity: isDragging ? 0.5 : 1,
        pointerEvents: "auto",
        touchAction: "none",
        paddingBottom: 3
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
        touchAction: "manipulation",
    };

    // ---------------------------------------------------
    // CHILDREN DROPPABLE + TOP/BOTTOM SENTINELS
    // ---------------------------------------------------

    // Only droppable when:
    // - parent is configured as sortable (P+)
    // - and expanded
    // - and not an overlay

    // ⭐ TOP drop zone (like taskbox:top)
    const { setNodeRef: setChildTopDrop } = useDroppable({
        id: `${childContainerId}-top`,
        data: { role: "nested:top", containerId: childContainerId },
        disabled: !isChildDroppable
    });

    // ⭐ LIST drop zone wrapper (like taskbox:list)
    const { setNodeRef: setChildListDrop } = useDroppable({
        id: childContainerId,
        data: { role: "nested:list", containerId: childContainerId },
        disabled: !isChildDroppable
    });

    // ⭐ BOTTOM drop zone (like taskbox:bottom)
    const { setNodeRef: setChildBottomDrop } = useDroppable({
        id: `${childContainerId}-bottom`,
        data: { role: "nested:bottom", containerId: childContainerId },
        disabled: !isChildDroppable
    });

    const toggleCollapse = () => {
        setCollapsed((prev) => !prev);
    };

    console.log(
        "%c[SORTABLE ITEM RENDER]",
        "color:#09f;font-weight:bold;",
        instanceId,
        {
            containerId,
            dndId: instanceId
        }
    );
    console.log("sortableDisabled", sortableDisabled);
    console.log("childrenSortable", childrenSortable);
    console.log("childIds", childIds);
    console.log("isParent", isParent);
    console.log("isChildDroppable", isChildDroppable);
    console.log("shouldHideChildren", shouldHideChildren);

    return (
        <div
            className={"no-select"}
            ref={!isDragPreview ? setNodeRef : null}
            data-sortable-id={instanceId}
            style={wrapperStyle}
        >
            {/* Parent row */}
            <div
                style={rowStyle}
                {...(!sortableDisabled ? attributes : {})}
                {...(!sortableDisabled ? listeners : {})}
                data-dndkit-disable-drag={sortableDisabled}
            >
                {(hasChildren || childrenSortable || isParent) && (
                    <button
                        data-dndkit-disable-drag
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
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
                    onPointerDown={(e) => e.stopPropagation()}
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
                                style={{
                                    background: "#1D2125",
                                    padding: 10,
                                    borderRadius: 4,
                                    border: "1px solid #555",
                                    width: 260,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 6
                                }}
                            >
                                <Textfield
                                    autoFocus
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") save();
                                        e.stopPropagation();
                                    }}
                                />

                                {/* Toggle parent/sortable flag */}
                                <button
                                    onClick={() => toggleParentSortable(instanceId)}
                                    style={{
                                        background: isParent ? "#0052CC" : "#42526E",
                                        border: "none",
                                        width: 40,
                                        height: 40,
                                        borderRadius: 4,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        color: "white",
                                        fontSize: 11
                                    }}
                                    title={
                                        isParent
                                            ? "Disable parent/sortable children"
                                            : "Enable parent with sortable children"
                                    }
                                >
                                    {isParent ? "P-" : "P+"}
                                </button>

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
          CHILDREN DRAWER (TaskBox-style droppables)
      ----------------------------------------------- */}
            <div style={{ display: isChildDroppable ? "flex" : "none" }} className={`collapsible-drawer ${collapsed ? "closed" : "open"}`}>
                {(childrenSortable || isParent) && (
                    <div
                        style={{
                            paddingLeft: 30,
                            background:
                                "linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(0,0,0,0.15)), #262a30",
                            borderLeft: "1px solid #444",
                            display: "flex",
                            flexDirection: "column",
                            width: "100%",
                        }}
                    >
                        {/* ⭐ THIN TOP DROPPABLE */}
                        <div
                            ref={isChildDroppable ? setChildTopDrop : null}
                            style={{
                                height: 40,
                                pointerEvents: isChildDroppable ? "auto" : "none",
                                opacity: 0,
                                marginTop: isChildDroppable ? -20 : 0

                            }}
                        />

                        {/* ⭐ LIST DROPPABLE WRAPPER */}
                        <div
                            ref={isChildDroppable ? setChildListDrop : null}
                            style={{
                                opacity: collapsed ? 0 : 1,
                                transition: "opacity 150ms ease",
                                display: "flex",
                                flexDirection: "column",
                                minHeight: isChildDroppable ? 40 : 0
                            }}
                        >
                            {!shouldHideChildren &&
                                (childrenSortable ? (
                                    <SortableContext
                                        id={childContainerId}
                                        items={childIds}
                                        strategy={verticalListSortingStrategy}
                                        data={{
                                            role: "nested:list",
                                            containerId: childContainerId
                                        }}
                                    >
                                        {childIds.map((childId) => (
                                            <SortableItem
                                                key={childId}
                                                instanceId={childId}
                                                containerId={childContainerId}
                                            />
                                        ))}
                                    </SortableContext>
                                ) : (
                                    childIds.map((childId) => (
                                        <SortableItem
                                            key={childId}
                                            instanceId={childId}
                                            containerId={childContainerId}
                                        />
                                    ))
                                ))}
                        </div>

                        {/* ⭐ REAL BOTTOM DROPPABLE */}
                        <div
                            ref={isChildDroppable ? setChildBottomDrop : null}
                            style={{
                                height: hasChildren ? 40 : 40,
                                pointerEvents: isChildDroppable ? "auto" : "none",
                                opacity: 0.2,
                                marginBottom: "-3px"
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(SortableItem);
