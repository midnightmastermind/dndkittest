import React, { useRef, useState, useEffect } from "react";
import Button from "@atlaskit/button";
import ResizeHandle from "./ResizeHandle";
import { token } from "@atlaskit/tokens";
import { useDraggable } from "@dnd-kit/core";

export default function Panel({
  panel,
  setPanels,
  gridRef,
  cols,
  rows,
  activeId
}) {
  const panelRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const prev = useRef(null);

  // ---- DRAG ENABLED UNLESS RESIZING ----
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: panel.id,
    disabled: isResizing,
  });

  const dragListeners = isResizing ? {} : listeners;

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

  // ---- RESIZE EFFECT (snap to FR tracks) ----
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

  const gridArea = `${panel.row + 1} / ${panel.col + 1} / 
                    ${panel.row + panel.height + 1} / 
                    ${panel.col + panel.width + 1}`;

  // ---- RENDER ----
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
        opacity: activeId === panel.id ? 0 : 1,
        position: "relative",
      }}
    >
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
          zIndex: (fullscreen ? 3 : 1)
        }}
      >
        <div style={{ pointerEvents: "none" }}>☰ Panel</div>

        <Button spacing="compact" onClick={toggleFullscreen}>
          {fullscreen ? "Restore" : "Fullscreen"}
        </Button>

        {/* Drag handle */}
        <div
          {...dragListeners}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 50,
            cursor: isResizing ? "default" : "grab",
          }}
        />
      </div>

      <div style={{ padding: 12, color: "white" }}>
        Panel content
      </div>

      {/* Resize handle */}
      <ResizeHandle onMouseDown={beginResize} />
    </div>
  );
}
