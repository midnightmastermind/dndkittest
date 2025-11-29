import React, { useRef, useState, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";

import Panel from "./Panel";
import PanelClone from "./PanelClone";

export default function Grid({
  rows,
  cols,
  panels,
  setPanels,
  toggleToolbar,
}) {
  const gridRef = useRef(null);
  const [activeId, setActiveId] = useState(null);

  // Track sizes (FR units)
  const [colSizes, setColSizes] = useState(() => Array(cols).fill(1));
  const [rowSizes, setRowSizes] = useState(() => Array(rows).fill(1));

  // Sync with rows/cols changes
  useEffect(() => setColSizes(Array(cols).fill(1)), [cols]);
  useEffect(() => setRowSizes(Array(rows).fill(1)), [rows]);

  // Expose sizes to Panel
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

  // DND sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const getPanel = (id) => panels.find((p) => p.id === id);

  // Convert pointer → grid cell
  const getCellFromPointer = (clientX, clientY) => {
    const rect = gridRef.current.getBoundingClientRect();

    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;

    // columns
    const totalCols = colSizes.reduce((a, b) => a + b, 0);
    let acc = 0;
    let col = 0;
    for (let i = 0; i < colSizes.length; i++) {
      acc += colSizes[i];
      if (relX < acc / totalCols) {
        col = i;
        break;
      }
    }

    // rows
    const totalRows = rowSizes.reduce((a, b) => a + b, 0);
    acc = 0;
    let row = 0;
    for (let i = 0; i < rowSizes.length; i++) {
      acc += rowSizes[i];
      if (relY < acc / totalRows) {
        row = i;
        break;
      }
    }

    return { col, row };
  };

  // ⭐ Actual cursor tracking fix ⭐
  const getPointerXY = (event) => {
    const start = event.active.data.current?.pointerStart;
    if (!start) return null;
    return {
      x: start.x + event.delta.x,
      y: start.y + event.delta.y,
    };
  };

  // Hover highlight
  const [hoverCell, setHoverCell] = useState(null);

  // ---- DRAG START ----
  const handleDragStart = (event) => {
    setActiveId(event.active.id);

    const e = event.activatorEvent;
    if (e?.clientX != null && e?.clientY != null) {
      event.active.data.current = {
        pointerStart: { x: e.clientX, y: e.clientY }
      };
    }
  };


  // ---- DRAG MOVE (always highlight under cursor) ----
  const handleDragMove = (event) => {
    const pointer = getPointerXY(event);
    if (!pointer || !gridRef.current) return;
    console.log(pointer);
    const { col, row } = getCellFromPointer(pointer.x, pointer.y);
    console.log(col, row);
    setHoverCell({ col, row });
  };

  console.log(hoverCell);

  // ---- DRAG END (drop at cursor) ----
  const handleDragEnd = (event) => {
    setActiveId(null);

    const pointer = getPointerXY(event);
    if (!pointer) return;

    const panel = getPanel(event.active.id);
    if (!panel) return;

    const { col, row } = getCellFromPointer(pointer.x, pointer.y);

    setPanels((list) =>
      list.map((p) =>
        p.id === panel.id
          ? { ...p, col, row, width: 1, height: 1 }
          : p
      )
    );

    setHoverCell(null);
  };

  // ---- Column resize ----
  const resizeColumn = (i, movement) => {
    setColSizes((sizes) => {
      const next = i + 1;
      if (next >= sizes.length) return sizes;

      const copy = [...sizes];
      copy[i] += movement / 300;
      copy[next] -= movement / 300;

      copy[i] = Math.max(0.3, copy[i]);
      copy[next] = Math.max(0.3, copy[next]);

      return copy;
    });
  };

  // ---- Row resize ----
  const resizeRow = (i, movement) => {
    setRowSizes((sizes) => {
      const next = i + 1;
      if (next >= sizes.length) return sizes;

      const copy = [...sizes];
      copy[i] += movement / 300;
      copy[next] -= movement / 300;

      copy[i] = Math.max(0.3, copy[i]);
      copy[next] = Math.max(0.3, copy[next]);

      return copy;
    });
  };

  // ---- RENDER ----
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#1D2125",
          overflow: "hidden",
        }}
      >
        {/* Wrench */}
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

        {/* MAIN GRID */}
        <div
          ref={gridRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: colTemplate,
            gridTemplateRows: rowTemplate,
          }}
        >
          {hoverCell && (
            <div
              style={{
                gridColumnStart: hoverCell.col + 1,
                gridRowStart: hoverCell.row + 1,
                gridColumnEnd: hoverCell.col + 2,
                gridRowEnd: hoverCell.row + 2,
                background: "rgba(50,150,255,0.45)",
                pointerEvents: "none",
                zIndex: 5,
              }}
            />
          )}
          {/* Checkerboard */}
          {[...Array(rows)].map((_, r) =>
            [...Array(cols)].map((_, c) => {
              const dark = (r + c) % 2 === 0;

              let bg = dark ? "#22272B" : "#2C333A";

              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    background: bg,
                    border: "1px solid #3F444A",
                    transition: "background 80ms",
                  }}
                />
              );
            })
          )}

          {/* Column handles */}
          {colSizes.map((_, i) =>
            i < colSizes.length - 1 ? (
              <div
                key={`col-handle-${i}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  let startX = e.clientX;

                  const move = (ev) => {
                    resizeColumn(i, ev.clientX - startX);
                    startX = ev.clientX;
                  };

                  const stop = () => {
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", stop);
                  };

                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", stop);
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `calc(${(100 *
                    colSizes
                      .slice(0, i + 1)
                      .reduce((a, b) => a + b, 0)) /
                    colSizes.reduce((a, b) => a + b, 0)}%)`,
                  width: 6,
                  marginLeft: -3,
                  cursor: "col-resize",
                  background: "rgba(255,255,255,0.15)",
                  zIndex: 50,
                }}
              />
            ) : null
          )}

          {/* Row handles */}
          {rowSizes.map((_, i) =>
            i < rowSizes.length - 1 ? (
              <div
                key={`row-handle-${i}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  let startY = e.clientY;

                  const move = (ev) => {
                    resizeRow(i, ev.clientY - startY);
                    startY = ev.clientY;
                  };

                  const stop = () => {
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", stop);
                  };

                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", stop);
                }}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `calc(${(100 *
                    rowSizes
                      .slice(0, i + 1)
                      .reduce((a, b) => a + b, 0)) /
                    rowSizes.reduce((a, b) => a + b, 0)}%)`,
                  height: 6,
                  marginTop: -3,
                  cursor: "row-resize",
                  background: "rgba(255,255,255,0.15)",
                  zIndex: 50,
                }}
              />
            ) : null
          )}

          {/* Panels */}
          {panels.map((p) => (
            <Panel
              key={p.id}
              panel={p}
              setPanels={setPanels}
              gridRef={gridRef}
              cols={cols}
              rows={rows}
              activeId={activeId}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeId && <PanelClone panel={getPanel(activeId)} />}
      </DragOverlay>
    </DndContext>
  );
}
