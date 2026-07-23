import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Target } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

function GoalRow({ label, count, target, metToday }) {
  const percent = Math.min(100, Math.round((count / target) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold opacity-90">
        <span>{label}</span>
        <span>
          {count} / {target}
          {metToday && " ✓"}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25">
        <motion.div
          className="h-full rounded-full bg-white"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function QuestWidget() {
  const { user } = useAuth();
  const [quest, setQuest] = useState(null);

  useEffect(() => {
    fetch("/api/quest/today", { credentials: "include" })
      .then((res) => res.json())
      .then(setQuest);
  }, []);

  if (!quest) return null;

  const percent = Math.min(100, Math.round((quest.count / quest.target) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`w-full rounded-3xl p-5 text-white shadow-lg ${
        quest.metToday
          ? "bg-gradient-to-br from-brand-500 to-brand-600 shadow-brand-500/30"
          : "bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-600/25"
      }`}
    >
      <div className="flex items-center gap-2">
        {quest.metToday ? (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 12 }}
          >
            <CheckCircle2 className="h-6 w-6" />
          </motion.div>
        ) : (
          <Target className="h-6 w-6" />
        )}
        <span className="font-extrabold">Today's quest</span>
      </div>

      <p className="mt-1 text-sm font-semibold opacity-90">
        {quest.count} / {quest.target} applications today
      </p>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/25">
        <motion.div
          className="h-full rounded-full bg-white"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>

      <div className="mt-4 space-y-3 border-t border-white/20 pt-3">
        <GoalRow
          label="Jobs pasted"
          count={quest.paste.count}
          target={quest.paste.target}
          metToday={quest.paste.metToday}
        />
        {user.needsSponsorship && (
          <GoalRow
            label="Companies reached out to"
            count={quest.reachOut.count}
            target={quest.reachOut.target}
            metToday={quest.reachOut.metToday}
          />
        )}
        {quest.checkedInToday && (
          <p className="flex items-center gap-1.5 text-xs font-semibold opacity-90">
            <CheckCircle2 className="h-3.5 w-3.5" /> Checked in today
          </p>
        )}
      </div>
    </motion.div>
  );
}
