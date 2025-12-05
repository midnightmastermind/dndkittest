import { createContext } from "react";

export const ScheduleContext = createContext({
  tasks: [],
  setTasks: () => {},

  panels: [],
  setPanels: () => {},

  scheduleState: {},
  setScheduleState: () => {},

  instanceStoreRef: { current: {} }, // <-- IMPORTANT
});
