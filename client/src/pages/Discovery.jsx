import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Sparkles, MapPin, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { BackLink } from "../components/ui/BackLink.jsx";
import { Card } from "../components/ui/Card.jsx";
import { TextField } from "../components/ui/TextField.jsx";
import { Button } from "../components/ui/Button.jsx";
import { aiHeaders, hasApiKey } from "../lib/aiSettings.js";

export default function Discovery() {
  const { user } = useAuth();
  const [postings, setPostings] = useState([]);
  const [jobPostingId, setJobPostingId] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [candidatesForId, setCandidatesForId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [recommendations, setRecommendations] = useState(null);
  const [recommending, setRecommending] = useState(false);
  const [recommendError, setRecommendError] = useState(null);

  const loading = jobPostingId !== "" && candidatesForId !== jobPostingId;

  useEffect(() => {
    fetch("/api/job-postings", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setPostings(data);
        if (data.length > 0) setJobPostingId(String(data[0].id));
      });
  }, []);

  useEffect(() => {
    if (!jobPostingId) return;
    let cancelled = false;
    fetch(`/api/discovery/candidates?jobPostingId=${jobPostingId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setCandidates(data);
        setCandidatesForId(jobPostingId);
      });
    return () => {
      cancelled = true;
    };
  }, [jobPostingId]);

  function handleSelectPosting(e) {
    setJobPostingId(e.target.value);
    setRecommendations(null);
  }

  async function handleAdd(candidateId) {
    const res = await fetch("/api/candidate-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        candidateUserId: candidateId,
        jobPostingId: Number(jobPostingId),
      }),
    });
    if (res.ok) {
      setAddedIds((ids) => new Set(ids).add(candidateId));
    }
  }

  async function handleRecommend() {
    setRecommendError(null);
    setRecommending(true);
    try {
      const res = await fetch("/api/discovery/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...aiHeaders() },
        credentials: "include",
        body: JSON.stringify({ jobPostingId: Number(jobPostingId) }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to get recommendations");
      setRecommendations(data.recommendations);
    } catch (err) {
      setRecommendError(err.message);
    } finally {
      setRecommending(false);
    }
  }

  if (user.role !== "EMPLOYER") {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <BackLink />

      <h1 className="mb-4 text-xl font-extrabold text-slate-800">
        Discover candidates
      </h1>

      {postings.length === 0 ? (
        <p className="text-sm text-slate-500">
          Post a job first to discover matching candidates.
        </p>
      ) : (
        <>
          <Card className="mb-4">
            <TextField
              label="Posting"
              as="select"
              value={jobPostingId}
              onChange={handleSelectPosting}
            >
              {postings.map((posting) => (
                <option key={posting.id} value={posting.id}>
                  {posting.title}
                </option>
              ))}
            </TextField>

            {hasApiKey() ? (
              <Button
                type="button"
                className="mt-3"
                onClick={handleRecommend}
                disabled={recommending}
              >
                <Sparkles className="h-4 w-4" />
                {recommending ? "Thinking…" : "Get AI recommendations"}
              </Button>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                <Link
                  to="/settings"
                  className="font-semibold text-brand-600 underline"
                >
                  Add an Anthropic API key in Settings
                </Link>{" "}
                to get AI recommendations.
              </p>
            )}
            {recommendError && (
              <p
                role="alert"
                className="mt-2 text-xs font-semibold text-danger-600"
              >
                {recommendError}
              </p>
            )}
          </Card>

          {recommendations && (
            <Card className="mb-4" delay={0.05}>
              <h2 className="mb-2 font-extrabold text-slate-800">Top picks</h2>
              {recommendations.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No recommendations returned.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {recommendations.map((rec) => (
                    <li
                      key={rec.id}
                      className="rounded-2xl border border-slate-100 p-3"
                    >
                      <p className="font-bold text-slate-800">{rec.name}</p>
                      <p className="text-sm text-slate-500">{rec.rationale}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-slate-500">
              No public candidates match yet.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {candidates.map((candidate, i) => (
                <Card key={candidate.id} as="li" delay={0.03 * i}>
                  <p className="font-bold text-slate-800">{candidate.name}</p>
                  {candidate.skillMatchPercent !== null && (
                    <span className="mt-1 inline-block w-fit rounded-full bg-brand-100 px-3 py-1 text-xs font-extrabold text-brand-700">
                      {candidate.skillMatchPercent}% skill match
                    </span>
                  )}
                  {candidate.isInDesiredLocation === true && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> Within their commute radius
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2 !py-1.5 !text-xs"
                    disabled={addedIds.has(candidate.id)}
                    onClick={() => handleAdd(candidate.id)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {addedIds.has(candidate.id) ? "Added" : "Add to pipeline"}
                  </Button>
                </Card>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
