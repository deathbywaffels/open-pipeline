import { useEffect, useState } from "react";
import { DndContext, useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "motion/react";
import {
  STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
  groupApplicationsByStage,
} from "../lib/applicationStages.js";
import { ApplicationCard } from "./ApplicationCard.jsx";

const HEADER_CLASSES = {
  brand: "bg-brand-100 text-brand-700",
  accent: "bg-accent-300/30 text-accent-600",
  success: "bg-success-100 text-success-600",
  slate: "bg-slate-100 text-slate-500",
};

function Column({ stage, applications, onStageChange }) {
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
        {STAGE_LABELS[stage]} · {applications.length}
      </h2>
      <ul className="flex flex-col gap-2">
        <AnimatePresence>
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onStageChange={onStageChange}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

export function KanbanBoard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/applications", { credentials: "include" })
      .then((res) => res.json())
      .then(setApplications)
      .finally(() => setLoading(false));
  }, []);

  async function changeStage(applicationId, toStage) {
    setError(null);
    const previous = applications;
    setApplications((apps) =>
      apps.map((a) => (a.id === applicationId ? { ...a, stage: toStage } : a)),
    );

    try {
      const res = await fetch(`/api/applications/${applicationId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toStage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to move application");

      setApplications((apps) =>
        apps.map((a) => (a.id === applicationId ? data : a)),
      );
    } catch (err) {
      setError(err.message);
      setApplications(previous);
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    const applicationId = active.id;
    const toStage = over.id;
    changeStage(applicationId, toStage);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  const groups = groupApplicationsByStage(applications);

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
              applications={groups[stage]}
              onStageChange={changeStage}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
