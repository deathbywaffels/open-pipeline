import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion } from "motion/react";
import { AlertTriangle, Paperclip, Upload } from "lucide-react";
import {
  STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
} from "../lib/applicationStages.js";

const BORDER_CLASSES = {
  brand: "border-l-brand-500",
  accent: "border-l-accent-500",
  success: "border-l-success-500",
  slate: "border-l-slate-300",
};

export function ApplicationCard({ application, onStageChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: application.id,
    });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: isDragging ? 10 : undefined,
      }
    : undefined;

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `/api/applications/${application.id}/rejection-letter`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to upload rejection letter");

      setUploadedFilename(data.filename);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`rounded-2xl border-l-4 bg-white p-3 shadow-sm ${BORDER_CLASSES[STAGE_COLORS[application.stage]]}`}
    >
      <div {...listeners} {...attributes} className="cursor-grab">
        <p className="font-bold text-slate-800">
          {application.jobListing.title}
        </p>
        <p className="text-sm text-slate-500">
          {application.jobListing.company}
        </p>
      </div>

      {application.isStale && (
        <motion.p
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="mt-1 flex items-center gap-1 text-xs font-bold text-accent-600"
        >
          <AlertTriangle className="h-3 w-3" /> No response in 14+ days
        </motion.p>
      )}

      <label className="mt-2 block text-xs font-semibold text-slate-500">
        Stage
        <select
          value={application.stage}
          onChange={(e) => onStageChange(application.id, e.target.value)}
          className="mt-1 w-full rounded-xl border-2 border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-400"
        >
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      </label>

      {application.stage === "REJECTED" && (
        <div className="mt-2">
          {uploadedFilename ? (
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Paperclip className="h-3 w-3" /> {uploadedFilename}
            </p>
          ) : (
            <motion.label
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex w-fit cursor-pointer items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
            >
              <Upload className="h-3 w-3" />
              {uploading ? "Uploading…" : "Upload rejection letter"}
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
            </motion.label>
          )}
          {uploadError && (
            <p role="alert" className="mt-1 text-xs text-danger-600">
              {uploadError}
            </p>
          )}
        </div>
      )}
    </motion.li>
  );
}
