import React, { useRef, useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import ResizeHandle from "./ResizeHandle";
import Button from "@atlaskit/button";
import { token } from "@atlaskit/tokens";
import MoreVerticalIcon from "@atlaskit/icon/glyph/more-vertical";
export default function Panel({
  panel,
  components,
  setPanels,
  gridRef,
  cols,
  rows,
  activeId,
  gridActive,
  fullscreenPanelId,
  setFullscreenPanelId
}) {
  const panelRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const prev = useRef(null);

  // -------------------------------
  // Injected Component
  // -------------------------------
  const RenderedComponent = components[panel.type];

  // -------------------------------
  // DnD Data
  // -------------------------------
  const data = useMemo(
    () => ({
      role: "panel",
      panelId: panel.id,
      fromCol: panel.col,
      fromRow: panel.row,
      width: panel.width,
      height: panel.height,
    }),
    [panel.id, panel.col, panel.row, panel.width, panel.height]
  );

  const { setNodeRef, attributes, listeners } = useDraggable({
    id: panel.id,
    disabled: isResizing,
    data,
  });

  const dragListeners = isResizing ? {} : listeners;
  const isDragging = activeId === panel.id;

  // -------------------------------
  // FULLSCREEN
  // -------------------------------
  const toggleFullscreen = () => {
    if (fullscreenPanelId === null && panel.id !== fullscreenPanelId) {
      prev.current = { ...panel };
      setPanels((list) =>
        list.map((p) =>
          p.id === panel.id
            ? { ...p, row: 0, col: 0, width: cols, height: rows }
            : p
        )
      );
      setFullscreenPanelId(panel.id);
    } else {
      setPanels((list) =>
        list.map((p) =>
          p.id === panel.id ? { ...p, ...prev.current } : p
        )
      );
      setFullscreenPanelId(null); // 🔥 clear fullscreen

    }
  };

  // -------------------------------
  // GRID HELPERS
  // -------------------------------
  const getTrackInfo = () => {
    const data = gridRef.current?.dataset.sizes;
    return data ? JSON.parse(data) : null;
  };

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

  // -------------------------------
  // RESIZE HANDLER
  // -------------------------------
  const beginResize = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsResizing(true);

    const getX = (ev) => ev.clientX ?? ev.touches?.[0]?.clientX;
    const getY = (ev) => ev.clientY ?? ev.touches?.[0]?.clientY;

    const move = (ev) => {
      const clientX = getX(ev);
      const clientY = getY(ev);

      const newCol = colFromPx(clientX);
      const newRow = rowFromPx(clientY);

      const width = Math.max(1, newCol - panel.col + 1);
      const height = Math.max(1, newRow - panel.row + 1);

      setPanels((list) =>
        list.map((p) =>
          p.id === panel.id
            ? {
              ...p,
              width: Math.min(width, cols - panel.col),
              height: Math.min(height, rows - panel.row),
            }
            : p
        )
      );
    };

    const stop = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", stop);
      window.removeEventListener("touchcancel", stop);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", stop);
    window.addEventListener("touchcancel", stop);
  };

  const gridArea = `${panel.row + 1} / ${panel.col + 1} /
                    ${panel.row + panel.height + 1} /
                    ${panel.col + panel.width + 1}`;

  const isFullscreen = fullscreenPanelId !== null && panel.id === fullscreenPanelId;

  return (
    <div
      ref={(el) => {
        panelRef.current = el;
        setNodeRef(el);
      }}
      {...attributes}
      style={{
        gridArea,
        background: token("elevation.surface", "rgba(17,17,17,0.95)"),
        borderRadius: 8,
        border: "1px solid #AAA",
        overflow: "hidden",
        position: "relative",
        margin: "3px",
        zIndex: isFullscreen ? 60 : 50,
        pointerEvents: fullscreenPanelId !== null && panel.id !== fullscreenPanelId ? "none" : "auto",
      }}
    >
      {/* PANEL FRAME */}
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

        {/* HEADER */}
        <div
          style={{
            background: "#2F343A",
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 600,
            position: "relative",
            zIndex: isFullscreen ? 3 : 1,
            color: "white"
          }}
        >
          <div style={{ paddingLeft: 6 }}><MoreVerticalIcon
      size="small"
      label="Drag"
      primaryColor="#9AA0A6"
    /></div>
          <div className="input" style={{ display: "flex", alignItems: "center" }}>
            <select
              value={panel.type}
              onChange={(e) => {
                const newType = e.target.value;
                setPanels((list) =>
                  list.map((p) => {
                    if (p.id !== panel.id) return p;

                    // 🔥 Generate the right containerId depending on type
                    const newProps =
                      newType === "taskbox"
                        ? { containerId: `taskbox-${p.id}` }
                        : { containerId: `schedule-${p.id}` };

                    return {
                      ...p,
                      type: newType,
                      props: newProps,   // 🔥 Replace props!
                    };
                  })
                );
              }}
            >
              {Object.keys(components).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>


            <Button spacing="compact" onClick={toggleFullscreen}>
              {isFullscreen ? "Restore" : "Fullscreen"}
            </Button>
          </div>
          {/* DRAG HANDLE */}
          <div
            {...dragListeners}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 40,
              cursor: isResizing ? "default" : "grab",
              background: "rgba(0,0,0,0.1)",
              zIndex: 10,
              touchAction: "none",
            }}
          />
        </div>

        {/* CONTENT */}
        <div
          style={{
            margin: 10,
            color: "white",
            height: "100%",
            overflow: "hidden"
          }}
        >
          {RenderedComponent && (
            <RenderedComponent
              {...panel.props}
              panelId={panel.id}
              disabled={fullscreenPanelId !== null && panel.id !== fullscreenPanelId}
            />
          )}
        </div>

        {/* RESIZE HANDLE */}
        <ResizeHandle onMouseDown={beginResize} onTouchStart={beginResize} />
      </div>
    </div>
  );
}
