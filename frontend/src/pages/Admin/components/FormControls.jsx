/* eslint-disable react/prop-types */
export const Field = ({ label, value, onChange, type = "text", textarea = false }) => (
  <label className="admin-field">
    <span>{label}</span>
    {textarea ? (
      <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    )}
  </label>
);

export const Toggle = ({ label, checked, onChange }) => (
  <label className="admin-toggle">
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>{label}</span>
  </label>
);

export const SelectField = ({ label, value, onChange, options, compact = false, onClick }) => (
  <label className={compact ? "admin-select-field admin-select-field-compact" : "admin-select-field"}>
    {label && <span>{label}</span>}
    <span className="admin-select-wrap">
      <select
        value={value ?? ""}
        onClick={onClick}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  </label>
);
