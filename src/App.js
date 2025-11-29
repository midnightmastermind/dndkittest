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

    setPanels((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        row: spot.row,
        col: spot.col,
        width: 1,
        height: 1,
        x: spot.col * 140,
        y: spot.row * 140,
      },
    ]);
  };

  return (
    <div style={{ background: "#1D2125", height: "100vh", overflow: "hidden", position: "relative" }}>
      {/* TOOLBAR (slide-down) */}
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
        snapMode={snapMode}
        toggleToolbar={() => setShowToolbar(true)}
      />
    </div>
  );
};

export default App;
