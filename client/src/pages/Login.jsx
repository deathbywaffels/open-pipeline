import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { LogIn, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { TextField } from "../components/ui/TextField.jsx";
import { Button } from "../components/ui/Button.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
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
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
            <Heart className="h-7 w-7" />
          </div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-800">
            <LogIn className="h-5 w-5" /> Log in
          </h1>
        </div>

        <div className="grid gap-4">
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
          {submitting ? "Logging in…" : "Log in"}
        </Button>

        <p className="mt-4 text-center text-sm text-slate-500">
          No account?{" "}
          <Link
            to="/register"
            className="font-semibold text-brand-600 underline"
          >
            Register
          </Link>
        </p>
      </motion.form>
    </main>
  );
}
