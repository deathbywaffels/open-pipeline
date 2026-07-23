import { useEffect, useState } from "react";
import { DndContext, useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "motion/react";
import {
  STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
  groupCandidateLeadsByStage,
} from "../lib/candidateLeadStages.js";
import { CandidateLeadCard } from "./CandidateLeadCard.jsx";

const HEADER_CLASSES = {
  brand: "bg-brand-100 text-brand-700",
  accent: "bg-accent-300/30 text-accent-600",
  success: "bg-success-100 text-success-600",
  slate: "bg-slate-100 text-slate-500",
};

function Column({ stage, leads, onStageChange, onNotesChange }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const color = STAGE_COLORS[stage];

  return (
    <div
      ref={setNodeRef}
      className={`w-64 shrink-0 rounded-3xl border-2 p-3 transition-colors lg:w-72 ${
        isOver
          ? "border-brand-300 bg-brand-50/50"
          : "border-transparent bg-slate-50"
      }`}
    >
      <h2
        className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${HEADER_CLASSES[color]}`}
      >
        {STAGE_LABELS[stage]} · {leads.length}
      </h2>
      <ul className="flex flex-col gap-2">
        <AnimatePresence>
          {leads.map((lead) => (
            <CandidateLeadCard
              key={lead.id}
              lead={lead}
              onStageChange={onStageChange}
              onNotesChange={onNotesChange}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

export function EmployerKanbanBoard({ refreshKey }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/candidate-leads", { credentials: "include" })
      .then((res) => res.json())
      .then(setLeads)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function updateLead(leadId, patch) {
    setError(null);
    const previous = leads;
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, ...patch } : l)));

    try {
      const res = await fetch(`/api/candidate-leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update candidate");

      setLeads((ls) => ls.map((l) => (l.id === leadId ? data : l)));
    } catch (err) {
      setError(err.message);
      setLeads(previous);
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    updateLead(active.id, { stage: over.id });
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  const groups = groupCandidateLeadsByStage(leads);

  return (
    <div>
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          role="alert"
          className="mb-3 text-sm font-semibold text-danger-600"
        >
          {error}
        </motion.p>
      )}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              leads={groups[stage]}
              onStageChange={(id, stage) => updateLead(id, { stage })}
              onNotesChange={(id, notes) => updateLead(id, { notes })}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
