import { useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { Card } from "./ui/Card.jsx";
import { TextField } from "./ui/TextField.jsx";
import { Button } from "./ui/Button.jsx";

const initialState = {
  title: "",
  description: "",
  locationText: "",
  requiredSkillsText: "",
};

export function PastePostingForm({ onCreated }) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
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
      const res = await fetch("/api/job-postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          locationText: form.locationText || undefined,
          requiredSkills,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save posting");

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
        Post a job
      </h2>

      <div className="grid gap-4">
        <TextField
          label="Title"
          required
          value={form.title}
          onChange={update("title")}
        />
        <TextField
          label="Location (optional)"
          value={form.locationText}
          onChange={update("locationText")}
          placeholder="City, Country"
        />
        <TextField
          label="Required skills (comma-separated, optional)"
          value={form.requiredSkillsText}
          onChange={update("requiredSkillsText")}
          placeholder="Java, PhD"
        />
        <TextField
          label="Description"
          as="textarea"
          required
          rows={5}
          value={form.description}
          onChange={update("description")}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="mt-5 w-full">
        {submitting ? "Saving…" : "Save posting"}
      </Button>
    </Card>
  );
}
