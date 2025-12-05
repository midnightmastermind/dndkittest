// App.jsx — FIXED MASTER VERSION (unified drag, instance-only)

import React, { useState, useMemo, useRef } from "react";
import Textfield from "@atlaskit/textfield";
import Button from "@atlaskit/button";
import { arrayMove } from "@dnd-kit/sortable";

import Grid from "./Grid";
import TaskBox from "./TaskBox";
import Schedule from "./Schedule";
import SortableItem from "./SortableItem";
import { ScheduleContext } from "./ScheduleContext";

export default function App() {
  // ===============================================================
  // INITIAL TASKS — 3 CLONE-MODE
  // ===============================================================
  const [tasks, setTasks] = useState([
    { taskId: crypto.randomUUID(), label: "Item 1", duplicateMode: "clone" },
    { taskId: crypto.randomUUID(), label: "Item 2", duplicateMode: "clone" },
    { taskId: crypto.randomUUID(), label: "Item 3", duplicateMode: "clone" },
  ]);

  // Panels (TaskBoxes + Schedules)
  const [panels, setPanels] = useState([]);

  // Schedule (instanceIds only)
  const [scheduleState, setScheduleState] = useState({});

  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(3);
  const [showToolbar, setShowToolbar] = useState(false);

  // ===============================================================
  // INSTANCE STORE — global dictionary of:
  // instanceId: { taskId }
  // ===============================================================
  const instanceStoreRef = useRef({});

  // Seed 1 instance for each starter task
  for (const t of tasks) {
    if (!Object.values(instanceStoreRef.current).some(i => i.taskId === t.taskId)) {
      const instanceId = crypto.randomUUID();
      instanceStoreRef.current[instanceId] = { taskId: t.taskId };
    }
  }

  // ===============================================================
  // DRAG STATE
  // ===============================================================
  const dragInfoRef = useRef(null);
  const liveDragPosRef = useRef({ panelId: null, slotId: null });

  const components = useMemo(() => ({
    taskbox: TaskBox,
    schedule: Schedule
  }), []);

  // ===============================================================
  // UTIL: next empty panel slot
  // ===============================================================
  const findNextSpot = () => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!panels.some((p) => p.row === r && p.col === c)) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  };

  // ===============================================================
  // ADD PANEL — creates 3 *single-mode* tasks w/ instances
  // ===============================================================
  const addPanel = () => {
    const spot = findNextSpot();
    if (!spot) return;

    const panelId = crypto.randomUUID();

    const newTasks = Array.from({ length: 3 }).map((_, i) => {
      const taskId = crypto.randomUUID();
      const instanceId = crypto.randomUUID();

      instanceStoreRef.current[instanceId] = { taskId };

      return {
        taskId,
        label: `Item ${String.fromCharCode(65 + i)}`,
        duplicateMode: "single",
        instanceId,
      };
    });

    const instanceIds = newTasks.map(t => t.instanceId);

    setTasks(prev => [...prev, ...newTasks]);

    setPanels(prev => [
      ...prev,
      {
        id: panelId,
        type: "taskbox",
        row: spot.row,
        col: spot.col,
        width: 1,
        height: 1,
        props: { panelId, instanceIds },
      },
    ]);
  };

  // ===============================================================
  // MODIFY PANEL INSTANCE LISTS
  // ===============================================================
  const removeInstanceFromPanel = (panelId, instanceId) =>
    setPanels(prev =>
      prev.map(p =>
        p.id === panelId
          ? {
            ...p,
            props: {
              ...p.props,
              instanceIds: p.props.instanceIds.filter(id => id !== instanceId),
            },
          }
          : p
      )
    );

  const insertInstanceIntoPanel = (panelId, instanceId, beforeId = null) =>
    setPanels(prev =>
      prev.map(p => {
        if (p.id !== panelId) return p;
        const arr = [...p.props.instanceIds];
        if (arr.includes(instanceId)) {
          return p; // no change
        }
        if (!beforeId) arr.push(instanceId);
        else {
          const idx = arr.indexOf(beforeId);
          if (idx === -1) arr.push(instanceId);
          else arr.splice(idx, 0, instanceId);
        }
        return { ...p, props: { ...p.props, instanceIds: arr } };
      })
    );

  const moveInstanceWithinPanel = (panelId, sourceId, targetId) =>
    setPanels(prev =>
      prev.map(p => {
        if (p.id !== panelId) return p;
        const arr = [...p.props.instanceIds];
        return {
          ...p,
          props: {
            ...p.props,
            instanceIds: arrayMove(arr, arr.indexOf(sourceId), arr.indexOf(targetId)),
          },
        };
      })
    );

  // ===============================================================
  // DRAG START
  // ===============================================================
  const handleDragStart = ({ active }) => {
    console.log("🔵 DRAG START -------------------------");

    console.log("active.id:", active.id);
    console.log("active.data.current:", active.data.current);

    const d = active?.data?.current || {};

    dragInfoRef.current = {
      type: d.type ?? d.origin ?? null,
      origin: d.origin ?? null,
      instanceId: d.instanceId ?? null,
      taskId: d.taskId ?? null,
      fromPanelId: d.panelId ?? null,
      fromSlotId: d.slotId ?? null,
    };

    console.log("dragInfoRef initialized:", dragInfoRef.current);
    console.log("---------------------------------------");
  };


  const handleDragOver = ({ active, over }) => {
    console.log("🟡 DRAG OVER --------------------------");
    console.log("active:", active?.data?.current);
    console.log("over:", over?.data?.current);
    console.log("dragInfo BEFORE:", dragInfoRef.current);

    if (!active || !over) {
      console.log("⛔ DRAG OVER: Missing active or over → EXIT");
      return;
    }

    const a = active.data.current;
    const o = over.data.current;
    if (!a || !o) {
      console.log("⛔ DRAG OVER: Missing active/o data.current → EXIT");
      return;
    }

    // Ensure dragInfoRef never disappears
    if (!dragInfoRef.current) {
      console.log("🟠 Initializing dragInfoRef (first dragOver)");
      dragInfoRef.current = {
        type: a.type ?? null,
        instanceId: a.instanceId,
        taskId: a.taskId,
        fromPanelId: a.panelId,
        fromSlotId: a.slotId,
      };
    }

    const drag = dragInfoRef.current;

    console.log("ℹ️ drag.type:", drag.type);
    console.log("ℹ️ over.role:", o.role);
    console.log("ℹ️ over.type:", o.type);
    console.log("ℹ️ fromPanelId:", drag.fromPanelId, "fromSlotId:", drag.fromSlotId);

    // ----------------------------------------------------------
    // 1️⃣ SCHEDULE → TASKBOX
    // ----------------------------------------------------------
    console.log("🔍 CHECK 1: SCHEDULE → TASKBOX");
    if (drag.type === "schedule-item" && o.role?.startsWith("taskbox")) {
      console.log("✅ HIT: SCHEDULE → TASKBOX");

      const { instanceId, fromPanelId, fromSlotId } = drag;

      console.log("Removing from schedule:", fromPanelId, fromSlotId);

      setScheduleState(prev => {
        const copy = structuredClone(prev);
        const arr = copy[fromPanelId]?.[fromSlotId] || [];
        copy[fromPanelId][fromSlotId] = arr.filter(id => id !== instanceId);
        return copy;
      });

      console.log("Inserting into TaskBox panel:", o.panelId);
      insertInstanceIntoPanel(o.panelId, instanceId);

      dragInfoRef.current = {
        ...drag,
        type: "taskbox-item",
        fromPanelId: o.panelId,
        fromSlotId: null,
      };

      console.log("➡️ EXIT: SCHEDULE → TASKBOX");
      return;
    } else {
      console.log("❌ SKIP: Not schedule→taskbox");
    }


    // ----------------------------------------------------------
    // 2️⃣ TASKBOX → SCHEDULE   (FULL SNAPSHOT VERSION)
    // ----------------------------------------------------------
    console.log("🔍 CHECK 2: TASKBOX → SCHEDULE");
    console.log("drag.type:", drag.type, "o.role:", o.role);

    if (drag.type === "taskbox-item" && o.role === "slot") {
      console.log("✅ HIT: TASKBOX → SCHEDULE");

      const inst = instanceStoreRef.current[drag.instanceId];
      const task = tasks.find(t => t.taskId === inst.taskId);

      let useId = drag.instanceId;

      const isFirstIntoSchedule = drag.fromSlotId == null;
      console.log("isFirst time into schedule?", isFirstIntoSchedule);

      if (isFirstIntoSchedule) {
        if (task.duplicateMode === "clone") {
          console.log("→ CLONE MODE: generating new instanceId");
          useId = crypto.randomUUID();
        }

        // ⭐ FULL SNAPSHOT into instanceStore
        console.log("→ FULL SNAPSHOT INSERT");
        instanceStoreRef.current[useId] = {
          instanceId: useId,
          taskId: task.taskId,
          label: task.label,
          icon: task.icon,
          color: task.color,
          properties: task.properties,
        };

        console.log("→ Removing from TaskBox");
        removeInstanceFromPanel(drag.fromPanelId, drag.instanceId);

        dragInfoRef.current = {
          type: "schedule-item",
          instanceId: useId,
          fromPanelId: o.panelId,
          fromSlotId: o.slotId,
        };
      } else {
        console.log("→ Already schedule-item, updating position");

        dragInfoRef.current = {
          ...drag,
          fromPanelId: o.panelId,
          fromSlotId: o.slotId,
        };
      }

      // Keep a record of previous hover location
      const prev = liveDragPosRef.current;
      liveDragPosRef.current = { panelId: o.panelId, slotId: o.slotId };

      console.log("Moving schedule instance:", useId, "to slot:", o.slotId);

      const targetPanelId = o.panelId;
      const targetSlotId = o.slotId;

      setScheduleState(prevState => {
        const copy = structuredClone(prevState);

        if (!copy[targetPanelId]) copy[targetPanelId] = {};
        if (!copy[targetPanelId][targetSlotId]) copy[targetPanelId][targetSlotId] = [];

        // Remove from previous hover slot
        if (prev.panelId && prev.slotId) {
          console.log("→ Removing from previous hover slot");
          copy[prev.panelId][prev.slotId] =
            (copy[prev.panelId][prev.slotId] || []).filter(id => id !== useId);
        }

        // Insert instanceId if not already in this slot
        if (!copy[targetPanelId][targetSlotId].includes(useId)) {
          console.log("→ Adding to schedule slot:", targetSlotId);
          copy[targetPanelId][targetSlotId].push(useId);
        }

        return copy;
      });

      console.log("➡️ EXIT: TASKBOX → SCHEDULE");
      return;
    } else {
      console.log("❌ SKIP: Not taskbox→schedule");
    }


    // ----------------------------------------------------------
    // 3️⃣ SCHEDULE → SCHEDULE
    // ----------------------------------------------------------
    console.log("🔍 CHECK 3: SCHEDULE → SCHEDULE");

    if (drag.type === "schedule-item" && o.role === "slot") {
      console.log("✅ HIT: SCHEDULE → SCHEDULE");

      if (drag.fromPanelId === o.panelId && drag.fromSlotId === o.slotId) {
        console.log("⛔ Same slot → no relocation");
        return;
      }

      console.log("Moving schedule item:", drag.instanceId);

      setScheduleState(prev => {
        const copy = structuredClone(prev);

        // Remove from old slot
        console.log("Removing from old slot:", drag.fromSlotId);
        copy[drag.fromPanelId][drag.fromSlotId] =
          copy[drag.fromPanelId][drag.fromSlotId].filter(id => id !== drag.instanceId);

        // Add to new slot
        console.log("Adding to new slot:", o.slotId);
        if (!copy[o.panelId]) copy[o.panelId] = {};
        if (!copy[o.panelId][o.slotId]) copy[o.panelId][o.slotId] = [];
        copy[o.panelId][o.slotId].push(drag.instanceId);

        dragInfoRef.current.fromPanelId = o.panelId;
        dragInfoRef.current.fromSlotId = o.slotId;

        return copy;
      });

      console.log("➡️ EXIT: SCHEDULE → SCHEDULE");
      return;
    } else {
      console.log("❌ SKIP: Not schedule→schedule");
    }


    // ----------------------------------------------------------
    // 4️⃣ TASKBOX → TASKBOX
    // ----------------------------------------------------------
    console.log("🔍 CHECK 4: TASKBOX → TASKBOX");

    if (drag.type === "taskbox-item") {
      console.log("→ inside taskbox-item branch");

      if (o.role === "slot") {
        console.log("⛔ Over schedule slot → NOT taskbox→taskbox, EXIT");
        return;
      }

      let targetPanel = null;

      if (o.role === "taskbox" || o.role === "taskbox-empty") {
        targetPanel = o.panelId;
        console.log("Target panel detected:", targetPanel);
      } else {
        console.log("❌ Over something that is NOT a taskbox, skipping");
        return;
      }

      const startPanel = drag.fromPanelId;

      console.log("startPanel:", startPanel, "targetPanel:", targetPanel);

      if (targetPanel && startPanel && targetPanel !== startPanel) {
        console.log("✔ MOVING between taskboxes");
        removeInstanceFromPanel(startPanel, drag.instanceId);
        insertInstanceIntoPanel(targetPanel, drag.instanceId);

        dragInfoRef.current.fromPanelId = targetPanel;
        console.log("➡️ EXIT: TASKBOX → TASKBOX");
      } else {
        console.log("⛔ Same panel or invalid → SKIP");
      }

      return;
    } else {
      console.log("❌ SKIP: drag.type was not taskbox-item");
    }

    console.log("🔚 END OF DRAG OVER (no branch hit)");
  };


  // ===============================================================
  // DRAG END
  // ===============================================================
  const handleDragEnd = ({ active, over }) => {
    console.log("🔴🔴🔴 DRAG END =======================================");

    //
    // RAW VALUES
    //
    console.log("active.id:", active?.id);
    console.log("active.data.current:", active?.data?.current);

    console.log("over.id:", over?.id);
    console.log("over.data.current:", over?.data?.current);

    //
    // DRAG INFO
    //
    console.log("dragInfoRef BEFORE:", dragInfoRef.current);

    const drag = dragInfoRef.current;

    dragInfoRef.current = null;
    liveDragPosRef.current = { panelId: null, slotId: null };

    if (!active || !over || !drag) return;

    // ============================================================
    // TASKBOX SORT LOGIC
    // ============================================================
    if (drag.type === "taskbox-item") {
      const activeId = drag.instanceId;

      const overRole = over?.data?.current?.role;
      const overType = over?.data?.current?.type;

      console.log("🟦 drag.type = taskbox-item");
      console.log("activeId:", activeId);
      console.log("overRole:", overRole);
      console.log("overType:", overType);

      const panel = panels.find(p => p.id === drag.fromPanelId);
      const arr = panel?.props?.instanceIds || [];

      const isExisting = arr.includes(activeId);

      // CASE 1 — Dropped over another item → reorder
      if (overType === "taskbox-item") {
        const overId = over.id;

        console.log("🟩 CASE: Drop over item");
        console.log("activeId:", activeId, "overId:", overId);

        if (activeId !== overId) {
          console.log("➡️ Calling moveInstanceWithinPanel()");
          moveInstanceWithinPanel(drag.fromPanelId, activeId, overId);
        } else {
          console.log("⛔ activeId === overId (no reorder)");
        }
        return;
      }

      // CASE 2 — Dropped inside TaskBox but no item hit
      if (overRole?.startsWith("taskbox")) {

        // 🎯 NEW ITEM BEING ADDED → append
        if (!isExisting) {
          console.log("🟨 CASE: New item dropped into TaskBox → append");

          setPanels(prev =>
            prev.map(p => {
              if (p.id !== drag.fromPanelId) return p;

              const newArr = [...p.props.instanceIds];
              if (!newArr.includes(activeId)) newArr.push(activeId);

              return { ...p, props: { ...p.props, instanceIds: newArr } };
            })
          );

          return;
        }

        // 🔄 EXISTING ITEM FROM SAME LIST → REVERT
        console.log("🟫 CASE: Existing item dropped in empty space → revert");
        console.log("⛔ Doing nothing so the item snaps back.");

        return;
      }

      // UNKNOWN TARGET
      console.log("⚠️ Unknown drop target — no action.");
    }


    // ============================================================
    // SCHEDULE PENDING FINALIZATION
    // ============================================================
    if (drag.type === "schedule-item-pending") {
      console.log("🟪 Finalizing schedule pending → schedule-item");
      drag.type = "schedule-item";
    }

    console.log("dragInfoRef AFTER:", dragInfoRef.current);
    console.log("=====================================================");

    dragInfoRef.current = null;
  };


  // ===============================================================
  // DRAG OVERLAY
  // ===============================================================
  const renderDragOverlay = ({ active }) => {
    if (!active?.data?.current) return null;

    const d = active.data.current;
    const inst = instanceStoreRef.current[d.instanceId];
    if (!inst) return null;

    const task = tasks.find(t => t.taskId === inst.taskId);

    return (
      <SortableItem
        id={`overlay-${d.instanceId}`}
        origin={d.origin}
        type={d.type}
        instanceId={d.instanceId}
        label={task?.label}
        taskId={inst.taskId}
      />
    );
  };

  // ===============================================================
  // PROVIDER + UI
  // ===============================================================
  return (
    <ScheduleContext.Provider
      value={{
        tasks,
        setTasks,
        scheduleState,
        setScheduleState,
        panels,
        setPanels,
        instanceStoreRef,
      }}
    >
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
            zIndex: 5000,
          }}
        >
          <Textfield
            label="Rows"
            type="number"
            min="1"
            value={rows}
            onChange={(e) => setRows(+e.target.value || 1)}
          />
          <Textfield
            label="Columns"
            type="number"
            min="1"
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

        {/* GRID */}
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
