import React, { useRef, useState, useEffect } from "react";
import Button from "@atlaskit/button";
import ResizeHandle from "./ResizeHandle";
import { token } from "@atlaskit/tokens";
import { useDraggable } from "@dnd-kit/core";
import TaskBox from "./TaskBox";
import Schedule from "./Schedule";

export default function Panel({
  panel,
  setPanels,
  tasks,
  setTasks,
  gridRef,
  cols,
  rows,
  activeId,
  hidden
}) {
  const panelRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const prev = useRef(null);

  // ⭐⭐⭐ DND-Kit stable data (never updates → never gets wiped)
  const stableData = React.useMemo(
    () => ({
      role: "panel",
      panelId: panel.id,
      fromRow: panel.row,
      fromCol: panel.col,
      width: panel.width,
      height: panel.height,
    }),
    [] // NEVER re-run
  );

  // ---- DRAG ENABLED UNLESS RESIZING ----
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: panel.id,
    disabled: isResizing,
    data: stableData,
  });

  const dragListeners = isResizing ? {} : listeners;

  // ⭐ SHRINK WHILE DRAGGING (panel stops blocking grid)
  const collapsed = activeId === panel.id;

  // ---- FULLSCREEN ----
  const toggleFullscreen = () => {
    if (!fullscreen) {
      prev.current = { ...panel };
      setPanels((list) =>
        list.map((p) =>
          p.id === panel.id
            ? { ...p, row: 0, col: 0, width: cols, height: rows }
            : p
        )
      );
    } else {
      setPanels((list) =>
        list.map((p) =>
          p.id === panel.id ? { ...p, ...prev.current } : p
        )
      );
    }
    setFullscreen((f) => !f);
  };

  // ---- Helper: parse FR track sizes ----
  const getTrackInfo = () => {
    const data = gridRef.current?.dataset.sizes;
    return data ? JSON.parse(data) : null;
  };

  // ---- Convert px → column index ----
  const colFromPx = (px) => {
    const { colSizes } = getTrackInfo();
    const rect = gridRef.current.getBoundingClientRect();
    const rel = (px - rect.left) / rect.width;
    const total = colSizes.reduce((a, b) => a + b, 0);

    let acc = 0;
    for (let i = 0; i < colSizes.length; i++) {
      acc += colSizes[i];
      if (rel < acc / total) return i;
    }
    return colSizes.length - 1;
  };

  // ---- Convert px → row index ----
  const rowFromPx = (py) => {
    const { rowSizes } = getTrackInfo();
    const rect = gridRef.current.getBoundingClientRect();
    const rel = (py - rect.top) / rect.height;
    const total = rowSizes.reduce((a, b) => a + b, 0);

    let acc = 0;
    for (let i = 0; i < rowSizes.length; i++) {
      acc += rowSizes[i];
      if (rel < acc / total) return i;
    }
    return rowSizes.length - 1;
  };

  // ---- RESIZE START ----
  const beginResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  // ---- RESIZE EFFECT ----
  useEffect(() => {
    if (!isResizing) return;

    const move = (e) => {
      const newCol = colFromPx(e.clientX);
      const newRow = rowFromPx(e.clientY);

      const width = Math.max(1, newCol - panel.col + 1);
      const height = Math.max(1, newRow - panel.row + 1);

      const boundedW = Math.min(width, cols - panel.col);
      const boundedH = Math.min(height, rows - panel.row);

      setPanels((list) =>
        list.map((p) =>
          p.id === panel.id
            ? { ...p, width: boundedW, height: boundedH }
            : p
        )
      );
    };

    const stop = () => setIsResizing(false);

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    };
  }, [isResizing, panel, setPanels, cols, rows]);

  // ⭐ Collapsed gridArea when dragging
  const gridArea = collapsed
    ? `${panel.row + 1} / ${panel.col + 1} /
       ${panel.row + 2} / ${panel.col + 2}`
    : `${panel.row + 1} / ${panel.col + 1} /
       ${panel.row + panel.height + 1} /
       ${panel.col + panel.width + 1}`;

  return (
    <div
      ref={(el) => {
        panelRef.current = el;
        setNodeRef(el);
      }}
      {...attributes}
      style={{
        gridArea,

        background: token("elevation.surface", "rgba(17,17,17,0.8)"),
        borderRadius: 8,
        border: "1px solid #AAA",
        overflow: "hidden",
        userSelect: "none",

        // ⭐ collapse + hide original panel while dragging
        opacity: collapsed ? 0 : 1,
        visibility: collapsed ? "hidden" : "visible",
        pointerEvents: collapsed ? "none" : "auto",

        zIndex: fullscreen ? 3 : 1,
        position: "relative",
      }}
    >
      <div style={{ display: collapsed ? "none" : "block" }}>

        {/* HEADER */}
        <div
          style={{
            background: "#DDE2EB",
            padding: "6px 12px",
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 600,
            position: "relative",
            zIndex: fullscreen ? 3 : 1,
          }}
        >
          <div style={{ pointerEvents: "none" }}>☰ Panel</div>

          <select
            value={panel.type}
            onChange={(e) => {
              const type = e.target.value;
              setPanels((list) =>
                list.map((p) =>
                  p.id === panel.id ? { ...p, type } : p
                )
              );
            }}
            style={{ marginLeft: 12, zIndex: 5 }}
          >
            <option value="taskbox">TaskBox</option>
            <option value="schedule">Schedule</option>
          </select>

          <Button spacing="compact" onClick={toggleFullscreen}>
            {fullscreen ? "Restore" : "Fullscreen"}
          </Button>

          {/* DRAG HANDLE */}
          <div
            {...dragListeners}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 50,
              background: "rgba(255,0,0,0.3)",
              cursor: isResizing ? "default" : "grab",
              zIndex: 10,
              touchAction: "none",
            }}
          />
        </div>

        {/* CONTENT */}
        <div
          style={{
            padding: 12,
            color: "white",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {panel.type === "taskbox" && (
            <TaskBox
              panel={panel}
              tasks={tasks}
              setTasks={setTasks}
              fromPanelId={panel.id}
              disabled={fullscreen}
            />
          )}

          {panel.type === "schedule" && (
            <Schedule
              panel={panel}
              tasks={tasks}
              setTasks={setTasks}
              fromPanelId={panel.id}
            />
          )}
        </div>

        <ResizeHandle onMouseDown={beginResize} />
      </div>
    </div>
  );
}
