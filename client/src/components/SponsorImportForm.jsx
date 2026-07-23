import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Card } from "./ui/Card.jsx";
import { TextField } from "./ui/TextField.jsx";
import { Button } from "./ui/Button.jsx";

export function SponsorImportForm({ onImported }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/sponsor-companies/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import companies");

      setResult(data);
      setText("");
      onImported?.();
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
          <ClipboardList className="h-4 w-4" />
        </span>
        Add sponsor companies
      </h2>

      <TextField
        label="Paste company names (one per line, or comma-separated)"
        as="textarea"
        rows={6}
        placeholder={"Acme B.V.\nGlobex NV\nInitech"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}
      {result && (
        <p className="mt-3 text-sm font-semibold text-success-600">
          Added {result.created} new compan
          {result.created === 1 ? "y" : "ies"}
          {result.skippedExisting > 0
            ? `, skipped ${result.skippedExisting} already on your list`
            : ""}
          .
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting || !text.trim()}
        className="mt-4 w-full"
      >
        {submitting ? "Importing…" : "Import"}
      </Button>
    </Card>
  );
}
