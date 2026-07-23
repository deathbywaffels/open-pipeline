import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Plus, Sparkles } from "lucide-react";
import { Card } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";

export function SkillList({ refreshKey }) {
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function loadSkills() {
    return fetch("/api/skills", { credentials: "include" })
      .then((res) => res.json())
      .then(setSkills)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSkills();
  }, [refreshKey]);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    if (!newSkill.trim()) return;

    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newSkill.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add skill");

      setSkills((s) =>
        [...s, data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewSkill("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(id) {
    setSkills((s) => s.filter((skill) => skill.id !== id));
    await fetch(`/api/skills/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  }

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-extrabold text-slate-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success-100 text-success-600">
          <Sparkles className="h-4 w-4" />
        </span>
        Your skills
      </h2>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ul className="mb-4 flex flex-wrap gap-2">
          <AnimatePresence>
            {skills.map((skill) => (
              <motion.li
                key={skill.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1.5 text-sm font-semibold text-brand-700"
              >
                {skill.name}
                <button
                  aria-label={`Remove ${skill.name}`}
                  onClick={() => handleRemove(skill.id)}
                  className="text-brand-400 hover:text-brand-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          placeholder="Add a skill"
          className="flex-1 rounded-2xl border-2 border-slate-200 px-4 py-2 text-sm outline-none focus:border-brand-400"
        />
        <Button type="submit" className="!px-4 !py-2">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}
    </Card>
  );
}
