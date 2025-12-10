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

  // ----------------------------------------------------------
  // ⭐ DETACH — helper removes inst from preview clone
  // ----------------------------------------------------------
  const detachFromPreview = (instId, base) => {
    const cleaned = {};
    for (const [cid, arr] of Object.entries(base)) {
      cleaned[cid] = arr.filter(id => id !== instId);
    }
    return cleaned;
  };

  // ----------------------------------------------------------
  // ⭐ DRAG OVER — build temporary preview ordering ONLY
  // ----------------------------------------------------------
  // This NEVER touches real state. It only updates the preview ref.
  const handleDragOver = ({ active, over }) => {
    if (!active || !over) return;

    const instId = activeRef.current?.instanceId;
    const to = over.data.current?.containerId;

    console.log("OVER:", {
      overId: over.id,
      role: over.data.current?.role,
      container: over.data.current?.containerId
    });
    if (!instId || !to) return;

    // Start from preview if available, otherwise real state
    const base = previewContainersRef.current || containers;

    // Remove instance from all lists in preview
    let next = {};
    for (const [cid, arr] of Object.entries(base)) {
      next[cid] = arr.filter(id => id !== instId);
    }
    // ⭐ FIX: ensure next[to] exists to avoid "undefined.includes"
    if (!next[to]) {
      next[to] = [];
    }
    // If not already in the hovered container, append it
    const role = over.data.current?.role;

    // TOP: Insert at index 0
    if (role === "taskbox-top") {
      next[to] = [instId, ...next[to].filter(id => id !== instId)];
    }

    // BOTTOM: Insert at end (already correct)
    else if (role === "taskbox-bottom") {
      if (!next[to].includes(instId)) {
        next[to] = [...next[to], instId];
      }
    }

    // LIST SORT: append (SortableContext will reorder visually)
    else {
      if (!next[to].includes(instId)) {
        next[to] = [...next[to], instId];
      }
    }

    // Store preview ordering
    previewContainersRef.current = next;
  };

  // ----------------------------------------------------------
  // ⭐ DRAG END — APPLY FINAL ORDER TO REAL STATE
  // ----------------------------------------------------------
  // ----------------------------------------------------------
  // ⭐ DRAG END — APPLY FINAL ORDER TO REAL STATE (FIXED)
  // ----------------------------------------------------------
  const handleDragEnd = ({ active, over }) => {
    setAnyDragging(false);

    if (!active || !over) {
      previewContainersRef.current = null;
      return;
    }

    const instId = active.data.current?.instanceId;
    const from = activeRef.current?.fromContainerId;

    if (!instId || !from) {
      previewContainersRef.current = null;
      return;
    }

    // -------------------------------
    // Determine FINAL target container
    // -------------------------------
    let to = over.data.current?.containerId;

    const preview = previewContainersRef.current;
    if (preview) {
      for (const [cid, arr] of Object.entries(preview)) {
        if (arr.includes(instId)) {
          to = cid;
          break;
        }
      }
    }

    if (!to) {
      previewContainersRef.current = null;
      return;
    }

    // -------------------------------
    // Determine ROLE for index logic
    // -------------------------------
    const role = over.data.current?.role;
    const activeSortable = active.data.current.sortable;
    const overSortable = over.data.current.sortable;
    const oldIndex = activeSortable?.index ?? -1;

    let newIndex;

    if (role === "taskbox-top") {
      // Insert at very beginning of list
      newIndex = 0;
    } else if (role === "taskbox-bottom") {
      // Insert at end
      newIndex = state.containers[to]?.length ?? 0;
    } else {
      // Calculate from hovered item
      const hoveringRealItem =
        Boolean(overSortable) &&
        overSortable.index !== undefined &&
        role !== "taskbox-bottom";

      newIndex = hoveringRealItem
        ? overSortable.index
        : (state.containers[to]?.length ?? 0);
    }

    // -------------------------------
    // Detect same-list reorder
    // -------------------------------
    const itemAlreadyInTarget = state.containers[to]?.includes(instId);
    let sameList = (from === to) && itemAlreadyInTarget;

    if (from !== to) sameList = false;

    // -------------------------------
    // Remove ID from all lists
    // -------------------------------
    let cleaned = Object.fromEntries(
      Object.entries(state.containers).map(([cid, arr]) => [
        cid,
        arr.filter(id => id !== instId)
      ])
    );

    // -------------------------------
    // Insert into correct list
    // -------------------------------
    if (sameList) {
      const list = cleaned[from] ?? [];
      list.splice(newIndex, 0, instId);
      cleaned[from] = list;

    } else {
      const target = cleaned[to] ?? [];
      const insertAt = Math.min(Math.max(newIndex, 0), target.length);
      target.splice(insertAt, 0, instId);
      cleaned[to] = target;
    }

    // -------------------------------
    // Apply reducer + socket updates
    // -------------------------------
    const containersToUpdate = new Set([from, to]);

    containersToUpdate.forEach(cid => {
      dispatch(updateContainer({ containerId: cid, items: cleaned[cid] }));
      emit("update_container", {
        gridId,
        containerId: cid,
        items: cleaned[cid]
      });
    });

    // -------------------------------
    // Cleanup preview
    // -------------------------------
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
