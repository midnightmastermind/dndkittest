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
  const [innerDropDisabled, setInnerDropDisabled] = useState(false);

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
    console.log(row,col);
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
    const { col, row } = getCellFromPointer(clientX,clientY);
    console.log(col, row);
    // DO NOT SPREAD event.active.data.current (it resets keys)
    event.active.data.current.pointerStart = {
      x: clientX,
      y: clientY
    };

    console.log("dragStart data:", event);
  };


  // ----------------------------------------------------------
  // DRAG MOVE (panel-only highlight, based on mouse position)
  // ----------------------------------------------------------
  const handleDragMove = (event) => {
    console.log(event);
    const data = event.active.data.current;

    console.log("DRAGGED:", data);
    console.log("OVER:", event.over);

    if (data?.role === "panel" && !innerDropDisabled) {
      setInnerDropDisabled(true);
    }
  };

// ----------------------------------------------------------
// DRAG END
// ----------------------------------------------------------
const handleDragEnd = (event) => {
  setActiveId(null);

  const active = event.active;
  const over = event.over;

  if (!over) return;

  const data = active.data.current;
  const isTask = data?.role === "task";

  setInnerDropDisabled(false);
  // ==========================================================
  // 1) TASK DRAG LOGIC
  // ==========================================================
  if (isTask) {
    const activeId = active.id;            // unique draggable instance
    const taskId = data.taskId;            // logical task id
    const fromPanelId = data.fromPanelId;  // where it came from
    const fromSlotId = data.fromSlotId;    // null if from TaskBox

    const overRole = over.data?.current?.role;

    // ----------------------------------------------------------
    // 1A — TASK → TIMESLOT DROP
    // ----------------------------------------------------------
    if (overRole === "task-slot") {
      const slotPanelId = over.data.current.panelId;
      const slotId = over.data.current.slotId;

      setPanels((list) =>
        list.map((p) => {
          if (p.id !== slotPanelId) return p;

          const existing = p.timeSlots?.[slotId] || [];

          const entry = {
            taskId: taskId,
            instanceId: `inst-${taskId}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`,
          };

          return {
            ...p,
            timeSlots: {
              ...p.timeSlots,
              [slotId]: [...existing, entry],
            },
          };
        })
      );

      return;
    }

    // ----------------------------------------------------------
    // 1B — TASK MOVED BETWEEN PANELS (Original system)
    // ----------------------------------------------------------
    const toPanelId = over.id;

    // only run this path if the drop target *is* a panel
    if (
      toPanelId &&
      fromPanelId &&
      overRole !== "grid-cell" &&
      overRole !== "task-slot"
    ) {
      setPanels((list) =>
        list.map((p) => {
          if (p.id === fromPanelId) {
            return {
              ...p,
              tasks: p.tasks.filter((t) => t !== taskId),
            };
          }
          if (p.id === toPanelId) {
            return {
              ...p,
              tasks: [...p.tasks, taskId],
            };
          }
          return p;
        })
      );

      return;
    }

    return;
  }

  // ==========================================================
  // 2) PANEL DRAG LOGIC
  // ==========================================================
  if (data?.role === "panel") {
    const pointer = getPointerXY(event);
    if (!pointer) return;

    const { col, row } = getCellFromPointer(pointer.x, pointer.y);

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

  // -------------------------------
  // TOUCH + MOUSE RESIZE HELPERS
  // -------------------------------

  const getClientX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);
  const getClientY = (e) => (e.touches ? e.touches[0].clientY : e.clientY);

  // ----- START COLUMN RESIZE -----
  const startColResize = (e, i) => {
    e.preventDefault();

    let startX = getClientX(e);

    const move = (ev) => {
      const delta = getClientX(ev) - startX;
      startX = getClientX(ev);
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

  // ----- START ROW RESIZE -----
  const startRowResize = (e, i) => {
    e.preventDefault();

    let startY = getClientY(e);

    const move = (ev) => {
      const delta = getClientY(ev) - startY;
      startY = getClientY(ev);
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

  console.log(innerDropDisabled);
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

            /* ADD THESE */
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
            height: "93vh",
            display: "grid",
            gridTemplateColumns: colTemplate,
            gridTemplateRows: rowTemplate,
            touchAction: "none",            // ← blocks pull-to-refresh
            overscrollBehaviorY: "none",    // ← prevents bounce refresh
          }}
        >
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
                onMouseDown={(e) => startColResize(e, i)}
                onTouchStart={(e) => startColResize(e, i)}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `calc(${(100 *
                    colSizes.slice(0, i + 1).reduce((a, b) => a + b, 0)) /
                    colSizes.reduce((a, b) => a + b, 0)}%)`,
                  width: 6,
                  marginLeft: -3,
                  cursor: "col-resize",
                  background: "rgba(255,255,255,0.15)",
                  zIndex: 1,
                  touchAction: "none", // prevents view scrolling during resize
                }}
              />
            ) : null
          )}

          {/* Row handles */}
          {rowSizes.map((_, i) =>
            i < rowSizes.length - 1 ? (
              <div
                key={`row-handle-${i}`}
                onMouseDown={(e) => startRowResize(e, i)}
                onTouchStart={(e) => startRowResize(e, i)}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `calc(${(100 *
                    rowSizes.slice(0, i + 1).reduce((a, b) => a + b, 0)) /
                    rowSizes.reduce((a, b) => a + b, 0)}%)`,
                  height: 6,
                  marginTop: -3,
                  cursor: "row-resize",
                  background: "rgba(255,255,255,0.15)",
                  zIndex: 1,
                  touchAction: "none",
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
              innerDropDisabled={innerDropDisabled}
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
