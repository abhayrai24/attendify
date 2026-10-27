import { defaultState, sanitizeState } from "../lib/storage.js";

export const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function setMark(marks, date, period, status) {
  const day = { ...(marks[date] || {}) };
  if (status) day[period] = status;
  else delete day[period];

  const next = { ...marks };
  if (Object.keys(day).length) next[date] = day;
  else delete next[date];
  return next;
}

const updateById = (list, id, patch) =>
  list.map((item) => (item.id === id ? { ...item, ...patch } : item));

export function reducer(state, action) {
  switch (action.type) {
    case "replace":
      return sanitizeState(action.state);
    case "reset":
      return defaultState();

    // ---- attendance
    case "mark":
      return { ...state, marks: setMark(state.marks, action.date, action.period, action.status) };
    case "markDay": {
      let marks = state.marks;
      for (let p = 0; p < action.periods; p += 1) {
        marks = setMark(marks, action.date, p, action.status);
      }
      return { ...state, marks };
    }

    // ---- ERP workbook import
    case "importErp":
      return sanitizeState({ ...state, erpImport: action.erpImport });
    case "clearErpImport":
      return { ...state, erpImport: null };

    // ---- settings
    case "settings":
      return sanitizeState({ ...state, settings: { ...state.settings, ...action.patch } });
    case "addHoliday":
      return { ...state, customHolidays: { ...state.customHolidays, [action.date]: action.name } };
    case "removeHoliday": {
      const customHolidays = { ...state.customHolidays };
      delete customHolidays[action.date];
      return { ...state, customHolidays };
    }

    // ---- planner
    case "planUntil":
      return { ...state, planner: { ...state.planner, until: action.date } };
    case "addPlannedAbsence":
      return {
        ...state,
        planner: {
          ...state.planner,
          absentDates: [...new Set([...state.planner.absentDates, action.date])].sort(),
        },
      };
    case "removePlannedAbsence":
      return {
        ...state,
        planner: {
          ...state.planner,
          absentDates: state.planner.absentDates.filter((d) => d !== action.date),
        },
      };
    case "clearPlanner":
      return { ...state, planner: { until: "", absentDates: [] } };

    // ---- generic collections (assignments, studyTasks, reminders)
    case "addItem":
      return { ...state, [action.collection]: [...state[action.collection], { id: newId(), ...action.item }] };
    case "updateItem":
      return { ...state, [action.collection]: updateById(state[action.collection], action.id, action.patch) };
    case "removeItem":
      return { ...state, [action.collection]: state[action.collection].filter((i) => i.id !== action.id) };

    default:
      return state;
  }
}
