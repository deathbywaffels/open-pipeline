import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Flame } from "lucide-react";

export function StreakBadge() {
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    fetch("/api/streak", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setStreak(data.streak));
  }, []);

  if (streak === null) return null;

  const active = streak > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
      className={`flex w-full items-center gap-3 rounded-3xl p-5 shadow-lg ${
        active
          ? "bg-gradient-to-br from-accent-400 to-accent-500 text-white shadow-accent-500/30"
          : "border border-slate-100 bg-white text-slate-400 shadow-sm"
      }`}
    >
      <motion.div
        animate={active ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Flame
          className={`h-9 w-9 ${active ? "text-white" : "text-slate-300"}`}
        />
      </motion.div>
      <div>
        <p className="text-2xl font-extrabold">{streak}</p>
        <p className="text-sm font-semibold opacity-90">
          day{streak === 1 ? "" : "s"} streak
        </p>
      </div>
    </motion.div>
  );
}
