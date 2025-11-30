import React, { useState } from "react";
import Button from "@atlaskit/button";
import Textfield from "@atlaskit/textfield";
import Grid from "./Grid";

const App = () => {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(3);
  const [snapMode, setSnapMode] = useState(true);
  const [panels, setPanels] = useState([]);
  const [showToolbar, setShowToolbar] = useState(false);

  const [tasks, setTasks] = useState([
    { id: "task-1", label: "Item 1" },
    { id: "task-2", label: "Item 2" },
    { id: "task-3", label: "Item 3" }
  ]);

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

  const addPanel = () => {
    const spot = findNextSpot();
    if (!spot) return alert("Grid full");

    // Create UNIQUE task IDs for THIS panel only
    const uniqueTasks = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID()
    ];

    // Register these tasks in the GLOBAL task registry
    setTasks(prev => [
      ...prev,
      { id: uniqueTasks[0], label: "Item A" },
      { id: uniqueTasks[1], label: "Item B" },
      { id: uniqueTasks[2], label: "Item C" }
    ]);

    // Panel gets its own isolated task list
    setPanels(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "taskbox",
        tasks: uniqueTasks,   // 🔥 PRIVATE TASKS
        row: spot.row,
        col: spot.col,
        width: 1,
        height: 1
      }
    ]);
  };


  return (
    <div style={{ background: "#1D2125", height: "100vh", overflow: "hidden", position: "relative" }}>
      <div
        onMouseLeave={() => setShowToolbar(false)}
        style={{
          position: "absolute",
          top: showToolbar ? 0 : "-60px",
          left: 0,
          width: "100%",
          height: 60,
          background: "#1C1F26",
          borderBottom: "1px solid #444",
          display: "flex",
          alignItems: "center",
          gap: 10,
          transition: "top 200ms ease",
          zIndex: 999999,
        }}
      >
        <Textfield
          label="Rows"
          type="number"
          min="1"
          value={rows}
          onChange={(e) => setRows(parseInt(e.target.value || "1", 10))}
        />

        <Textfield
          label="Columns"
          type="number"
          min="1"
          value={cols}
          onChange={(e) => setCols(parseInt(e.target.value || "1", 10))}
        />

        <Button appearance="primary" onClick={addPanel}>
          Add Panel
        </Button>

        <Button appearance="warning" onClick={() => setSnapMode((v) => !v)}>
          {snapMode ? "Switch to Free Drag" : "Switch to Snap Mode"}
        </Button>
      </div>

      <Grid
        rows={rows}
        cols={cols}
        panels={panels}
        setPanels={setPanels}
        tasks={tasks}
        setTasks={setTasks}
        snapMode={snapMode}
        toggleToolbar={() => setShowToolbar(true)}
      />
    </div>
  );
};

export default App;
