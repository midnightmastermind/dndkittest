import React from "react";
import { token } from "@atlaskit/tokens";

/**
 * Clone used inside DragOverlay.
 * Must NEVER use gridArea — it must be absolutely positioned.
 */
export default function PanelClone({ panel, transform }) {
  if (!panel) return null;

  return (
    <div
      style={{
        position: "absolute",
        pointerEvents: "none",      // <--- required
        userSelect: "none",
        zIndex: 9999,

        // transform from @dnd-kit DragOverlay
        transform,

        width: `calc(${panel.width} * 1fr)`,   // You may swap with px (recommended)
        height: `calc(${panel.height} * 1fr)`,

        background: token("elevation.surface.overlay", "rgba(30,30,30,0.85)"),
        borderRadius: 8,
        border: "1px solid #AAA",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#C8D1DE",
          padding: "6px 12px",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          fontWeight: 600,
          opacity: 0.9,
        }}
      >
        ☰ Panel (dragging)
      </div>

      <div style={{ padding: 12, color: "white", opacity: 0.75 }}>
        Preview
      </div>
    </div>
  );
}
