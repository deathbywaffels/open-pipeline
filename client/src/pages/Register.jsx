import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { UserPlus, Sparkles, Briefcase, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { TextField } from "../components/ui/TextField.jsx";
import { Button } from "../components/ui/Button.jsx";

const ROLE_OPTIONS = [
  {
    value: "CANDIDATE",
    label: "I'm looking for a job",
    icon: Briefcase,
  },
  {
    value: "EMPLOYER",
    label: "I'm hiring",
    icon: Building2,
  },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("CANDIDATE");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, name, role);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 to-slate-800 px-4">
      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
      >
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-300/30 text-accent-600">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-800">
            <UserPlus className="h-5 w-5" /> Create account
          </h1>
        </div>

        <div
          role="radiogroup"
          aria-label="I am"
          className="mb-4 grid grid-cols-2 gap-2"
        >
          {ROLE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = role === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRole(opt.value)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-3 text-xs font-bold transition-colors ${
                  selected
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <Icon className="h-5 w-5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4">
          <TextField
            label="Name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 text-sm font-semibold text-danger-600"
          >
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="mt-5 w-full">
          {submitting ? "Creating account…" : "Create account"}
        </Button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-600 underline">
            Log in
          </Link>
        </p>
      </motion.form>
    </main>
  );
}
