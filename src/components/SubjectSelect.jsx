import { SUBJECTS } from "../config/academic.js";

export function SubjectSelect({ value, onChange, allowNone = true, label = "Subject" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {allowNone && <option value="">General</option>}
        {SUBJECTS.map((s) => (
          <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
        ))}
      </select>
    </label>
  );
}
