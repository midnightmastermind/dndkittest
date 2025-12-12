import { ACTIONS } from "./actions";

function arrToObj(arr, key = "id") {
  const obj = {};
  arr.forEach((item) => (obj[item[key]] = item));
  return obj;
}

export function masterReducer(state, action) {
  switch (action.type) {

    // ------------------------------
    // FULL HYDRATION (legacy)
    // ------------------------------
    case ACTIONS.HYDRATE: {
      const { gridId, instances, containers, panels, grid } = action.payload;

      const instMap = {};
      instances.forEach((i) => (instMap[i.instanceId] = i));

      const contMap = {};
      containers.forEach((c) => (contMap[c.containerId] = [...c.items]));

      return {
        ...state,
        gridId,
        instances: instMap,
        containers: contMap,
        panels: panels || [],
        grid,
        hydrated: true
      };
    }

    // ------------------------------
    // NEW FULL STATE FROM SERVER
    // ------------------------------
    case ACTIONS.FULL_STATE: {
      const {
        gridId,
        instances,
        containers,
        panels,
        grid,
        grids: availableGrids = [],   // 👈 comes from server
      } = action.payload;

      return {
        ...state,
        gridId,
        availableGrids,                // 🔥 store for toolbar select
        instances: arrToObj(instances, "instanceId"),
        containers: containers.reduce((acc, c) => {
          acc[c.containerId] = c.items;
          return acc;
        }, {}),
        panels,
        grid
      };
    }


    // ------------------------------
    // STORE GRID ID LOCALLY
    // ------------------------------
    case ACTIONS.SET_GRID_ID: {
      return {
        ...state,
        gridId: action.payload
      };
    }

    // ------------------------------
    // INSTANCE CRUD
    // ------------------------------
    case ACTIONS.CREATE_INSTANCE: {
      const inst = action.payload;
      return {
        ...state,
        instances: {
          ...state.instances,
          [inst.instanceId]: inst
        }
      };
    }

    case ACTIONS.UPDATE_INSTANCE: {
      const inst = action.payload;
      return {
        ...state,
        instances: {
          ...state.instances,
          [inst.instanceId]: inst
        }
      };
    }

    case ACTIONS.DELETE_INSTANCE: {
      const id = action.payload;

      const newInst = { ...state.instances };
      delete newInst[id];

      const newContainers = {};
      for (const [cid, arr] of Object.entries(state.containers)) {
        newContainers[cid] = arr.filter((x) => x !== id);
      }

      return {
        ...state,
        instances: newInst,
        containers: newContainers
      };
    }

    // ------------------------------
    // CONTAINERS
    // ------------------------------
    case ACTIONS.UPDATE_CONTAINER: {
      const { containerId, items } = action.payload;
      return {
        ...state,
        containers: {
          ...state.containers,
          [containerId]: [...items]
        }
      };
    }

    // ------------------------------
    // PANELS
    // ------------------------------
    case ACTIONS.UPDATE_PANEL: {
      const updated = action.payload;
      return {
        ...state,
        panels: state.panels.map((p) =>
          p.id === updated.id ? updated : p
        )
      };
    }

    case ACTIONS.ADD_PANEL: {
      return {
        ...state,
        panels: [...state.panels, action.payload]
      };
    }

    // ------------------------------
    // GRID SIZE
    // ------------------------------
case ACTIONS.UPDATE_GRID: {
  const current = state.grid;

  // Do NOT allow update if grid hasn't been hydrated
  if (!current || !current._id) {
    console.warn("⛔ UPDATE_GRID ignored: grid not loaded yet", action.payload);
    return state;
  }

  const nextGrid = {
    ...current,
    ...action.payload
  };

  let nextAvailableGrids = state.availableGrids || [];

  // 🔥 If we got a name change, mirror it into availableGrids
  if (action.payload.name !== undefined) {
    const currentGridId = current._id?.toString?.() || state.gridId;

    nextAvailableGrids = nextAvailableGrids.map((g) =>
      g.id === currentGridId ? { ...g, name: action.payload.name } : g
    );
  }

  return {
    ...state,
    grid: nextGrid,
    availableGrids: nextAvailableGrids
  };
}

    case ACTIONS.SET_USER_ID: {
      return {
        ...state,
        userId: action.payload
      };
    }

    default:
      return state;
  }
}
