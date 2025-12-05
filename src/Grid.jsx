import React, { useRef, useState, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  useDndContext,
} from "@dnd-kit/core";

import Panel from "./Panel";
import PanelClone from "./PanelClone";
import { useDroppable } from "@dnd-kit/core";

/* ------------------------------------------------------------
   DROPPABLE GRID CELL (for panel placement only)
------------------------------------------------------------ */
function CellDroppable({ r, c, dark }) {
  const { active } = useDndContext();
  const isPanelDrag = active?.data?.current?.role === "panel";

  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${r}-${c}`,
    data: { role: "grid-cell", row: r, col: c },
  });

  const highlight = isPanelDrag && isOver;

  return (
    <div
      ref={setNodeRef}
      style={{
        background: highlight
          ? "rgba(50,150,255,0.45)"
          : dark
          ? "#22272B"
          : "#2C333A",
        border: "1px solid #3F444A",
        transition: "background 80ms",
      }}
    />
  );
}

/* ------------------------------------------------------------
   GRID COMPONENT
------------------------------------------------------------ */
export default function Grid({
  rows,
  cols,
  panels,
  setPanels,
  components,
  handleDragEndProp,
  handleDragStartProp,
  handleDragOverProp,
  toggleToolbar,
  renderDragOverlay,
}) {
  const gridRef = useRef(null);
  const [activeId, setActiveId] = useState(null);
  const [activeData, setActiveData] = useState(null);
  const [panelDragging, setPanelDragging] = useState(false);

  // track dimensions
  const [colSizes, setColSizes] = useState(() => Array(cols).fill(1));
  const [rowSizes, setRowSizes] = useState(() => Array(rows).fill(1));

  useEffect(() => setColSizes(Array(cols).fill(1)), [cols]);
  useEffect(() => setRowSizes(Array(rows).fill(1)), [rows]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.dataset.sizes = JSON.stringify({
        colSizes,
        rowSizes,
      });
    }
  }, [colSizes, rowSizes]);

  const colTemplate = colSizes.map((s) => `${s}fr`).join(" ");
  const rowTemplate = rowSizes.map((s) => `${s}fr`).join(" ");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  const getPanel = (id) => panels.find((p) => p.id === id);

  /* ------------------------------------------------------------
     Pointer → cell mapping
  ------------------------------------------------------------ */
  const getCellFromPointer = (clientX, clientY) => {
    const rect = gridRef.current.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;

    let col = 0;
    let row = 0;

    const totalCols = colSizes.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < colSizes.length; i++) {
      acc += colSizes[i];
      if (relX < acc / totalCols) {
        col = i;
        break;
      }
    }

    const totalRows = rowSizes.reduce((a, b) => a + b, 0);
    acc = 0;
    for (let i = 0; i < rowSizes.length; i++) {
      acc += rowSizes[i];
      if (relY < acc / totalRows) {
        row = i;
        break;
      }
    }

    return { row, col };
  };

  /* ------------------------------------------------------------
     Drag Start
  ------------------------------------------------------------ */
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    setActiveData(event.active.data.current);

    const data = event.active.data.current;

    if (data?.role === "panel") {
      setPanelDragging(true);
    }
    if (data?.type === "taskbox-item" || data?.type === "schedule-item") {
      handleDragStartProp(event);
      return;
    }
  };

  /* ------------------------------------------------------------
     Drag Move
  ------------------------------------------------------------ */
  const handleDragMove = (event) => {
    const data = event.active.data.current;
    if (data?.type === "taskbox-item" || data?.type === "schedule-item") {
      handleDragOverProp(event);
      return;
    }
  };

  /* ------------------------------------------------------------
     Drag End
  ------------------------------------------------------------ */
  const handleDragEnd = (event) => {
    const { active, over } = event;

    setActiveId(null);
    setPanelDragging(false);

    if (!active) return;

    const data = active.data.current;

    if (data?.type === "taskbox-item" || data?.type === "schedule-item") {
      handleDragEndProp(event);
      return;
    }

    if (data?.role !== "panel") return;

    if (over && data?.role === "panel") {
      const pointer = {
        x: event.activatorEvent.clientX + event.delta.x,
        y: event.activatorEvent.clientY + event.delta.y,
      };

      const { col, row } = getCellFromPointer(pointer.x, pointer.y);

      setPanels((list) =>
        list.map((p) =>
          p.id === active.id
            ? { ...p, col, row, width: 1, height: 1 }
            : p
        )
      );
    }
  };

  /* ------------------------------------------------------------
     Resize Helpers (UPDATED ONLY HERE)
  ------------------------------------------------------------ */

  const getGridWidth = () =>
    gridRef.current?.clientWidth || 1;

  const getGridHeight = () =>
    gridRef.current?.clientHeight || 1;

  const resizeColumn = (i, pixelDelta) => {
    const gridWidth = getGridWidth();
    setColSizes((sizes) => {
      const next = i + 1;
      if (next >= sizes.length) return sizes;

      const total = sizes.reduce((a, b) => a + b, 0);
      const frDelta = (pixelDelta / gridWidth) * total;

      const copy = [...sizes];
      copy[i] += frDelta;
      copy[next] -= frDelta;

      copy[i] = Math.max(0.3, copy[i]);
      copy[next] = Math.max(0.3, copy[next]);

      return copy;
    });
  };

  const resizeRow = (i, pixelDelta) => {
    const gridHeight = getGridHeight();
    setRowSizes((sizes) => {
      const next = i + 1;
      if (next >= sizes.length) return sizes;

      const total = sizes.reduce((a, b) => a + b, 0);
      const frDelta = (pixelDelta / gridHeight) * total;

      const copy = [...sizes];
      copy[i] += frDelta;
      copy[next] -= frDelta;

      copy[i] = Math.max(0.3, copy[i]);
      copy[next] = Math.max(0.3, copy[next]);

      return copy;
    });
  };

  const getClientX = (e) =>
    e.touches ? e.touches[0].clientX : e.clientX;
  const getClientY = (e) =>
    e.touches ? e.touches[0].clientY : e.clientY;

  const getColPosition = (i) => {
    const total = colSizes.reduce((a, b) => a + b, 0);
    const before = colSizes.slice(0, i + 1).reduce((a, b) => a + b, 0);
    return (before / total) * 100;
  };

  const getRowPosition = (i) => {
    const total = rowSizes.reduce((a, b) => a + b, 0);
    const before = rowSizes.slice(0, i + 1).reduce((a, b) => a + b, 0);
    return (before / total) * 100;
  };

  const startColResize = (e, i) => {
    e.preventDefault();
    let startX = getClientX(e);

    const move = (ev) => {
      const newX = getClientX(ev);
      const delta = newX - startX;
      startX = newX;
      resizeColumn(i, delta);
    };

    const stop = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", stop);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", stop);
  };

  const startRowResize = (e, i) => {
    e.preventDefault();
    let startY = getClientY(e);

    const move = (ev) => {
      const newY = getClientY(ev);
      const delta = newY - startY;
      startY = newY;
      resizeRow(i, delta);
    };

    const stop = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", stop);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", stop);
  };

  /* ------------------------------------------------------------
     RENDER
  ------------------------------------------------------------ */
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOverProp}
      autoScroll={{ threshold: { x: 0, y: 0.2 } }}
    >
      <div style={{ position: "absolute", inset: 0, background: "#1D2125", overflow: "hidden" }}>
        <div
          onClick={toggleToolbar}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 42,
            height: 42,
            background: "#2C313A",
            border: "1px solid #444",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          🔧
        </div>

        <div
          ref={gridRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: colTemplate,
            gridTemplateRows: rowTemplate,
            width: "100%",
            height: "93vh",
            overflow: "hidden",
            touchAction: "none",
            overscrollBehaviorY: "none",
          }}
        >
          {[...Array(rows)].map((_, r) =>
            [...Array(cols)].map((_, c) => {
              const dark = (r + c) % 2 === 0;
              return <CellDroppable key={`${r}-${c}`} r={r} c={c} dark={dark} />;
            })
          )}

          {/* Vertical column resizers */}
          {[...Array(cols - 1)].map((_, i) => (
            <div
              key={`col-resize-${i}`}
              onMouseDown={(e) => startColResize(e, i)}
              onTouchStart={(e) => startColResize(e, i)}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${getColPosition(i)}%`,
                width: 6,
                marginLeft: -3,
                cursor: "col-resize",
                zIndex: 50,
                background: "transparent",
              }}
            />
          ))}

          {/* Horizontal row resizers */}
          {[...Array(rows - 1)].map((_, i) => (
            <div
              key={`row-resize-${i}`}
              onMouseDown={(e) => startRowResize(e, i)}
              onTouchStart={(e) => startRowResize(e, i)}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${getRowPosition(i)}%`,
                height: 6,
                marginTop: -3,
                cursor: "row-resize",
                zIndex: 50,
                background: "transparent",
              }}
            />
          ))}

          {panels.map((p) => (
            <Panel
              key={p.id}
              panel={p}
              setPanels={setPanels}
              gridRef={gridRef}
              cols={cols}
              rows={rows}
              activeId={activeId}
              components={components}
              gridActive={panelDragging}
            />
          ))}
        </div>
      </div>

      <DragOverlay zIndex={100000}>
        {activeId && getPanel(activeId) ? (
          <PanelClone panel={getPanel(activeId)} />
        ) : null}

        {!getPanel(activeId) && activeData ? (
          renderDragOverlay({
            active: {
              id: activeId,
              data: { current: activeData },
            },
          })
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
