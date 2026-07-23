import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion } from "motion/react";
import {
  STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
} from "../lib/candidateLeadStages.js";
import { TextField } from "./ui/TextField.jsx";

const BORDER_CLASSES = {
  brand: "border-l-brand-500",
  accent: "border-l-accent-500",
  success: "border-l-success-500",
  slate: "border-l-slate-300",
};

export function CandidateLeadCard({ lead, onStageChange, onNotesChange }) {
  const [notes, setNotes] = useState(lead.notes || "");

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: lead.id,
    });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: isDragging ? 10 : undefined,
      }
    : undefined;

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`rounded-2xl border-l-4 bg-white p-3 shadow-sm ${BORDER_CLASSES[STAGE_COLORS[lead.stage]]}`}
    >
      <div {...listeners} {...attributes} className="cursor-grab">
        <p className="font-bold text-slate-800">{lead.name}</p>
        <p className="text-sm text-slate-500">{lead.jobPosting.title}</p>
      </div>

      <label className="mt-2 block text-xs font-semibold text-slate-500">
        Stage
        <select
          value={lead.stage}
          onChange={(e) => onStageChange(lead.id, e.target.value)}
          className="mt-1 w-full rounded-xl border-2 border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-400"
        >
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-2">
        <TextField
          label="Notes"
          as="textarea"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== (lead.notes || "")) {
              onNotesChange(lead.id, notes);
            }
          }}
          placeholder="e.g. Strong React background, referred by..."
        />
      </div>
    </motion.li>
  );
}
