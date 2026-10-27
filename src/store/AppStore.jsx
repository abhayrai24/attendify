import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  buildAllRecords,
  findUnmarkedDays,
  latestRecordDate,
  makeContext,
  meetsTarget,
  overallFromSubjects,
  summarizeSubjects,
} from "../lib/attendance.js";
import { DEFAULT_HOLIDAYS } from "../config/academic.js";
import { BUILTIN_ERP, makeErpDataset } from "../lib/erpData.js";
import { STORAGE_KEY, loadState, saveState } from "../lib/storage.js";
import { reducer } from "./reducer.js";
import { DispatchContext, StateContext } from "./context.js";
import { useToday } from "../hooks/useToday.js";


function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => { throw new Error("unavailable"); } };
  }
}

export function AppStoreProvider({ children }) {
  const [initial] = useState(() => loadState(safeStorage()));
  const [state, dispatch] = useReducer(reducer, initial.state);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  const skipNextSave = useRef(false);
  const today = useToday();

  // Persist every change.
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (!saveState(safeStorage(), state)) {
      queueMicrotask(() => {
        setStorageWarning("Browser storage is full or unavailable; recent changes may not be saved.");
      });
    }
  }, [state]);

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      skipNextSave.current = true;
      dispatch({ type: "replace", state: JSON.parse(event.newValue) });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const derived = useMemo(() => {
    const holidays = { ...DEFAULT_HOLIDAYS, ...state.customHolidays };
    const imported = state.erpImport;
    const erp = imported
      ? makeErpDataset({ ...imported, imported: true })
      : BUILTIN_ERP;
    const ctx = makeContext({ marks: state.marks, holidays, erpDates: erp.dates });
    const records = buildAllRecords(state.marks, erp);
    const subjects = summarizeSubjects(records, erp.subjects);
    const overall = overallFromSubjects(subjects);
    const { target } = state.settings;

    return {
      erp,
      holidays,
      ctx,
      records,
      subjects,
      overall,
      eligible: meetsTarget(overall.attended, overall.total, target),
      latestDate: latestRecordDate(records, erp.lastDate),
      unmarkedDays: findUnmarkedDays(today, ctx, erp.lastDate),
    };
  }, [state.marks, state.customHolidays, state.settings, state.erpImport, today]);

  const value = useMemo(
    () => ({ ...state, ...derived, today, storageWarning, dismissStorageWarning: () => setStorageWarning(null) }),
    [state, derived, today, storageWarning],
  );

  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={value}>{children}</StateContext.Provider>
    </DispatchContext.Provider>
  );
}
