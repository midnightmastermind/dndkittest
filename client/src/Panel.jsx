import React, { useRef, useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import ResizeHandle from "./ResizeHandle";
import Button from "@atlaskit/button";
import { token } from "@atlaskit/tokens";
import MoreVerticalIcon from "@atlaskit/icon/glyph/more-vertical";

import { ACTIONS } from "./state/actions";
import { emit } from "./socket";

export default function Panel({
  panel,
  components,
  dispatch,
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

  const RenderedComponent = components[panel.type];

  // -------------------------------
  // Draggable metadata
  // -------------------------------
  const data = useMemo(
    () => ({
      role: "panel",
      panelId: panel.id,
      fromCol: panel.col,
      fromRow: panel.row,
      width: panel.width,
      height: panel.height
    }),
    [panel]
  );

  const { setNodeRef, attributes, listeners } = useDraggable({
    id: panel.id,
    disabled: isResizing,
    data
  });

  const dragListeners = isResizing ? {} : listeners;
  const isDragging = activeId === panel.id;

  // ======================================================
  // UPDATE PANEL (Reducer + Socket)
  // ======================================================
  const updatePanel = (updated) => {
    console.log(updated);
    dispatch({ type: ACTIONS.UPDATE_PANEL, payload: updated });
    emit("update_panel", { panel: updated, gridId: panel.gridId });
  };

  // ======================================================
  // FULLSCREEN LOGIC
  // ======================================================
  const toggleFullscreen = () => {
    if (!fullscreenPanelId) {
      prev.current = { ...panel }; // Save original

      updatePanel({
        ...panel,
        row: 0,
        col: 0,
        width: cols,
        height: rows
      });

      setFullscreenPanelId(panel.id);
    } else {
      updatePanel({
        ...panel,
        ...prev.current
      });

      setFullscreenPanelId(null);
    }
  };

  // ======================================================
  // GRID HELPERS
  // ======================================================
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

  // ======================================================
  // RESIZE HANDLER
  // ======================================================
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

      updatePanel({
        ...panel,
        width: Math.min(width, cols - panel.col),
        height: Math.min(height, rows - panel.row)
      });
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

  // GRID AREA
  const gridArea = `${panel.row + 1} / ${panel.col + 1} /
                    ${panel.row + panel.height + 1} /
                    ${panel.col + panel.width + 1}`;

  const isFullscreen =
    fullscreenPanelId !== null && panel.id === fullscreenPanelId;

  // ======================================================
  // RENDER PANEL
  // ======================================================
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
        zIndex: isFullscreen ? 60 : 50
      }}
    >
      <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

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
            color: "white",
          }}
        >
          <div style={{ paddingLeft: 6 }} {...dragListeners}>
            <MoreVerticalIcon size="small" primaryColor="#9AA0A6" />
          </div>

          {/* TYPE SWITCHER */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <select
              value={panel.type}
              onChange={(e) => {
                const newType = e.target.value;

                updatePanel({
                  ...panel,
                  type: newType,
                  props: {
                    ...(panel.props || {}),
                    containerId:
                      newType === "taskbox"
                        ? `taskbox-${panel.id}`
                        : `schedule-${panel.id}`,
                  }
                });
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
        </div>

        {/* CONTENT */}
        <div style={{
          flex: 1,
          minHeight: 0,         // 🔥 Necessary for children to scroll
          color: "white",
          margin: 5
        }}>
          {RenderedComponent && (
            <RenderedComponent
              {...panel.props}
              panelId={panel.id}
              containerId={panel.containerId}
            />
          )}
        </div>
        {/* RESIZE HANDLE */}
        <ResizeHandle onMouseDown={beginResize} onTouchStart={beginResize} />
      </div>
    </div>
  );
}
