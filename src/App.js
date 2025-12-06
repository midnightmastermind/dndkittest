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

  // --------------------------------------------
  // SEED INITIAL TASKBOX PANEL (only once)
  // --------------------------------------------
  const starterTasks = [
    { taskId: crypto.randomUUID(), label: "Item 1" },
    { taskId: crypto.randomUUID(), label: "Item 2" },
    { taskId: crypto.randomUUID(), label: "Item 3" }
  ];

  useEffect(() => {
  if (panels.length > 0) return;

  const panelId = crypto.randomUUID();
  const containerId = `taskbox-${panelId}`;

  const instIds = [];

  starterTasks.forEach(t => {
    const instId = crypto.randomUUID();
    instanceStoreRef.current[instId] = {
      taskId: t.taskId,
      label: t.label,
      instanceId: instId
    };
    instIds.push(instId);
  });

  // initialize containers
  setContainerState(prev => ({
    ...prev,
    [containerId]: instIds
  }));

  // initialize panels
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

}, []);  // run once

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
    const data = active.data.current || {};
    activeRef.current = {
      instanceId: data.instanceId,
      fromContainerId: data.containerId
    };
    console.log(activeRef.current);
  };

  // --------------------------------------------
  // ON DRAG OVER — shadow move (live preview)
  // --------------------------------------------
const handleDragOver = ({ active, over }) => {
  if (!active || !over) return;

  console.log("🔵 DRAG OVER ----------------------");
  console.log("active:", active);
  console.log("over:", over);

  const info = activeRef.current;
  if (!info) {
    console.log("❌ activeRef missing");
    return;
  }

  const overData = over.data.current;
  console.log("overData:", overData);

  if (!overData?.containerId) {
    console.log("❌ no containerId on over");
    return;
  }

  const from = info.fromContainerId;
  const to = overData.containerId;
  const instId = info.instanceId;

  console.log(`from=${from} → to=${to} inst=${instId}`);

  if (!from || !to || from === to) {
    console.log("⚠ no movement (same container)");
    return;
  }

  setContainerState(prev => {
    const fromArr = prev[from] || [];
    const toArr = prev[to] || [];

    console.log("fromArr:", fromArr);
    console.log("toArr:", toArr);

    if (toArr.includes(instId)) {
      console.log("⚠ already inserted, skipping");
      return prev;
    }

    const newFrom = fromArr.filter(id => id !== instId);
    const newTo = [...toArr, instId];

    console.log("➡ newFrom:", newFrom);
    console.log("➡ newTo:", newTo);

    return {
      ...prev,
      [from]: newFrom,
      [to]: newTo
    };
  });

  activeRef.current.fromContainerId = to;

  console.log("activeRef updated:", activeRef.current);
};

  // --------------------------------------------
  // ON DRAG END — commit reorder
  // --------------------------------------------
const handleDragEnd = ({ active, over }) => {
  console.log("🟢 DRAG END -------------------");
  console.log("active:", active);
  console.log("over:", over);

  const info = activeRef.current;
  activeRef.current = null;

  if (!active || !over) {
    console.log("❌ missing active/over");
    return;
  }

  const overData = over.data.current || {};
  const toContainer = overData.containerId;
  const instId = active.data.current.instanceId;

  console.log("toContainer:", toContainer);
  console.log("instId:", instId);
  console.log("overData:", overData);

  if (!toContainer) {
    console.log("❌ no containerId on over");
    return;
  }

  setContainerState(prev => {
    const arr = prev[toContainer];
    console.log("arr before reorder:", arr);

    if (!arr) {
      console.log("❌ arr missing");
      return prev;
    }

    if (overData.instanceId && overData.instanceId !== instId) {
      const target = overData.instanceId;
      const oldIndex = arr.indexOf(instId);
      const newIndex = arr.indexOf(target);

      console.log("oldIndex:", oldIndex, "newIndex:", newIndex);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = [...arr];
        reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, instId);

        console.log("arr after reorder:", reordered);

        return { ...prev, [toContainer]: reordered };
      }
    }

    console.log("⚠ no reorder happened");
    return prev;
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
      setContainerState
    }}>
      <div style={{ background: "#1D2125", height: "100vh", overflow: "hidden" }}>

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
