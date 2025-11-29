import React from "react";
import { token } from "@atlaskit/tokens";

/**
 * This clone mirrors the panel's FR-based grid area.
 * It appears during drag and disappears on drop.
 */
export default function PanelClone({ panel }) {
  if (!panel) return null;

  const gridArea = `${panel.row + 1} / ${panel.col + 1} /
                    ${panel.row + panel.height + 1} /
                    ${panel.col + panel.width + 1}`;

  return (
    <div
      style={{
        gridArea,
        background: token("elevation.surface.overlay", "rgba(30,30,30,0.85)"),
        borderRadius: 8,
        border: "1px solid #AAA",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        overflow: "hidden",
        position: "relative",
        pointerEvents: "none",
        userSelect: "none",
        width: "100%",
        height: "100%",
      }}
    >
      {/* HEADER (clone) */}
      <div
        style={{
          background: "#C8D1DE",
          padding: "6px 12px",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          fontWeight: 600,
          opacity: 0.9,
          userSelect: "none",
        }}
      >
        ☰ Panel (dragging)
      </div>

      {/* Body */}
      <div style={{ padding: 12, color: "white", opacity: 0.75 }}>
        Preview
      </div>
    </div>
  );
}
