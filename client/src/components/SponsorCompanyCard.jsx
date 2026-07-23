import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Trash2 } from "lucide-react";
import { Card } from "./ui/Card.jsx";
import { TextField } from "./ui/TextField.jsx";

export const STATUS_LABELS = {
  NOT_STARTED: "Not started",
  RESEARCHING: "Researching",
  APPLIED: "Applied cold",
  REJECTED: "Rejected",
};

const STATUS_BORDER = {
  NOT_STARTED: "border-l-slate-300",
  RESEARCHING: "border-l-accent-500",
  APPLIED: "border-l-brand-500",
  REJECTED: "border-l-danger-500",
};

const HIRES_IT_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
  { value: "unknown", label: "Unknown" },
];

function hiresItWorkersToValue(hiresItWorkers) {
  if (hiresItWorkers === true) return "true";
  if (hiresItWorkers === false) return "false";
  return "unknown";
}

function buildFitContext(company) {
  const lines = [`Company: ${company.name}`];
  if (company.careersUrl) lines.push(`Careers page: ${company.careersUrl}`);
  if (company.notes) lines.push(`Notes: ${company.notes}`);
  return lines.join("\n");
}

export function SponsorCompanyCard({ company, onUpdate, onDelete, delay = 0 }) {
  const [notes, setNotes] = useState(company.notes || "");
  const [careersUrl, setCareersUrl] = useState(company.careersUrl || "");

  async function patch(fields) {
    const res = await fetch(`/api/sponsor-companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (res.ok) onUpdate?.(data);
  }

  async function handleDelete() {
    await fetch(`/api/sponsor-companies/${company.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    onDelete?.(company.id);
  }

  return (
    <Card
      as="li"
      delay={delay}
      className={`border-l-4 ${STATUS_BORDER[company.outreachStatus]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-slate-800">{company.name}</p>
          <p className="text-xs text-slate-400">{company.country}</p>
        </div>
        <button
          aria-label={`Remove ${company.name}`}
          onClick={handleDelete}
          className="text-slate-300 hover:text-danger-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <label className="mt-3 block text-xs font-semibold text-slate-500">
        Outreach status
        <select
          value={company.outreachStatus}
          onChange={(e) => patch({ outreachStatus: e.target.value })}
          className="mt-1 w-full rounded-xl border-2 border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-400"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3">
        <span className="block text-xs font-semibold text-slate-500">
          Hires IT roles?
        </span>
        <div className="mt-1 flex gap-1">
          {HIRES_IT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                patch({
                  hiresItWorkers:
                    opt.value === "unknown" ? null : opt.value === "true",
                })
              }
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                hiresItWorkersToValue(company.hiresItWorkers) === opt.value
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <TextField
          label="Careers page URL"
          type="url"
          value={careersUrl}
          onChange={(e) => setCareersUrl(e.target.value)}
          onBlur={() => {
            if (careersUrl !== (company.careersUrl || "")) {
              patch({ careersUrl });
            }
          }}
          placeholder="https://..."
        />
      </div>

      <div className="mt-3">
        <TextField
          label="Notes"
          as="textarea"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== (company.notes || "")) {
              patch({ notes });
            }
          }}
          placeholder="e.g. Does this company even hire IT roles?"
        />
      </div>

      <Link
        to="/coach"
        state={{ fitContext: buildFitContext(company) }}
        className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand-600 underline"
      >
        <Sparkles className="h-3 w-3" /> Check AI fit
      </Link>
    </Card>
  );
}
