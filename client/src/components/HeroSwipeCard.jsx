import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Heart, ArrowRight } from "lucide-react";

const MotionLink = motion.create(Link);

export function HeroSwipeCard() {
  const [pendingCount, setPendingCount] = useState(null);

  useEffect(() => {
    fetch("/api/job-listings?swipeStatus=PENDING", { credentials: "include" })
      .then((res) => res.json())
      .then((jobs) => setPendingCount(jobs.length));
  }, []);

  return (
    <MotionLink
      to="/swipe"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative flex min-h-48 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-slate-800 p-6 text-white shadow-lg shadow-brand-600/25"
    >
      <Heart
        className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-white/10"
        strokeWidth={1.5}
      />

      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-white/80">
          Keep the streak going
        </p>
        <p className="mt-1 text-3xl font-extrabold">
          {pendingCount === null ? "…" : pendingCount} job
          {pendingCount === 1 ? "" : "s"} waiting for you
        </p>
      </div>

      <span className="flex items-center gap-1 text-sm font-bold">
        Start swiping <ArrowRight className="h-4 w-4" />
      </span>
    </MotionLink>
  );
}
