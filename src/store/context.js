import { createContext, useContext, useMemo } from "react";

export const StateContext = createContext(null);
export const DispatchContext = createContext(null);

export function useApp() {
  const value = useContext(StateContext);
  if (!value) throw new Error("useApp must be used inside AppStoreProvider");
  return value;
}

/** Stable action helpers. */
export function useActions() {
  const dispatch = useContext(DispatchContext);
  if (!dispatch) throw new Error("useActions must be used inside AppStoreProvider");

  return useMemo(
    () => ({
      mark: (date, period, status) => dispatch({ type: "mark", date, period, status }),
      markDay: (date, periods, status) => dispatch({ type: "markDay", date, periods, status }),
      importErp: (erpImport) => dispatch({ type: "importErp", erpImport }),
      clearErpImport: () => dispatch({ type: "clearErpImport" }),
      updateSettings: (patch) => dispatch({ type: "settings", patch }),
      addHoliday: (date, name) => dispatch({ type: "addHoliday", date, name }),
      removeHoliday: (date) => dispatch({ type: "removeHoliday", date }),
      setPlanUntil: (date) => dispatch({ type: "planUntil", date }),
      addPlannedAbsence: (date) => dispatch({ type: "addPlannedAbsence", date }),
      removePlannedAbsence: (date) => dispatch({ type: "removePlannedAbsence", date }),
      clearPlanner: () => dispatch({ type: "clearPlanner" }),
      addItem: (collection, item) => dispatch({ type: "addItem", collection, item }),
      updateItem: (collection, id, patch) => dispatch({ type: "updateItem", collection, id, patch }),
      removeItem: (collection, id) => dispatch({ type: "removeItem", collection, id }),
      replaceState: (next) => dispatch({ type: "replace", state: next }),
      resetAll: () => dispatch({ type: "reset" }),
    }),
    [dispatch],
  );
}
