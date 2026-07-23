import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { FileText, Upload, Download, Sparkles } from "lucide-react";
import { Card } from "./ui/Card.jsx";
import { aiHeaders, hasApiKey } from "../lib/aiSettings.js";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CVUpload({ onSkillsAdded }) {
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [extractingId, setExtractingId] = useState(null);
  const [extractStatus, setExtractStatus] = useState(null);

  function loadCVs() {
    return fetch("/api/cv", { credentials: "include" })
      .then((res) => res.json())
      .then(setCvs)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCVs();
  }, []);

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/cv", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload CV");

      setCvs((c) => [data, ...c]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleExtractSkills(cv) {
    setExtractStatus(null);
    setExtractingId(cv.id);

    try {
      const res = await fetch(`/api/ai/extract-cv-skills/${cv.id}`, {
        method: "POST",
        headers: aiHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");

      const results = await Promise.all(
        data.skills.map((name) =>
          fetch("/api/skills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name }),
          }),
        ),
      );
      const addedCount = results.filter((r) => r.status === 201).length;

      setExtractStatus({
        type: "success",
        message:
          addedCount > 0
            ? `Added ${addedCount} new skill${addedCount === 1 ? "" : "s"} from ${cv.filename}.`
            : `No new skills found in ${cv.filename} (already in your profile).`,
      });
      if (addedCount > 0) onSkillsAdded?.();
    } catch (err) {
      setExtractStatus({ type: "error", message: err.message });
    } finally {
      setExtractingId(null);
    }
  }

  return (
    <Card delay={0.05}>
      <h2 className="mb-4 flex items-center gap-2 font-extrabold text-slate-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-300/30 text-accent-600">
          <FileText className="h-4 w-4" />
        </span>
        Your CVs
      </h2>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : cvs.length === 0 ? (
        <p className="mb-3 text-sm text-slate-500">No CVs uploaded yet.</p>
      ) : (
        <ul className="mb-4 grid gap-2">
          <AnimatePresence>
            {cvs.map((cv) => (
              <motion.li
                key={cv.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <FileText className="h-4 w-4 text-slate-400" />
                  {cv.filename}
                  <span className="text-xs text-slate-400">
                    ({formatSize(cv.sizeBytes)})
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {hasApiKey() && cv.mimeType !== "application/msword" && (
                    <button
                      type="button"
                      onClick={() => handleExtractSkills(cv)}
                      disabled={extractingId === cv.id}
                      className="flex items-center gap-1 font-semibold text-accent-600 underline disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {extractingId === cv.id
                        ? "Extracting…"
                        : "Extract skills"}
                    </button>
                  )}
                  <a
                    href={`/api/cv/${cv.id}/download`}
                    className="flex items-center gap-1 font-semibold text-brand-600 underline"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {!hasApiKey() && cvs.length > 0 && (
        <p className="mb-3 text-xs text-slate-400">
          <Link
            to="/settings"
            className="font-semibold text-brand-600 underline"
          >
            Add an Anthropic API key in Settings
          </Link>{" "}
          to extract skills from a CV automatically.
        </p>
      )}

      {extractStatus && (
        <p
          role={extractStatus.type === "error" ? "alert" : "status"}
          className={`mb-2 text-sm font-semibold ${
            extractStatus.type === "error"
              ? "text-danger-600"
              : "text-success-600"
          }`}
        >
          {extractStatus.message}
        </p>
      )}

      {error && (
        <p role="alert" className="mb-2 text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}

      <motion.label
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex w-fit cursor-pointer items-center gap-1 rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-accent-500/25"
      >
        <Upload className="h-4 w-4" />
        {uploading ? "Uploading…" : "Upload CV"}
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </motion.label>
    </Card>
  );
}
