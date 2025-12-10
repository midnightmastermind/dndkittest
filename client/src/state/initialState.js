export const initialState = {
    userId: localStorage.getItem("daytrack-userId") || null,  // 🔥,
    gridId: null,        // <-- NEW: active grid ID
    grid: {},
    instances: {},
    containers: {},
    panels: [],
    hydrated: false
};
