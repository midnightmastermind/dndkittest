// App.js — FINAL VERSION (Reducer + Socket + DnD + Full Compatibility)

import React, { useEffect, useMemo, useRef, useState } from "react";

import Textfield from "@atlaskit/textfield";
import Button from "@atlaskit/button";
import { Label } from '@atlaskit/form';
import Grid from "./Grid";
import TaskBox from "./TaskBox";
import Schedule from "./Schedule";
import SortableItem from "./SortableItem";
import LoginScreen from "./LoginScreen";
import { ScheduleContext } from "./ScheduleContext";

import { socket, emit } from "./socket";
import { useBoardState } from "./state/useBoardState";
import { bindSocketToStore } from "./state/bindSocketToStore";
import { arrayMove } from "@dnd-kit/sortable";

import {
  deleteInstance,
  updateInstance,
  updateContainer,
  updateGrid,
  addPanel
} from "./state/actions";

import "./index.css";

export default function App() {

  // ----------------------------------------------------------
  // 🔥 REDUCER STATE
  // ----------------------------------------------------------
  const { state, dispatch } = useBoardState();
  const { gridId, instances, containers, panels, grid, availableGrids = [] } = state;
  // Local state for grid name input
  const [gridName, setGridName] = useState("");
  const [rowInput, setRowInput] = useState(String(grid.rows || 1));
  const [colInput, setColInput] = useState(String(grid.cols || 1));
  // Keep gridName in sync when a new grid loads
  useEffect(() => {
    if (grid) {
      setGridName(grid.name || "");
    } else {
      setGridName("");
    }
  }, [grid?._id]); // re-run when we switch grids


  // ----------------------------------------------------------
  // SOCKET → STORE
  // ----------------------------------------------------------
  useEffect(() => {
    bindSocketToStore(socket, dispatch);

    const savedUserId = localStorage.getItem("daytrack-userId");
    const savedGridId = localStorage.getItem("daytrack-gridId");

    // If logged in → load grid
    if (savedUserId) {
      if (savedGridId) {
        socket.emit("request_full_state", { gridId: savedGridId });
      } else {
        socket.emit("request_full_state");
      }
    }

    // If NOT logged in → show login UI
  }, []);

  // Keep them in sync when grid changes
  useEffect(() => {
    if (grid) {
      setRowInput(String(grid.rows ?? 1));
      setColInput(String(grid.cols ?? 1));
    }
  }, [grid?._id, grid?.rows, grid?.cols]);
  // ----------------------------------------------------------
  // INSTANCE STORE REF (for Sortable + nested logic)
  // ----------------------------------------------------------
  const instanceStoreRef = useRef({});
  instanceStoreRef.current = instances;

  // ----------------------------------------------------------
  // ⭐ PREVIEW CONTAINER REF (NEW — for dragOver preview)
  // ----------------------------------------------------------
  const previewContainersRef = useRef(null);

  const [showToolbar, setShowToolbar] = useState(false);
  const [anyDragging, setAnyDragging] = useState(false);

  const components = useMemo(
    () => ({
      taskbox: TaskBox,
      schedule: Schedule
    }),
    []
  );


  // ----------------------------------------------------------
  // OLD-SCHOOL REFS FOR DRAG STATE
  // ----------------------------------------------------------
  const activeRef = useRef(null);
  // Wait for hydration

 // ----------------------------------------------------------
// ⭐ DRAG START — set up stable preview snapshot
// ----------------------------------------------------------
const handleDragStart = ({ active }) => {
  // Instead of null -> flip-flopping source for TaskBox,
  // take a snapshot of current containers ONCE per drag.
  previewContainersRef.current = { ...state.containers };

  // Visual flag for disabling popups, collapse, etc.
  setAnyDragging(true);

  const data = active?.data?.current || {};

  // Store instance + origin container for drop logic
  activeRef.current = {
    instanceId: data.instanceId,
    fromContainerId: data.containerId
  };
};


  const isTop = (role) => role?.endsWith(":top");
  const isBottom = (role) => role?.endsWith(":bottom");
  const isList = (role) => role?.endsWith(":list");
  function resolvePanelHover(over, panels) {
    if (!over?.data?.current) return null;
    if (over.data.current.role !== "panel") return null;

    const panelId = over.data.current.panelId;
    if (!panelId) return null;

    const panel = panels.find(p => p.id === panelId);
    if (!panel) return null;

    return panel.props?.containerId || null;
  }

  // ----------------------------------------------------------
  // ⭐ DRAG OVER — build temporary preview ordering ONLY
  // ----------------------------------------------------------
 const handleDragOver = ({ active, over }) => {
  if (!active || !over) return;
  if (active.data.current?.role === "panel") return;

  const a = active.data?.current || {};
  const o = over.data?.current || {};

  const instId = activeRef.current?.instanceId;
  const to = o.containerId;
  const role = o.role;
  const sortableData = o.sortable;

  if (!instId || !to || !role) return;
  if (role === "grid:cell") return;

  // Base snapshot for this preview frame
  const base = previewContainersRef.current || state.containers;

  // Ensure preview is initialized
  if (!previewContainersRef.current) {
    previewContainersRef.current = { ...base };
  }
  console.log(o);
console.log(sortableData?.id);
console.log(instId);
console.log(a);

console.log(a.containerId);

console.log(to);

  // 1️⃣ Hovering your own row in the same container → keep order
  if (sortableData?.id === instId && a.containerId === to) {
    return;
  }

  // 2️⃣ Over the list wrapper "gap" → keep order
  if (isList(role) && !sortableData?.id) {
    return;
  }

  // 3️⃣ Build new container map with inst removed
  let next = {};
  for (const [cid, arr] of Object.entries(base)) {
    next[cid] = arr.filter((id) => id !== instId);
  }
  if (!next[to]) next[to] = [];

  // 4️⃣ Insert before specific item if we have one
  if (sortableData?.id) {
    const overItemId = sortableData.id;
    const arr = next[to];
    const idx = arr.indexOf(overItemId);
    if (idx !== -1) {
      arr.splice(idx, 0, instId);
      previewContainersRef.current = next;
      return;
    }
  }

  // 5️⃣ Top / bottom sentinels (explicit)
  if (isTop(role)) {
    next[to] = [instId, ...next[to]];
  } else if (isBottom(role)) {
    next[to].push(instId);
  } else {
    // fallback — only used for odd roles
    next[to].push(instId);
  }

  previewContainersRef.current = next;
};


  function reorderList(activeId, overId, toContainerId, containers) {
    const prev = containers[toContainerId] || [];
    const items = prev.filter(id => id !== activeId);

    // TOP
    if (overId === `${toContainerId}-top`) {
      items.unshift(activeId);
      return items;
    }

    // BOTTOM
    if (overId === `${toContainerId}-bottom`) {
      items.push(activeId);
      return items;
    }

    // ITEM-TO-ITEM DROP
    const index = items.indexOf(overId);
    if (index >= 0) {
      items.splice(index, 0, activeId);
      return items;
    }

    // Fallback: end
    items.push(activeId);
    return items;
  }

  // ----------------------------------------------------------
  // ⭐ DRAG END — APPLY FINAL ORDER TO REAL STATE (FIXED)
  // ----------------------------------------------------------
  const handleDragEnd = ({ active, over }) => {
    setAnyDragging(false);
    console.log("drag end");
    console.log(over);
    console.log(active);
    const instId = active.data.current?.instanceId;


    const from = activeRef.current?.fromContainerId;
    const overData = over?.data.current || {};
    let to = overData?.containerId;
    const overId = over?.id;
    const preview = previewContainersRef.current;
    let newIndex = null;

    if (preview && !over) {
      for (const [cid, arr] of Object.entries(preview)) {
        const idx = arr.indexOf(instId);
        if (idx !== -1) {
          to = cid;        // correct destination slot
          newIndex = idx;  // exact index in that slot
          break;
        }
      }
    }

    if (!instId || !from || !to) {
      previewContainersRef.current = null;
      return;
    }


    // Compute final order
    let newItems;

    if (newIndex !== null) {
      // TRUST PREVIEW EXACTLY
      const base = state.containers[to] || [];
      const cleaned = base.filter(id => id !== instId);
      cleaned.splice(newIndex, 0, instId);
      newItems = cleaned;
    } else {
      // FALL BACK to original reorder logic
      newItems = reorderList(instId, overId, to, state.containers);
    }
    // Remove instId from all lists
    const cleaned = Object.fromEntries(
      Object.entries(state.containers).map(([cid, arr]) => [
        cid,
        arr.filter(id => id !== instId)
      ])
    );

    cleaned[to] = newItems;

    // Commit
    dispatch(updateContainer({ containerId: from, items: cleaned[from] }));
    dispatch(updateContainer({ containerId: to, items: cleaned[to] }));

    emit("update_container", { gridId, containerId: from, items: cleaned[from] });
    emit("update_container", { gridId, containerId: to, items: cleaned[to] });

    previewContainersRef.current = null;
  };


  // ----------------------------------------------------------
  // EDIT + DELETE
  // ----------------------------------------------------------
  const editItem = (instanceId, newLabel) => {
    const updated = { ...instances[instanceId], label: newLabel };
    dispatch(updateInstance(updated));
    emit("update_instance", { gridId, instance: updated });
  };

  const deleteItemFn = (instanceId) => {
    dispatch(deleteInstance(instanceId));
    emit("delete_instance", { gridId, instanceId });
  };
  // ----------------------------------------------------------
  // TOGGLE PARENT + SORTABLE FLAGS FOR AN INSTANCE
  // ----------------------------------------------------------
  const toggleParentSortable = (instanceId) => {
    const current = instances[instanceId];
    if (!current) return;

    const currentParent = current.props?.parent ?? false;
    const currentSortable = current.props?.sortable ?? false;

    const updated = {
      ...current,
      props: {
        ...(current.props || {}),
        parent: !currentParent,
        sortable: !currentSortable
      }
    };

    dispatch(updateInstance(updated));
    emit("update_instance", { gridId, instance: updated });
  };

  // ----------------------------------------------------------
  // DRAG OVERLAY
  // ----------------------------------------------------------
  const renderDragOverlay = ({ active }) => {
    if (!active?.data?.current) return null;

    const d = active.data.current;
    const inst = instances[d.instanceId];
    if (!inst) return null;

    return (
      <SortableItem
        id={`overlay-${d.instanceId}`}
        instanceId={d.instanceId}
        label={inst.label}
        isDragPreview={true}
        containerId={d.containerId}   // ⭐ pass containerId through
      />
    );
  };

  // ----------------------------------------------------------
  // GRID UPDATES
  // ----------------------------------------------------------
  // Change current grid from dropdown
  const handleGridChange = (e) => {
    const newGridId = e.target.value;
    if (!newGridId || newGridId === gridId) return;

    localStorage.setItem("daytrack-gridId", newGridId);
    socket.emit("request_full_state", { gridId: newGridId });
  };

  // Create a brand new grid
  const handleCreateNewGrid = () => {
    // Clear cached gridId so server will create a fresh one
    localStorage.removeItem("daytrack-gridId");
    socket.emit("request_full_state"); // no gridId → new grid
  };


  const updateRows = (value) => {
    const num = Math.max(1, Number(value) || 1);

    // update local redux grid
    dispatch(updateGrid({ rows: num }));

    // send *only* rows to server
    emit("update_grid", { gridId, rows: num });
  };

  const updateCols = (value) => {
    const num = Math.max(1, Number(value) || 1);

    // update local redux grid
    dispatch(updateGrid({ cols: num }));

    // send *only* cols to server
    emit("update_grid", { gridId, cols: num });
  };
  const commitGridName = () => {
    if (!gridId) return;

    const trimmed = gridName.trim();
    if (trimmed === (grid.name || "")) return;

    dispatch(updateGrid({ name: trimmed }));
    emit("update_grid", { gridId, name: trimmed });
  };
  function findNextOpenPosition(panels, rows, cols) {
    const taken = new Set(panels.map(p => `${p.row}-${p.col}`));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}-${c}`;
        if (!taken.has(key)) {
          return { row: r, col: c };
        }
      }
    }
    return { row: 0, col: 0 };
  }


  const addNewPanel = () => {
    const panelId = crypto.randomUUID();
    const containerId = `taskbox-${panelId}`;
    const { row, col } = findNextOpenPosition(panels, grid.rows, grid.cols);

    const panel = {
      id: panelId,
      role: "panel",
      type: "taskbox",
      containerId,
      props: { containerId },
      row: row,
      col: col,
      width: 1,
      height: 1,
      gridId
    };

    dispatch(addPanel(panel));
    emit("add_panel", { panel, gridId });

    dispatch(updateContainer({ containerId, items: [] }));
    emit("update_container", { containerId, items: [], gridId });
  };


  if (!localStorage.getItem("daytrack-userId")) {
    return (
      <LoginScreen />
    );
  }
  if (!grid) {
    return (
      <div style={{
        color: "white",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        border: "2px dashed rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.03)",
      }}>
        Initializing grid…
      </div>
    );
  }
  // ----------------------------------------------------------
  // ⭐ UI
  // ----------------------------------------------------------
  return (
    <ScheduleContext.Provider
      value={{
        state,
        dispatch,
        instanceStoreRef,

        // ⭐ add preview ref to context for TaskBox
        previewContainersRef,
        toggleParentSortable,
        editItem,
        deleteItem: deleteItemFn,
        anyDragging
      }}
    >
      <div
        data-color-mode="dark"
        style={{
          background: "#1D2125",
          height: "100vh",
          overflow: "hidden"
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            position: "absolute",
            top: showToolbar ? 0 : "-60px",
            width: "100%",
            height: 60,
            background: "#1C1F26",
            borderBottom: "1px solid #444",
            display: "flex",
            alignItems: "center",
            gap: 10,
            transition: "top 200ms ease",
            zIndex: 5000,
          }}
        >
          {/* 🔹 Grid selector + New Grid button */}
          <div style={{ marginLeft: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#fff", fontSize: 12 }}>Grid</span>
            <select
              value={gridId || ""}
              onChange={handleGridChange}
              style={{
                background: "#22272B",
                color: "white",
                border: "1px solid #444",
                borderRadius: 4,
                padding: "4px 8px",
                fontSize: 12,
              }}
            >
              {availableGrids.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name || `Grid ${g.id.slice(-4)}`}
                </option>
              ))}
            </select>

            <Button
              appearance="default"
              onClick={handleCreateNewGrid}
              style={{ color: "white", fontSize: 12, paddingInline: 8 }}
            >
              New Grid
            </Button>
          </div>

          {/* 🔹 Grid name input */}
          <div className={"toolbar-inputs"} style={{ height: 45, maxWidth: 300, display: "flex" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Label htmlFor="grid_name" style={{ color: "white" }}>Grid Name</Label>
              <Textfield
                id={"grid_name"}
                label="Name"
                value={gridName ?? ""}
                onChange={(e) => setGridName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitGridName();
                    e.target.blur(); // optional, makes Enter “feel done”
                  }
                }}
                style={{
                  background: "#22272B",
                  color: "white",
                  border: "1px solid #444",
                  flex: 1
                }}
              />
            </div>


            {/* 🔹 Rows / Columns */}
            <div style={{ maxWidth: 70, display: "flex", flexDirection: "column" }}>
              <Label htmlFor="grid_row" style={{ color: "white" }}>Row</Label>
              <Textfield
                id={"grid_row"}
                label="Rows"
                type="number"
                value={rowInput}
                style={{
                  background: "#22272B",
                  color: "white",
                  border: "1px solid #444",
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setRowInput(val);      // allow empty string

                  if (val === "") return; // don't commit yet

                  updateRows(val);
                }}
                onBlur={() => {
                  if (rowInput === "") {
                    // default to 1 when user leaves it empty
                    setRowInput("1");
                    updateRows("1");
                  }
                }}
              />
            </div>

            <div style={{ maxWidth: 70, display: "flex", flexDirection: "column" }}>
              <Label htmlFor="grid_col" style={{ color: "white" }}>Field label</Label>
              <Textfield
                id={"grid_col"}
                label="Columns"
                type="number"
                value={colInput}
                style={{
                  backgroundColor: "#22272B",
                  color: "white",
                  border: "1px solid #444",
                  flex: 1
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setColInput(val);

                  if (val === "") return;

                  updateCols(val);
                }}
                onBlur={() => {
                  if (colInput === "") {
                    setColInput("1");
                    updateCols("1");
                  }
                }}
              />
            </div>
          </div>


          <Button appearance="primary" onClick={addNewPanel}>
            Add Panel
          </Button>

          <Button style={{ marginLeft: "auto", marginRight: 10 }} appearance="warning" onClick={() => setShowToolbar(false)}>
            Close
          </Button>
        </div>


        <Grid
          gridId={grid._id}
          rows={grid.rows}
          cols={grid.cols}
          panels={panels}
          components={components}
          dispatch={dispatch}
          handleDragStartProp={handleDragStart}
          handleDragOverProp={handleDragOver}
          handleDragEndProp={handleDragEnd}
          renderDragOverlay={renderDragOverlay}
          toggleToolbar={() => setShowToolbar(true)}
        />
      </div>
    </ScheduleContext.Provider>
  );
}
