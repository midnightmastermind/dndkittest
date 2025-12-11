// App.js — FINAL VERSION (Reducer + Socket + DnD + Full Compatibility)

import React, { useEffect, useMemo, useRef, useState } from "react";

import Textfield from "@atlaskit/textfield";
import Button from "@atlaskit/button";

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
  const { gridId, instances, containers, panels, grid } = state;

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
  // ⭐ DRAG START — reset preview, store origin container
  // ----------------------------------------------------------
  const handleDragStart = ({ active }) => {
    // Reset preview-on-drag-over
    previewContainersRef.current = null;

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
  console.log(
    "%c[OVER]",
    "background:#222;color:#0f0;font-weight:bold;padding:2px 5px;border-radius:4px;"
  );
  
  if (!active || !over) {
    console.log("❌ active or over missing");
    return;
  }
  if (active.data.current?.role === "panel") return;

  // ⭐ FIX: ensure preview exists
  if (!previewContainersRef.current) {
    previewContainersRef.current = { ...containers };
  }

  const a = active.data?.current || {};
  const o = over.data?.current || {};

  console.log("ACTIVE:", {
    id: active.id,
    instId: a.instanceId,
    container: a.containerId,
    role: a.role
  });

  console.log("OVER:", {
    id: over.id,
    role: o.role,
    container: o.containerId,
    sortable: o.sortable,
    isSortableItem: !!o.sortable?.id
  });

  console.log("previewContainersRef.current:", previewContainersRef.current);
  console.log("state.containers:", state.containers);

  // Warning flags
  if (o.role?.includes("list") && !o.sortable) {
    console.warn("⚠️ SORTABLE DATA MISSING — item hover logic WILL break here.");
  }

  if (a.containerId !== o.containerId) {
    console.warn("↔️ CROSS-CONTAINER MOVE:", a.containerId, "→", o.containerId);
  }

  if (o.role === "grid:cell") {
    console.warn("🚫 OVER GRID CELL WHILE DRAGGING TASK — ignoring.");
  }


  if (active.data.current?.role === "panel") return;

  const instId = activeRef.current?.instanceId;
  const to = over.data.current?.containerId;
  const role = over.data.current?.role;

  if (!instId || !to || !role) return;
  if (role === "grid:cell") return;

  const base = previewContainersRef.current || containers;

  // Remove instance from all containers
  let next = {};
  for (const [cid, arr] of Object.entries(base)) {
    next[cid] = arr.filter(id => id !== instId);
  }

  if (!next[to]) next[to] = [];

  // ----------------------------------------------
  // ⭐ INSERT BEFORE THE SORTABLE ITEM YOU ARE OVER
  // (This is the fix for hovering first item in TaskBox)
  // ----------------------------------------------
  const sortableData = over.data.current?.sortable;
  if (sortableData?.id) {
    const overItemId = sortableData.id;
    const arr = next[to];

    const idx = arr.indexOf(overItemId);
    if (idx !== -1) {
      // Insert instId BEFORE the item you're hovering
      arr.splice(idx, 0, instId);
    console.log(
      "%c[PREVIEW UPDATE]",
      "color:#ff0;font-weight:bold;",
      "container:", to,
      "new order:", arr,
      "full preview:", next
    );
      previewContainersRef.current = next;
      return;
    }
  }

  // ----------------------------------------------
  // Existing top / bottom / list logic
  // ----------------------------------------------
  if (isTop(role)) {
    next[to] = [instId, ...next[to]];
  }
  else if (isBottom(role)) {
    next[to].push(instId);
  }
  else if (isList(role)) {
    next[to].push(instId);
  }
  else {
    // fallback
    next[to].push(instId);
  }
console.log(
  "%c[PREVIEW UPDATE]",
  "color:#ff0;font-weight:bold;",
  "Applying preview for container:",
  to,
  previewContainersRef.current[to]
);

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
  const updateRows = (r) => {
    dispatch(updateGrid({ rows: r, cols: grid.cols }));
    emit("update_grid", { rows: r, cols: grid.cols, gridId });
  };

  const updateCols = (c) => {
    dispatch(updateGrid({ rows: grid.rows, cols: c }));
    emit("update_grid", { rows: grid.rows, cols: c, gridId });
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
            paddingLeft: 10,
            transition: "top 200ms ease",
            zIndex: 5000,
          }}
        >
          <Textfield
            label="Rows"
            type="number"
            value={grid.rows}
            onChange={(e) => updateRows(+e.target.value || 1)}
          />

          <Textfield
            label="Columns"
            type="number"
            value={grid.cols}
            onChange={(e) => updateCols(+e.target.value || 1)}
          />

          <Button appearance="primary" onClick={addNewPanel}>
            Add Panel
          </Button>

          <Button appearance="warning" onClick={() => setShowToolbar(false)}>
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
