import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Compass, Sparkles, Target } from "lucide-react";
import { BackLink } from "../components/ui/BackLink.jsx";
import { Card } from "../components/ui/Card.jsx";
import { TextField } from "../components/ui/TextField.jsx";
import { Button } from "../components/ui/Button.jsx";
import { aiHeaders, hasApiKey } from "../lib/aiSettings.js";

const FIT_LABEL_STYLES = {
  strong: "bg-success-100 text-success-700",
  moderate: "bg-accent-100 text-accent-700",
  weak: "bg-danger-100 text-danger-700",
};

function StatTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-xl font-extrabold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function ApiKeyPrompt({ children }) {
  return (
    <p className="text-xs text-slate-400">
      <Link to="/settings" className="font-semibold text-brand-600 underline">
        Add an Anthropic API key in Settings
      </Link>{" "}
      {children}
    </p>
  );
}

export default function Coach() {
  const location = useLocation();

  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [suggestions, setSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(null);

  const [contextText, setContextText] = useState(
    location.state?.fitContext || "",
  );
  const [fitResult, setFitResult] = useState(null);
  const [checkingFit, setCheckingFit] = useState(false);
  const [fitError, setFitError] = useState(null);

  useEffect(() => {
    fetch("/api/coaching/summary", { credentials: "include" })
      .then((res) => res.json())
      .then(setSummary)
      .finally(() => setLoadingSummary(false));
  }, []);

  async function handleGetSuggestions() {
    setSuggestionsError(null);
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/coaching/role-suggestions", {
        method: "POST",
        headers: aiHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get suggestions");
      setSuggestions(data.suggestions);
    } catch (err) {
      setSuggestionsError(err.message);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleCheckFit(e) {
    e.preventDefault();
    setFitError(null);
    setCheckingFit(true);
    try {
      const res = await fetch("/api/company-fit/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...aiHeaders() },
        credentials: "include",
        body: JSON.stringify({ contextText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check fit");
      setFitResult(data);
    } catch (err) {
      setFitError(err.message);
    } finally {
      setCheckingFit(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <BackLink />

      <h1 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-slate-800">
        <Compass className="h-5 w-5" /> Coach
      </h1>

      <Card>
        <h2 className="mb-3 font-extrabold text-slate-800">This week</h2>
        {loadingSummary ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="Jobs pasted"
                value={summary.weeklyStats.jobsPasted}
              />
              <StatTile
                label="Applications"
                value={summary.weeklyStats.applicationsSubmitted}
              />
              <StatTile
                label="Stage moves"
                value={summary.weeklyStats.stageProgressions}
              />
              <StatTile
                label="Interviews reached"
                value={summary.weeklyStats.interviewsReached}
              />
            </div>

            <div className="mt-4 rounded-2xl bg-brand-50 p-3 text-sm text-brand-700">
              {summary.missingSkill ? (
                <p>
                  <strong>{summary.missingSkill.name}</strong> shows up in{" "}
                  {summary.missingSkill.count} of the jobs you've applied to,
                  but isn't in your skills yet.
                </p>
              ) : (
                <p>
                  No clear skill gap yet — apply to a few more jobs with tagged
                  required skills to see this.
                </p>
              )}
            </div>
          </>
        )}
      </Card>

      <Card className="mt-4" delay={0.05}>
        <h2 className="mb-1 flex items-center gap-2 font-extrabold text-slate-800">
          <Sparkles className="h-4 w-4" /> Alternate role suggestions
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          Based on your skills, roles you may not have considered.
        </p>

        {hasApiKey() ? (
          <Button
            type="button"
            onClick={handleGetSuggestions}
            disabled={loadingSuggestions}
          >
            <Sparkles className="h-4 w-4" />
            {loadingSuggestions ? "Thinking…" : "Get role suggestions"}
          </Button>
        ) : (
          <ApiKeyPrompt>to get AI role suggestions.</ApiKeyPrompt>
        )}

        {suggestionsError && (
          <p
            role="alert"
            className="mt-2 text-xs font-semibold text-danger-600"
          >
            {suggestionsError}
          </p>
        )}

        {suggestions && (
          <ul className="mt-3 grid gap-2">
            {suggestions.map((s, i) => (
              <li key={i} className="rounded-2xl border border-slate-100 p-3">
                <p className="font-bold text-slate-800">{s.role}</p>
                <p className="text-sm text-slate-500">{s.rationale}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card as="form" onSubmit={handleCheckFit} className="mt-4" delay={0.1}>
        <h2 className="mb-1 flex items-center gap-2 font-extrabold text-slate-800">
          <Target className="h-4 w-4" /> Company fit check
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          Paste a job or company description to see how well it matches your
          skills — or use "Check AI fit" on one of your sponsor companies.
        </p>

        <TextField
          label="Job or company description"
          as="textarea"
          rows={5}
          value={contextText}
          onChange={(e) => setContextText(e.target.value)}
        />

        {hasApiKey() ? (
          <Button
            type="submit"
            className="mt-3"
            disabled={checkingFit || !contextText.trim()}
          >
            <Target className="h-4 w-4" />
            {checkingFit ? "Checking…" : "Check fit"}
          </Button>
        ) : (
          <div className="mt-3">
            <ApiKeyPrompt>to check fit.</ApiKeyPrompt>
          </div>
        )}

        {fitError && (
          <p
            role="alert"
            className="mt-2 text-xs font-semibold text-danger-600"
          >
            {fitError}
          </p>
        )}

        {fitResult && (
          <div className="mt-4">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-extrabold uppercase ${
                FIT_LABEL_STYLES[fitResult.fitLabel]
              }`}
            >
              {fitResult.fitLabel} fit
            </span>
            <p className="mt-2 text-sm text-slate-600">{fitResult.summary}</p>
            {fitResult.matchingSkills.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Matching: {fitResult.matchingSkills.join(", ")}
              </p>
            )}
            {fitResult.gaps.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Gaps: {fitResult.gaps.join(", ")}
              </p>
            )}
          </div>
        )}
      </Card>
    </main>
  );
}
