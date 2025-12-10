// ScheduleContext.js — UPDATED FOR NEW ARCHITECTURE
import { createContext } from "react";

export const ScheduleContext = createContext({
    state: {
        panels: [],
        containers: {},
        instances: {},
        grid: null,
        gridId: null,
        hydrated: false
    },

    dispatch: () => {},

    // Non-reactive but required for fast instance lookup
    instanceStoreRef: { current: {} },

    // Optional helpers (UI actions)
    editItem: () => {},
    deleteItem: () => {},
    anyDragging: false,
    previewContainersRef: { current: {} }

});
