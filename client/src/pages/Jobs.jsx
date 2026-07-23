import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { MapPin, MapPinOff, RefreshCw, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { PasteJobForm } from "../components/PasteJobForm.jsx";
import { BackLink } from "../components/ui/BackLink.jsx";
import { Card } from "../components/ui/Card.jsx";

export default function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [areaOnly, setAreaOnly] = useState(false);
  const [sponsorOnly, setSponsorOnly] = useState(false);

  function loadJobs() {
    return fetch("/api/job-listings", { credentials: "include" })
      .then((res) => res.json())
      .then(setJobs)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function retryGeocode(jobId) {
    setRetryingId(jobId);
    try {
      const res = await fetch(`/api/job-listings/${jobId}/geocode`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setJobs((j) => j.map((job) => (job.id === jobId ? data : job)));
      }
    } finally {
      setRetryingId(null);
    }
  }

  const visibleJobs = jobs.filter((job) => {
    if (areaOnly && job.isInDesiredLocation !== true) return false;
    if (sponsorOnly && job.isRecognizedSponsor !== true) return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <BackLink />

      <div className="lg:grid lg:grid-cols-[420px_1fr] lg:items-start lg:gap-8">
        <div className="max-w-2xl">
          <PasteJobForm onCreated={(job) => setJobs((j) => [job, ...j])} />
        </div>

        <div className="mt-8 lg:mt-0">
          <h2 className="mb-3 font-extrabold text-slate-800">
            Your pasted jobs
          </h2>

          {jobs.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={areaOnly}
                  onChange={(e) => setAreaOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-2 border-slate-300 text-brand-600 focus:ring-brand-400"
                />
                In my desired area
              </label>
              {user.needsSponsorship && (
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={sponsorOnly}
                    onChange={(e) => setSponsorOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-2 border-slate-300 text-brand-600 focus:ring-brand-400"
                  />
                  Sponsor recognized
                </label>
              )}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-slate-500">No jobs pasted yet.</p>
          ) : visibleJobs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No jobs match the selected filters.
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
              <AnimatePresence>
                {visibleJobs.map((job, i) => (
                  <Card key={job.id} as="li" delay={0.03 * i}>
                    <p className="font-bold text-slate-800">{job.title}</p>
                    <p className="text-sm text-slate-500">{job.company}</p>
                    {user.needsSponsorship &&
                      job.isRecognizedSponsor === false && (
                        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-danger-600">
                          <ShieldAlert className="h-3 w-3" /> Not an
                          IND-recognized sponsor
                        </p>
                      )}
                    {job.isInDesiredLocation === false && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-bold text-danger-600">
                        <MapPinOff className="h-3 w-3" /> Outside your desired
                        area
                      </p>
                    )}
                    {job.locationText && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" /> {job.locationText}
                        {job.latitude === null && (
                          <button
                            onClick={() => retryGeocode(job.id)}
                            disabled={retryingId === job.id}
                            className="ml-1 flex items-center gap-1 font-semibold text-brand-600 underline disabled:opacity-50"
                          >
                            <RefreshCw className="h-3 w-3" />
                            {retryingId === job.id
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
