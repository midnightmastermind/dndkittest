import React, { useRef, useState, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  useDndContext
} from "@dnd-kit/core";

import Panel from "./Panel";
import PanelClone from "./PanelClone";

import { useDroppable } from "@dnd-kit/core";

function CellDroppable({ r, c, dark }) {
  const { active } = useDndContext();

  const isPanelDrag = active?.data?.current?.role === "panel";

  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${r}-${c}`,
    data: { role: "grid-cell", row: r, col: c }
  });
  useEffect(() => {
  if (isOver) console.log("🔥 OVER CELL:", r, c);
}, [isOver]);
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
        transition: "background 80ms"
      }}
    />
  );
}

export default function Grid({
  rows,
  cols,
  panels,
  setPanels,
  tasks,
  setTasks,
  toggleToolbar
}) {
  const gridRef = useRef(null);
  const [activeId, setActiveId] = useState(null);

  const [colSizes, setColSizes] = useState(() => Array(cols).fill(1));
  const [rowSizes, setRowSizes] = useState(() => Array(rows).fill(1));

  useEffect(() => setColSizes(Array(cols).fill(1)), [cols]);
  useEffect(() => setRowSizes(Array(rows).fill(1)), [rows]);

  // expose FR track sizes to panels
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.dataset.sizes = JSON.stringify({
        colSizes,
        rowSizes
      });
    }
  }, [colSizes, rowSizes]);

  const colTemplate = colSizes.map((s) => `${s}fr`).join(" ");
  const rowTemplate = rowSizes.map((s) => `${s}fr`).join(" ");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const getPanel = (id) => panels.find((p) => p.id === id);

  // pointer → grid cell
  const getCellFromPointer = (clientX, clientY) => {
    const rect = gridRef.current.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;

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

  // ✅ cursor tracking: always pointerStart + delta
  const getPointerXY = (event) => {
    const data = event.active.data.current;
    if (!data || !data.pointerStart) return null;

    return {
      x: data.pointerStart.x + event.delta.x,
      y: data.pointerStart.y + event.delta.y
    };
  };


  const [hoverCell, setHoverCell] = useState(null);

  // ----------------------------------------------------------
  // DRAG START
  // ----------------------------------------------------------
  const handleDragStart = (event) => {
    setActiveId(event.active.id);

    const e = event.activatorEvent;
    const clientX = e?.clientX ?? e?.touches?.[0]?.clientX;
    const clientY = e?.clientY ?? e?.touches?.[0]?.clientY;

    // Make sure data.current exists:
    if (!event.active.data.current) {
      event.active.data.current = { ...event.active.data };
    }

    // DO NOT SPREAD event.active.data.current (it resets keys)
    event.active.data.current.pointerStart = {
      x: clientX,
      y: clientY
    };

    console.log("dragStart data:", event.active.data.current);
  };


  // ----------------------------------------------------------
  // DRAG MOVE (panel-only highlight, based on mouse position)
  // ----------------------------------------------------------
  const handleDragMove = (event) => {
    console.log(event);
    const data = event.active.data.current;

    console.log("DRAGGED:", data);
    console.log("OVER:", event.over);


    // If it's not a panel, don't show a hover cell
    if (data?.type !== "panel") {
      setHoverCell(null);
      return;
    }

    const pointer = getPointerXY(event);
    if (!pointer) return;

    const { col, row } = getCellFromPointer(pointer.x, pointer.y);
    setHoverCell({ col, row });
  };

  // ----------------------------------------------------------
  // DRAG END
  // ----------------------------------------------------------
  const handleDragEnd = (event) => {
    setActiveId(null);
    setHoverCell(null);

    const active = event.active;
    const over = event.over;
    console.log(over);
    if (!over) return;
    console.log(event);
    const data = active.data.current;
    const isTask = data?.role === "task";

    // -----------------------------
    // TASK DRAG — TWO WAY FLOW
    // -----------------------------
    if (isTask) {
      const activeId = active.id;
      const fromPanelId = data.fromPanelId;
      const toPanelId = over.id;

      if (!toPanelId || !fromPanelId || over.data.current.role == "grid-cell") return;

      setPanels((list) =>
        list.map((p) => {
          if (p.id === fromPanelId) {
            return {
              ...p,
              tasks: p.tasks.filter((t) => t !== activeId)
            };
          }
          if (p.id === toPanelId) {
            return {
              ...p,
              tasks: [...p.tasks, activeId]
            };
          }
          return p;
        })
      );

      return;
    }
    console.log(data);
    if (data?.role === "panel") {
      console.log("Hit");
      const pointer = getPointerXY(event);
      console.log(pointer);
      if (!pointer) return;

      const { col, row } = getCellFromPointer(pointer.x, pointer.y);
      console.log("📌 PANEL DROP TARGET:", { row, col });

      setPanels((list) =>
        list.map((p) =>
          p.id === active.id
            ? { ...p, col, row, width: 1, height: 1 }
            : p
        )
      );

      return;
    }


  };

  // resizing
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

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#1D2125",
          overflow: "hidden"
        }}
      >
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
            zIndex: 2
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
            gridTemplateRows: rowTemplate
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
                zIndex: 5
              }}
            />
          )}

          {/* checkerboard droppable cells */}
          {[...Array(rows)].map((_, r) =>
            [...Array(cols)].map((_, c) => {
              const dark = (r + c) % 2 === 0;
              return (
                <CellDroppable
                  key={`${r}-${c}`}
                  r={r}
                  c={c}
                  dark={dark}
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
                  zIndex: 50
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
                  zIndex: 50
                }}
              />
            ) : null
          )}

          {panels.map((p) => (
            <Panel
              key={p.id}
              panel={p}
              setPanels={setPanels}
              tasks={tasks}
              setTasks={setTasks}
              gridRef={gridRef}
              cols={cols}
              rows={rows}
              activeId={activeId}
            />
          ))}


        </div>
      </div>

      <DragOverlay zIndex={100000}>
        {activeId && getPanel(activeId) ? (
          <PanelClone panel={getPanel(activeId)} />
        ) : null}

        {activeId && !getPanel(activeId) ? (
          <div
            style={{
              padding: 8,
              background: "#334",
              color: "white",
              borderRadius: 6
            }}
          >
            {activeId}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
