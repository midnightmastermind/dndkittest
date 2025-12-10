// useBoardState.js
import { useReducer } from "react";
import { initialState } from "./initialState";
import { masterReducer } from "./masterReducer";

export function useBoardState() {
const [state, dispatch] = useReducer(masterReducer, initialState, (init) => init);
  return { state, dispatch };
}
