import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Heart,
  X,
  MapPin,
  MapPinOff,
  PartyPopper,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export function SwipeDeck() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dislikeReason, setDislikeReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [exitDirection, setExitDirection] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/job-listings?swipeStatus=PENDING", { credentials: "include" })
      .then((res) => res.json())
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  const current = jobs[0];

  async function swipe(direction, reason) {
    setError(null);
    setExitDirection(direction);

    try {
      const res = await fetch(`/api/job-listings/${current.id}/swipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ direction, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record swipe");

      setTimeout(() => {
        setJobs((j) => j.slice(1));
        setShowReasonInput(false);
        setDislikeReason("");
        setExitDirection(null);
      }, 250);
    } catch (err) {
      setError(err.message);
      setExitDirection(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <PartyPopper className="h-10 w-10 text-accent-500" />
        <p className="font-bold text-slate-700">No more jobs to review.</p>
        <p className="text-sm text-slate-400">
          Paste more jobs to keep swiping.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-[420px] lg:h-[480px]">
        <AnimatePresence>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              x:
                exitDirection === "like"
                  ? 300
                  : exitDirection === "dislike"
                    ? -300
                    : 0,
              rotate:
                exitDirection === "like"
                  ? 15
                  : exitDirection === "dislike"
                    ? -15
                    : 0,
            }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col overflow-y-auto rounded-3xl border border-slate-100 bg-white p-5 shadow-lg"
          >
            <h2 className="text-lg font-extrabold text-slate-800">
              {current.title}
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              {current.company}
            </p>

            {current.locationText && (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="h-3 w-3" /> {current.locationText}
              </p>
            )}

            {user.needsSponsorship && current.isRecognizedSponsor === false && (
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-danger-600">
                <ShieldAlert className="h-3 w-3" /> Not an IND-recognized
                sponsor
              </p>
            )}

            {current.isInDesiredLocation === false && (
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-danger-600">
                <MapPinOff className="h-3 w-3" /> Outside your desired area
              </p>
            )}

            {current.skillMatchPercent !== null && (
              <span className="mt-3 w-fit rounded-full bg-brand-100 px-3 py-1 text-sm font-extrabold text-brand-700">
                {current.skillMatchPercent}% skill match
              </span>
            )}

            {current.requiredSkills.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Requires: {current.requiredSkills.map((s) => s.name).join(", ")}
              </p>
            )}

            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
              {current.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}

      {showReasonInput ? (
        <div className="mt-4">
          <input
            autoFocus
            value={dislikeReason}
            onChange={(e) => setDislikeReason(e.target.value)}
            placeholder="Why? (optional) e.g. Requires Java"
            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
          />
          <div className="mt-2 flex gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => swipe("dislike", dislikeReason)}
              className="flex-1 rounded-2xl bg-slate-800 px-3 py-2 text-sm font-bold text-white"
            >
              Confirm
            </motion.button>
            <button
              onClick={() => setShowReasonInput(false)}
              className="rounded-2xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex justify-center gap-6">
          <motion.button
            whileHover={{ scale: 1.1, rotate: -8 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowReasonInput(true)}
            aria-label="Dislike"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-danger-500 shadow-lg ring-2 ring-danger-100"
          >
            <X className="h-7 w-7" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 8 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => swipe("like")}
            aria-label="Like"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-success-500 text-white shadow-lg shadow-success-500/30"
          >
            <Heart className="h-7 w-7" fill="currentColor" />
          </motion.button>
        </div>
      )}
    </div>
  );
}
