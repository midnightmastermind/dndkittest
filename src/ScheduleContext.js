// ScheduleContext.js — FINAL VERSION for new architecture
import { createContext } from "react";

export const ScheduleContext = createContext({
    panels: [],
    setPanels: () => { },

    // Master instance store (NOT reactive)
    instanceStoreRef: { current: {} },

    // Reactive container → instanceIds state
    // Example:
    // {
    //    "taskbox-123": ["inst1", "inst2"],
    //    "08:00": ["inst3"]
    // }
    containerState: {},

    setContainerState: () => { },

    editItem: () => { },
    deleteItem: () => { },
    anyDragging: false
});
