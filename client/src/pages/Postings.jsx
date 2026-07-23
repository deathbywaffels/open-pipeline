import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { MapPin, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { PastePostingForm } from "../components/PastePostingForm.jsx";
import { BackLink } from "../components/ui/BackLink.jsx";
import { Card } from "../components/ui/Card.jsx";

export default function Postings() {
  const { user } = useAuth();
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  useEffect(() => {
    fetch("/api/job-postings", { credentials: "include" })
      .then((res) => res.json())
      .then(setPostings)
      .finally(() => setLoading(false));
  }, []);

  async function retryGeocode(postingId) {
    setRetryingId(postingId);
    try {
      const res = await fetch(`/api/job-postings/${postingId}/geocode`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setPostings((ps) => ps.map((p) => (p.id === postingId ? data : p)));
      }
    } finally {
      setRetryingId(null);
    }
  }

  async function handleDelete(postingId) {
    await fetch(`/api/job-postings/${postingId}`, {
      method: "DELETE",
      credentials: "include",
    });
    setPostings((ps) => ps.filter((p) => p.id !== postingId));
  }

  if (user.role !== "EMPLOYER") {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <BackLink />

      <div className="lg:grid lg:grid-cols-[420px_1fr] lg:items-start lg:gap-8">
        <div className="max-w-2xl">
          <PastePostingForm
            onCreated={(posting) => setPostings((ps) => [posting, ...ps])}
          />
        </div>

        <div className="mt-8 lg:mt-0">
          <h2 className="mb-3 font-extrabold text-slate-800">
            Your job postings
          </h2>

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : postings.length === 0 ? (
            <p className="text-sm text-slate-500">No postings yet.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
              <AnimatePresence>
                {postings.map((posting, i) => (
                  <Card key={posting.id} as="li" delay={0.03 * i}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-800">
                        {posting.title}
                      </p>
                      <button
                        aria-label={`Remove ${posting.title}`}
                        onClick={() => handleDelete(posting.id)}
                        className="text-slate-300 hover:text-danger-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {posting.requiredSkills.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Requires:{" "}
                        {posting.requiredSkills.map((s) => s.name).join(", ")}
                      </p>
                    )}
                    {posting.locationText && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" /> {posting.locationText}
                        {posting.latitude === null && (
                          <button
                            onClick={() => retryGeocode(posting.id)}
                            disabled={retryingId === posting.id}
                            className="ml-1 flex items-center gap-1 font-semibold text-brand-600 underline disabled:opacity-50"
                          >
                            <RefreshCw className="h-3 w-3" />
                            {retryingId === posting.id
                              ? "Retrying…"
                              : "Retry map location"}
                          </button>
                        )}
                      </p>
                    )}
                  </Card>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
