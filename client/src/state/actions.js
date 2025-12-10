export const ACTIONS = {
  HYDRATE: "HYDRATE",
  FULL_STATE: "FULL_STATE",

  CREATE_INSTANCE: "CREATE_INSTANCE",
  UPDATE_INSTANCE: "UPDATE_INSTANCE",
  DELETE_INSTANCE: "DELETE_INSTANCE",

  UPDATE_CONTAINER: "UPDATE_CONTAINER",

  UPDATE_PANEL: "UPDATE_PANEL",
  ADD_PANEL: "ADD_PANEL",

  UPDATE_GRID: "UPDATE_GRID",
  SET_GRID: "SET_GRID",
  SET_GRID_ID: "SET_GRID_ID",   
  SET_USER_ID: "SET_USER_ID"

};

// Action creators
export const hydrate = (payload) => ({ type: ACTIONS.HYDRATE, payload });

export const createInstance = (instance) => ({
  type: ACTIONS.CREATE_INSTANCE,
  payload: instance
});

export const updateInstance = (instance) => ({
  type: ACTIONS.UPDATE_INSTANCE,
  payload: instance
});

export const deleteInstance = (instanceId) => ({
  type: ACTIONS.DELETE_INSTANCE,
  payload: instanceId
});

export const updateContainer = (payload) => ({
  type: ACTIONS.UPDATE_CONTAINER,
  payload
});

export const updatePanel = (panel) => ({
  type: ACTIONS.UPDATE_PANEL,
  payload: panel
});

export const addPanel = (panel) => ({
  type: ACTIONS.ADD_PANEL,
  payload: panel
});

export const updateGrid = (grid) => ({
  type: ACTIONS.UPDATE_GRID,
  payload: grid
});

export const setGridId = (gridId) => ({
  type: ACTIONS.SET_GRID_ID,
  payload: gridId
});
export const setUserId = (id) => ({
  type: ACTIONS.SET_USER_ID,
  payload: id
});