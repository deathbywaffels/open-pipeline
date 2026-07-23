import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { EmployerKanbanBoard } from "../components/EmployerKanbanBoard.jsx";
import { BackLink } from "../components/ui/BackLink.jsx";
import { Card } from "../components/ui/Card.jsx";
import { TextField } from "../components/ui/TextField.jsx";
import { Button } from "../components/ui/Button.jsx";

export default function EmployerBoard() {
  const { user } = useAuth();
  const [postings, setPostings] = useState([]);
  const [name, setName] = useState("");
  const [jobPostingId, setJobPostingId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/job-postings", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setPostings(data);
        if (data.length > 0) setJobPostingId(String(data[0].id));
      });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/candidate-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          jobPostingId: Number(jobPostingId),
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add candidate");

      setName("");
      setNotes("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (user.role !== "EMPLOYER") {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8">
      <BackLink />

      {postings.length === 0 ? (
        <p className="mb-6 text-sm text-slate-500">
          Post a job first, then you can start tracking candidates against it.
        </p>
      ) : (
        <Card as="form" onSubmit={handleSubmit} className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 font-extrabold text-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
              <UserPlus className="h-4 w-4" />
            </span>
            Add a candidate
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              label="Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Posting"
              as="select"
              value={jobPostingId}
              onChange={(e) => setJobPostingId(e.target.value)}
            >
              {postings.map((posting) => (
                <option key={posting.id} value={posting.id}>
                  {posting.title}
                </option>
              ))}
            </TextField>
            <TextField
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && (
            <p
              role="alert"
              className="mt-3 text-sm font-semibold text-danger-600"
            >
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="mt-4">
            {submitting ? "Adding…" : "Add candidate"}
          </Button>
        </Card>
      )}

      <EmployerKanbanBoard refreshKey={refreshKey} />
    </main>
  );
}
