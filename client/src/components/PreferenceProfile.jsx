import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ThumbsDown, HeartCrack } from "lucide-react";

export function PreferenceProfile() {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dislike-reasons", { credentials: "include" })
      .then((res) => res.json())
      .then(setReasons)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (reasons.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <HeartCrack className="h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-500">
          No dislike reasons recorded yet — they'll show up here as you swipe.
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...reasons.map((r) => r.count));

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {reasons.map((r, i) => (
        <motion.li
          key={r.reason}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.04 * i, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(r.count / maxCount) * 100}%` }}
            transition={{ duration: 0.5, delay: 0.04 * i, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-danger-100"
          />
          <div className="relative flex items-center justify-between">
            <p className="flex items-center gap-2 font-bold text-slate-800">
              <ThumbsDown className="h-4 w-4 text-danger-500" /> {r.reason}
            </p>
            <span className="rounded-full bg-danger-500 px-2.5 py-0.5 text-xs font-extrabold text-white">
              {r.count}×
            </span>
          </div>
          <p className="relative mt-1 text-xs text-slate-500">
            {r.jobs.map((j) => `${j.title} (${j.company})`).join(", ")}
          </p>
        </motion.li>
      ))}
    </ul>
  );
}
