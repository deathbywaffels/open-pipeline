import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Plus, MapPin, RefreshCw } from "lucide-react";
import { Card } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";

export function DesiredLocationList() {
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  function loadLocations() {
    return fetch("/api/desired-locations", { credentials: "include" })
      .then((res) => res.json())
      .then(setLocations)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadLocations();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    if (!newLocation.trim()) return;

    try {
      const res = await fetch("/api/desired-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label: newLocation.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add location");

      setLocations((l) => [...l, data]);
      setNewLocation("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(id) {
    setLocations((l) => l.filter((loc) => loc.id !== id));
    await fetch(`/api/desired-locations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  }

  async function handleRetryGeocode(id) {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/desired-locations/${id}/geocode`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setLocations((l) => l.map((loc) => (loc.id === id ? data : loc)));
      }
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <Card delay={0.05}>
      <h2 className="mb-1 flex items-center gap-2 font-extrabold text-slate-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
          <MapPin className="h-4 w-4" />
        </span>
        Desired locations
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        Jobs outside your commute radius of any of these get flagged on the Jobs
        and Swipe pages.
      </p>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ul className="mb-4 flex flex-wrap gap-2">
          <AnimatePresence>
            {locations.map((location) => (
              <motion.li
                key={location.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1.5 text-sm font-semibold text-brand-700"
              >
                {location.label}
                {location.latitude === null && (
                  <button
                    aria-label={`Retry locating ${location.label}`}
                    onClick={() => handleRetryGeocode(location.id)}
                    disabled={retryingId === location.id}
                    className="text-brand-400 hover:text-brand-700 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  aria-label={`Remove ${location.label}`}
                  onClick={() => handleRemove(location.id)}
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
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          placeholder="City, Country"
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
