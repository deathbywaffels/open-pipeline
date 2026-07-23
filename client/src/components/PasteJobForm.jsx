import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardPaste, Sparkles } from "lucide-react";
import { Card } from "./ui/Card.jsx";
import { TextField } from "./ui/TextField.jsx";
import { Button } from "./ui/Button.jsx";
import { aiHeaders, hasApiKey } from "../lib/aiSettings.js";

const initialState = {
  title: "",
  company: "",
  description: "",
  sourceUrl: "",
  locationText: "",
  requiredSkillsText: "",
};

export function PasteJobForm({ onCreated }) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [rawText, setRawText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [aiError, setAiError] = useState(null);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleExtract() {
    if (!rawText.trim()) return;
    setAiError(null);
    setExtracting(true);

    try {
      const res = await fetch("/api/ai/extract-job", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...aiHeaders() },
        credentials: "include",
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");

      setForm((f) => ({
        ...f,
        title: data.title || f.title,
        company: data.company || f.company,
        description: data.description || f.description,
        locationText: data.locationText || f.locationText,
        requiredSkillsText: data.requiredSkills?.length
          ? data.requiredSkills.join(", ")
          : f.requiredSkillsText,
      }));
    } catch (err) {
      setAiError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const requiredSkills = form.requiredSkillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/job-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          company: form.company,
          description: form.description,
          sourceUrl: form.sourceUrl,
          locationText: form.locationText || undefined,
          requiredSkills,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save job");

      setForm(initialState);
      onCreated?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card as="form" onSubmit={handleSubmit}>
      <h2 className="mb-4 flex items-center gap-2 font-extrabold text-slate-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
          <ClipboardPaste className="h-4 w-4" />
        </span>
        Paste a job
      </h2>

      {hasApiKey() ? (
        <div className="mb-5 rounded-2xl border border-dashed border-accent-400/60 bg-accent-300/10 p-4">
          <TextField
            label="Paste raw job text (optional)"
            as="textarea"
            rows={4}
            placeholder="Paste the whole job ad here and let AI fill in the fields below…"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            className="mt-2 !py-2 !text-xs"
            disabled={extracting || !rawText.trim()}
            onClick={handleExtract}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {extracting ? "Extracting…" : "Extract with AI"}
          </Button>
          {aiError && (
            <p
              role="alert"
              className="mt-2 text-xs font-semibold text-danger-600"
            >
              {aiError}
            </p>
          )}
        </div>
      ) : (
        <p className="mb-5 text-xs text-slate-400">
          <Link
            to="/settings"
            className="font-semibold text-brand-600 underline"
          >
            Add an Anthropic API key in Settings
          </Link>{" "}
          to auto-fill this form from pasted text.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Title"
          required
          value={form.title}
          onChange={update("title")}
        />
        <TextField
          label="Company"
          required
          value={form.company}
          onChange={update("company")}
        />
        <TextField
          label="Job link"
          type="url"
          required
          value={form.sourceUrl}
          onChange={update("sourceUrl")}
        />
        <TextField
          label="Location (optional)"
          value={form.locationText}
          onChange={update("locationText")}
          placeholder="City, Country"
        />
        <div className="sm:col-span-2">
          <TextField
            label="Required skills (comma-separated, optional)"
            value={form.requiredSkillsText}
            onChange={update("requiredSkillsText")}
            placeholder="Java, PhD"
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            label="Description"
            as="textarea"
            required
            rows={5}
            value={form.description}
            onChange={update("description")}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="mt-5 w-full">
        {submitting ? "Saving…" : "Save job"}
      </Button>
    </Card>
  );
}
