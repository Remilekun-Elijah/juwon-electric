/* eslint-disable react/prop-types */
import { Save } from "@mui/icons-material";
import { packageTypeOptions } from "../constants/adminConstants";
import { jsonValue } from "../utils/adminFormatters";
import { Field, SelectField, Toggle } from "./FormControls";

export const PackageForm = ({ model, setModel, onSubmit, saving }) => (
  <form onSubmit={onSubmit} className="admin-form">
    <div className="admin-form-grid">
      <Field label="Name" value={model.name} onChange={(value) => setModel({ ...model, name: value })} />
      <SelectField
        label="Type"
        value={model.type}
        options={packageTypeOptions}
        onChange={(value) => setModel({ ...model, type: value })}
      />
      <Field label="KVA" type="number" value={model.kva} onChange={(value) => setModel({ ...model, kva: value })} />
      <Field label="Volt" type="number" value={model.volt || ""} onChange={(value) => setModel({ ...model, volt: value })} />
    </div>
    <Field label="Load" textarea value={model.load} onChange={(value) => setModel({ ...model, load: value })} />
    <Field
      label="Options JSON"
      textarea
      value={jsonValue(model.options)}
      onChange={(value) => {
        try {
          setModel({ ...model, options: JSON.parse(value) });
        } catch {
          setModel({ ...model, options: value });
        }
      }}
    />
    <Toggle label="Active" checked={model.isActive} onChange={(value) => setModel({ ...model, isActive: value })} />
    <button className="admin-primary" disabled={saving}>
      <Save /> {saving ? "Saving" : "Save Package"}
    </button>
  </form>
);

export const ServiceForm = ({ model, setModel, onSubmit, saving }) => (
  <form onSubmit={onSubmit} className="admin-form">
    <div className="admin-form-grid">
      <Field label="Title" value={model.title} onChange={(value) => setModel({ ...model, title: value })} />
      <Field label="Image path" value={model.image} onChange={(value) => setModel({ ...model, image: value })} />
      <Field label="CTA label" value={model.ctaLabel} onChange={(value) => setModel({ ...model, ctaLabel: value })} />
      <Field label="CTA URL" value={model.ctaUrl} onChange={(value) => setModel({ ...model, ctaUrl: value })} />
    </div>
    <Field label="Subtitle" textarea value={model.subtitle} onChange={(value) => setModel({ ...model, subtitle: value })} />
    <Toggle label="Active" checked={model.isActive} onChange={(value) => setModel({ ...model, isActive: value })} />
    <button className="admin-primary" disabled={saving}>
      <Save /> {saving ? "Saving" : "Save Service"}
    </button>
  </form>
);

export const PortfolioForm = ({ model, setModel, onSubmit, saving }) => (
  <form onSubmit={onSubmit} className="admin-form">
    <div className="admin-form-grid">
      <Field label="Name" value={model.name} onChange={(value) => setModel({ ...model, name: value })} />
      <Field label="Image path" value={model.image} onChange={(value) => setModel({ ...model, image: value })} />
      <Field label="External link" value={model.link} onChange={(value) => setModel({ ...model, link: value })} />
    </div>
    <div className="admin-toggle-row">
      <Toggle label="Featured on home" checked={model.featured} onChange={(value) => setModel({ ...model, featured: value })} />
      <Toggle label="Mobile visible" checked={model.mobile} onChange={(value) => setModel({ ...model, mobile: value })} />
      <Toggle label="Active" checked={model.isActive} onChange={(value) => setModel({ ...model, isActive: value })} />
    </div>
    <button className="admin-primary" disabled={saving}>
      <Save /> {saving ? "Saving" : "Save Portfolio Item"}
    </button>
  </form>
);
