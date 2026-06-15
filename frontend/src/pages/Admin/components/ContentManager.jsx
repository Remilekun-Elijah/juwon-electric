/* eslint-disable react/prop-types */
import { Add, Delete, Edit } from "@mui/icons-material";
import { useMemo, useState } from "react";
import { adminRequest } from "../../../utils/api";
import {
  emptyPackage,
  emptyPortfolio,
  emptyService,
  packageTypeOptions,
} from "../constants/adminConstants";
import { PackageForm, PortfolioForm, ServiceForm } from "./ContentForms";
import { SelectField } from "./FormControls";

const getInitialModel = (type) =>
  type === "packages"
    ? emptyPackage
    : type === "services"
    ? emptyService
    : emptyPortfolio;

const getForm = (type) =>
  type === "packages"
    ? PackageForm
    : type === "services"
    ? ServiceForm
    : PortfolioForm;

const getItemMeta = (type, item) => {
  if (type === "packages") {
    return [
      item.type,
      item.kva ? `${item.kva}kva` : "",
      item.volt ? `${item.volt}v` : "",
    ]
      .filter(Boolean)
      .join(" • ");
  }

  return item.type || item.image;
};

const ContentManager = ({ type, data, reload }) => {
  const initial = getInitialModel(type);
  const [model, setModel] = useState(initial);
  const [editingId, setEditingId] = useState("");
  const [packageTypeFilter, setPackageTypeFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const items = type === "services" ? data.services?.offerings || [] : data[type] || [];
  const visibleItems = useMemo(() => {
    if (type !== "packages" || packageTypeFilter === "all") return items;

    return items.filter(
      (item) => item.type?.toLowerCase() === packageTypeFilter.toLowerCase()
    );
  }, [items, packageTypeFilter, type]);
  const Form = getForm(type);
  const typeFilterOptions = [
    { value: "all", label: "All package types" },
    ...packageTypeOptions,
  ];

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await adminRequest(`/${type}${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(model),
      });
      setModel(initial);
      setEditingId("");
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await adminRequest(`/${type}/${id}`, { method: "DELETE" });
    await reload();
  };

  const edit = (item) => {
    setEditingId(item.id);
    setModel({ ...initial, ...item });
  };

  return (
    <section className="admin-workspace">
      <div className="admin-panel admin-editor">
        <div className="admin-panel-title">
          <div>
            <span>{editingId ? "Editing record" : "New record"}</span>
            <h2>{editingId ? "Edit" : "Create"} {type}</h2>
          </div>
          {editingId && (
            <button
              className="admin-ghost"
              onClick={() => {
                setEditingId("");
                setModel(initial);
              }}
            >
              <Add /> New
            </button>
          )}
        </div>
        <Form model={model} setModel={setModel} onSubmit={submit} saving={saving} />
      </div>

      <div className="admin-panel admin-index">
        <div className="admin-panel-title">
          <div>
            <span>
              {visibleItems.length} of {items.length} records
            </span>
            <h2>Existing {type}</h2>
          </div>
        </div>
        {type === "packages" && (
          <div className="admin-index-toolbar">
            <SelectField
              compact
              label="Filter by type"
              value={packageTypeFilter}
              options={typeFilterOptions}
              onChange={setPackageTypeFilter}
            />
          </div>
        )}
        <div className="admin-list">
          {visibleItems.map((item) => (
            <article key={item.id} className="admin-row">
              <button onClick={() => edit(item)}>
                <strong>{item.name || item.title}</strong>
                <span>{getItemMeta(type, item)}</span>
              </button>
              <div className="admin-row-actions">
                <button aria-label="Edit" onClick={() => edit(item)}>
                  <Edit />
                </button>
                <button aria-label="Delete" onClick={() => remove(item.id)}>
                  <Delete />
                </button>
              </div>
            </article>
          ))}
          {!visibleItems.length && (
            <p className="admin-empty">
              {items.length ? "No packages match this type." : "No records yet."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default ContentManager;
