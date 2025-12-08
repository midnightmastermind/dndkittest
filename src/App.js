// App.js — CLEAN ARCHITECTURE with useState containerState
import React, { useState, useRef, useMemo, useEffect } from "react";
import Textfield from "@atlaskit/textfield";
import Button from "@atlaskit/button";

import Grid from "./Grid";
import TaskBox from "./TaskBox";
import Schedule from "./Schedule";
import SortableItem from "./SortableItem";
import { ScheduleContext } from "./ScheduleContext";

import "./index.css";
function buildInstanceTree(dataArray, instanceStore) {
  const rootIds = [];

  for (const item of dataArray) {
    const instId = crypto.randomUUID();

    // Insert the instance (children to be filled next)
    instanceStore[instId] = {
      instanceId: instId,
      taskId: crypto.randomUUID(),
      label: item.label ?? "Untitled",
      childrenSortable: item.childrenSortable ?? false,
      children: []
    };

    // Track top-level instance
    rootIds.push(instId);

    // If children exist, recursively build
    if (item.children && item.children.length > 0) {
      const childIds = buildInstanceTree(item.children, instanceStore);
      instanceStore[instId].children = childIds;
    }
  }

  return rootIds;
}

export default function App() {

  // --------------------------------------------
  // GRID PANELS (TaskBoxes / Schedules)
  // --------------------------------------------
  const [panels, setPanels] = useState([]);

  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(3);
  const [showToolbar, setShowToolbar] = useState(false);

  // --------------------------------------------
  // INSTANCE STORE — master list of all instances
  // --------------------------------------------
  const instanceStoreRef = useRef({});

  // --------------------------------------------
  // CONTAINER MODEL (SHADOW LISTS) — NOW STATE!
  // --------------------------------------------
  const [containerState, setContainerState] = useState({});
  // containerId: [instanceIds...]
 const [anyDragging, setAnyDragging] = useState(false);

  // --------------------------------------------
  // SEED INITIAL TASKBOX PANEL (only once)
  // --------------------------------------------
// ⭐ A clean starter dataset
const starterData = [
  {
    label: "Item 1",
    childrenSortable: true,
    children: [
      { label: "Subtask A" },
      { label: "Subtask B" }
    ]
  },
  {
    label: "Item 2",
    childrenSortable: true,
    children: []
  },
  {
    label: "Item 3",
    childrenSortable: false
  }
];

useEffect(() => {
  if (panels.length > 0) return;

  const panelId = crypto.randomUUID();
  const containerId = `taskbox-${panelId}`;

  // ⭐ Build full tree from starterData
  const rootInstanceIds = buildInstanceTree(
    starterData,
    instanceStoreRef.current
  );

  // Attach top-level items to the container
  setContainerState(prev => ({
    ...prev,
    [containerId]: rootInstanceIds
  }));

  // Add panel
  setPanels([
    {
      id: panelId,
      type: "taskbox",
      row: 0,
      col: 0,
      width: 1,
      height: 1,
      props: { containerId }
    }
  ]);
}, []);
  // run once
// Remove instId from ALL locations: root containers + parent.children arrays
const detachEverywhere = (instId) => {
  // Remove from root containerState
  setContainerState(prev => {
    const next = {};
    for (const [cid, arr] of Object.entries(prev)) {
      next[cid] = arr.filter(id => id !== instId);
    }
    return next;
  });

  // Remove from ALL nested child arrays
  Object.values(instanceStoreRef.current).forEach(inst => {
    inst.children = inst.children?.filter(id => id !== instId);
  });
};

  // --------------------------------------------
  // FIND NEXT GRID SPOT
  // --------------------------------------------
  const findNextSpot = () => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!panels.some(p => p.row === r && p.col === c)) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  };

  // --------------------------------------------
  // ADD PANEL (TaskBox only, for now)
  // --------------------------------------------
  const addPanel = () => {
    const spot = findNextSpot();
    if (!spot) return;

    const panelId = crypto.randomUUID();
    const containerId = `taskbox-${panelId}`;

    const instIds = [];

    for (let i = 0; i < 3; i++) {
      const taskId = crypto.randomUUID();
      const instId = crypto.randomUUID();

      instanceStoreRef.current[instId] = {
        taskId,
        label: `Item ${String.fromCharCode(65 + i)}`,
        instanceId: instId
      };

      instIds.push(instId);
    }

    // add container
    setContainerState(prev => ({
      ...prev,
      [containerId]: instIds
    }));

    // add panel
    setPanels(prev => [
      ...prev,
      {
        id: panelId,
        type: "taskbox",
        row: spot.row,
        col: spot.col,
        width: 1,
        height: 1,
        props: { containerId }
      }
    ]);
  };

  // --------------------------------------------
  // DRAG STATE (active item)
  // --------------------------------------------
  const activeRef = useRef(null);
  // { instanceId, fromContainerId }

  // --------------------------------------------
  // ON DRAG START
  // --------------------------------------------
  const handleDragStart = ({ active }) => {
    setAnyDragging(true);   // 🔥 notify all components
    const data = active.data.current || {};
    activeRef.current = {
      instanceId: data.instanceId,
      fromContainerId: data.containerId
    };
  };

 const handleDragOver = ({ active, over }) => {
  if (!active || !over) return;

  const info = activeRef.current;
  if (!info) return;

  const instId = info.instanceId;
  const from = info.fromContainerId;

  const overData = over.data.current || {};
  const to = overData.containerId;
  if (!to) return;

  const isNested = to.startsWith("children-");
  const parentId = isNested ? to.replace("children-", "") : null;

  // ----------------------------------------
  // ⭐ NEW: bottom-droppable slot
  // ----------------------------------------
  if (over.id?.startsWith("bottom-")) {
    const parentId = to.replace("children-", "");
    detachEverywhere(instId);

    instanceStoreRef.current[parentId].children.push(instId);

    activeRef.current.fromContainerId = to;
    return;
  }

  // skip nested-container group header
  if (overData.role === "nested-container") return;

  const hoveringEmptyArea =
    over.id === to && !overData.instanceId;

  // ----------------------------------------
  // EMPTY DROP ZONE
  // ----------------------------------------
  if (hoveringEmptyArea) {
    detachEverywhere(instId);

    setContainerState(prev => ({
      ...prev,
      [to]: [...(prev[to] || []), instId]
    }));

    activeRef.current.fromContainerId = to;

    if (isNested) {
      instanceStoreRef.current[parentId].children.push(instId);
    }

    return;
  }

  // ----------------------------------------
  // CROSS-CONTAINER MOVE
  // ----------------------------------------
  if (from !== to) {
    detachEverywhere(instId);

    setContainerState(prev => ({
      ...prev,
      [to]: [...(prev[to] || []), instId]
    }));

    activeRef.current.fromContainerId = to;

    if (isNested) {
      instanceStoreRef.current[parentId].children.push(instId);
    }

    return;
  }

  // same-container sorting happens at dragEnd
};



const handleDragEnd = ({ active, over }) => {
  setAnyDragging(false);

  const info = activeRef.current;
  activeRef.current = null;

  if (!active || !over || !info) return;

  const instId = active.data.current.instanceId;
  const overData = over.data.current || {};
  const toContainer = overData.containerId;
  if (!toContainer) return;

  // ------------------------------------
  // ⭐ Nested bottom-slot → push to end
  // ------------------------------------
  if (over.id?.startsWith("bottom-")) {
    const parentId = toContainer.replace("children-", "");
    const arr = instanceStoreRef.current[parentId].children;

    const oldIdx = arr.indexOf(instId);
    if (oldIdx !== -1) arr.splice(oldIdx, 1);
    arr.push(instId);

    return;
  }

  // ------------------------------------
  // ROOT SORTING
  // ------------------------------------
  setContainerState(prev => {
    const arr = prev[toContainer];
    if (!arr) return prev;

    if (overData.instanceId && overData.instanceId !== instId) {
      const target = overData.instanceId;

      const oldIndex = arr.indexOf(instId);
      const newIndex = arr.indexOf(target);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = [...arr];
        reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, instId);
        return { ...prev, [toContainer]: reordered };
      }
    }

    return prev;
  });

  // ------------------------------------
  // NESTED SORTING
  // ------------------------------------
  if (toContainer.startsWith("children-")) {
    const parentId = toContainer.replace("children-", "");
    const arr = instanceStoreRef.current[parentId].children;
    const overId = over.data.current.instanceId;

    const oldIdx = arr.indexOf(instId);
    const newIdx = arr.indexOf(overId);

    if (oldIdx !== -1 && newIdx !== -1) {
      arr.splice(oldIdx, 1);
      arr.splice(newIdx, 0, instId);
    }
  }
};



  // --------------------------------------------
  // EDIT ITEM — update instanceStoreRef safely
  // --------------------------------------------
  const editItem = (instanceId, newLabel) => {
    instanceStoreRef.current = {
      ...instanceStoreRef.current,
      [instanceId]: {
        ...instanceStoreRef.current[instanceId],
        label: newLabel
      }
    };
  };

  const deleteItem = (instanceId) => {
    // 1. Remove instance from instanceStore
    const copy = { ...instanceStoreRef.current };
    delete copy[instanceId];
    instanceStoreRef.current = copy;

    // 2. Remove instance from all containers
    setContainerState(prev => {
      const next = {};
      for (const [cid, arr] of Object.entries(prev)) {
        next[cid] = arr.filter(id => id !== instanceId);
      }
      return next;
    });
  };

  // --------------------------------------------
  // DRAG OVERLAY (optional)
  // --------------------------------------------
  const renderDragOverlay = ({ active }) => {
    if (!active?.data?.current) return null;

    const d = active.data.current;
    const inst = instanceStoreRef.current[d.instanceId];
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

  // --------------------------------------------
  // Component mapping (unchanged)
  // --------------------------------------------
  const components = useMemo(() => ({
    taskbox: TaskBox,
    schedule: Schedule
  }), []);

  // --------------------------------------------
  // UI + GRID
  // --------------------------------------------
  return (
    <ScheduleContext.Provider value={{
      panels,
      setPanels,
      instanceStoreRef,
      containerState,
      setContainerState,
      editItem,
      deleteItem,
      anyDragging
    }}>
      <div data-color-mode="dark" style={{ background: "#1D2125", height: "100vh", overflow: "hidden" }}>

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
            zIndex: 5000
          }}
        >
          <Textfield
            label="Rows"
            type="number"
            value={rows}
            onChange={(e) => setRows(+e.target.value || 1)}
          />
          <Textfield
            label="Columns"
            type="number"
            value={cols}
            onChange={(e) => setCols(+e.target.value || 1)}
          />

          <Button appearance="primary" onClick={addPanel}>
            Add Panel
          </Button>

          <Button appearance="warning" onClick={() => setShowToolbar(false)}>
            Close
          </Button>
        </div>

        <Grid
          rows={rows}
          cols={cols}
          panels={panels}
          setPanels={setPanels}
          components={components}
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
