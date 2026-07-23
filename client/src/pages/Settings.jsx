import { useEffect, useState } from "react";
import {
  Save,
  Settings as SettingsIcon,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { BackLink } from "../components/ui/BackLink.jsx";
import { Card } from "../components/ui/Card.jsx";
import { TextField } from "../components/ui/TextField.jsx";
import { Button } from "../components/ui/Button.jsx";
import { DesiredLocationList } from "../components/DesiredLocationList.jsx";
import {
  AI_MODELS,
  getApiKey,
  setApiKey,
  getModel,
  setModel,
} from "../lib/aiSettings.js";

export default function Settings() {
  const { user, updateUser } = useAuth();

  const [target, setTarget] = useState("");
  const [pasteTarget, setPasteTarget] = useState("");
  const [reachOutTarget, setReachOutTarget] = useState("");
  const [needsSponsorship, setNeedsSponsorship] = useState(
    user.needsSponsorship,
  );
  const [commuteRadiusKm, setCommuteRadiusKm] = useState(
    String(user.commuteRadiusKm),
  );
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [apiKey, setApiKeyInput] = useState(getApiKey());
  const [model, setModelInput] = useState(getModel());
  const [aiSaved, setAiSaved] = useState(false);

  useEffect(() => {
    fetch("/api/quest/today", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setTarget(String(data.target));
        setPasteTarget(String(data.paste.target));
        setReachOutTarget(String(data.reachOut.target));
      })
      .finally(() => setLoading(false));
  }, []);

  function handleAiSubmit(e) {
    e.preventDefault();
    setApiKey(apiKey.trim());
    setModel(model);
    setAiSaved(true);
  }

  function handleClearKey() {
    setApiKeyInput("");
    setApiKey("");
    setAiSaved(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          dailyQuestTarget: Number(target),
          dailyPasteTarget: Number(pasteTarget),
          dailyReachOutTarget: Number(reachOutTarget),
          needsSponsorship,
          commuteRadiusKm: Number(commuteRadiusKm),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      setTarget(String(data.dailyQuestTarget));
      setPasteTarget(String(data.dailyPasteTarget));
      setReachOutTarget(String(data.dailyReachOutTarget));
      setNeedsSponsorship(data.needsSponsorship);
      setCommuteRadiusKm(String(data.commuteRadiusKm));
      updateUser({
        needsSponsorship: data.needsSponsorship,
        commuteRadiusKm: data.commuteRadiusKm,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <BackLink />

      <h1 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-slate-800">
        <SettingsIcon className="h-5 w-5" /> Settings
      </h1>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <Card as="form" onSubmit={handleSubmit}>
          <TextField
            label="Daily application quest target"
            type="number"
            min="1"
            step="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />

          <div className="mt-4">
            <TextField
              label="Daily jobs-pasted target"
              type="number"
              min="1"
              step="1"
              value={pasteTarget}
              onChange={(e) => setPasteTarget(e.target.value)}
            />
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={needsSponsorship}
              onChange={(e) => setNeedsSponsorship(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-slate-300 text-brand-600 focus:ring-brand-400"
            />
            I need visa sponsorship
          </label>
          <p className="mt-1 text-xs text-slate-400">
            Turning this off hides the Sponsors page and sponsor red flags —
            your imported companies are kept, not deleted.
          </p>

          {needsSponsorship && (
            <div className="mt-4">
              <TextField
                label="Daily companies-reached-out-to target"
                type="number"
                min="1"
                step="1"
                value={reachOutTarget}
                onChange={(e) => setReachOutTarget(e.target.value)}
              />
            </div>
          )}

          <div className="mt-4">
            <TextField
              label="Commute radius (km)"
              type="number"
              min="1"
              step="1"
              value={commuteRadiusKm}
              onChange={(e) => setCommuteRadiusKm(e.target.value)}
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
          {saved && (
            <p className="mt-3 text-sm font-semibold text-success-600">
              Saved.
            </p>
          )}

          <Button type="submit" className="mt-4">
            <Save className="h-4 w-4" /> Save
          </Button>
        </Card>
      )}

      <Card as="form" onSubmit={handleAiSubmit} delay={0.05} className="mt-4">
        <h2 className="mb-1 flex items-center gap-2 font-extrabold text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-300/30 text-accent-600">
            <Sparkles className="h-4 w-4" />
          </span>
          AI extraction
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Bring your own Anthropic API key to auto-fill pasted job posts and
          pull skills from your CV.
        </p>

        <div className="grid gap-4">
          <TextField
            label="Anthropic API key"
            type="password"
            autoComplete="off"
            placeholder="sk-ant-…"
            value={apiKey}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
          <TextField
            label="Model"
            as="select"
            value={model}
            onChange={(e) => setModelInput(e.target.value)}
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </TextField>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-brand-50 p-3 text-xs text-brand-700">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>
            Your key stays in this browser (localStorage). It's sent to this
            app's own server only on an AI request, which forwards it to
            Anthropic and never writes it to disk or a database.
          </span>
        </div>

        {aiSaved && (
          <p className="mt-3 text-sm font-semibold text-success-600">Saved.</p>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="submit">
            <Save className="h-4 w-4" /> Save key
          </Button>
          {apiKey && (
            <Button type="button" variant="secondary" onClick={handleClearKey}>
              Clear key
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-4">
        <DesiredLocationList />
      </div>
    </main>
  );
}
