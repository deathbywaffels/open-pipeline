import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { Search } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { SponsorImportForm } from "../components/SponsorImportForm.jsx";
import {
  SponsorCompanyCard,
  STATUS_LABELS,
} from "../components/SponsorCompanyCard.jsx";
import { BackLink } from "../components/ui/BackLink.jsx";

const LIMIT = 30;

export default function SponsorCompanies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Debounce the search box so every keystroke doesn't fire a request —
  // this list can be tens of thousands of rows (e.g. the full IND
  // register), so it's paginated server-side rather than fetched whole.
  // Resetting to page 1 happens here (and in handleStatusChange), not in
  // a separate effect watching these values — setState directly inside
  // an effect body causes cascading renders.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadCompanies = useCallback(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
    });
    if (statusFilter) params.set("status", statusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);

    // loading only ever gates the initial render (it starts true) — a
    // page/filter change updates the list in place below rather than
    // flashing "Loading…" over it on every keystroke/click.
    return fetch(`/api/sponsor-companies?${params}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setCompanies(data.companies);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  function handleStatusChange(e) {
    setStatusFilter(e.target.value);
    setPage(1);
  }

  function handleUpdate(updated) {
    setCompanies((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleDelete(id) {
    setCompanies((cs) => cs.filter((c) => c.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }

  function handleImported() {
    setSearchInput("");
    setStatusFilter("");
    setDebouncedSearch("");
    if (page === 1) {
      loadCompanies();
    } else {
      setPage(1);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const rangeStart = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const rangeEnd = Math.min(page * LIMIT, total);
  const isFiltering = Boolean(searchInput || statusFilter);

  // Stale bookmark/link guard — the Sponsors tile is already hidden from
  // Home when sponsorship is off, this covers direct navigation to the URL.
  if (!user.needsSponsorship) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <BackLink />

      <div className="lg:grid lg:grid-cols-[420px_1fr] lg:items-start lg:gap-8">
        <div className="max-w-2xl">
          <SponsorImportForm onImported={handleImported} />
        </div>

        <div className="mt-8 lg:mt-0">
          <h2 className="mb-3 font-extrabold text-slate-800">
            Your sponsor companies · {total}
          </h2>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search by company name</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by company name…"
                className="w-full rounded-2xl border-2 border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label>
              <span className="sr-only">Filter by outreach status</span>
              <select
                value={statusFilter}
                onChange={handleStatusChange}
                className="rounded-2xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : companies.length === 0 ? (
            <p className="text-sm text-slate-500">
              {isFiltering
                ? "No companies match your search/filter."
                : "No companies yet — paste a list to get started."}
            </p>
          ) : (
            <>
              <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
                <AnimatePresence>
                  {companies.map((company, i) => (
                    <SponsorCompanyCard
                      key={company.id}
                      company={company}
                      delay={0.03 * i}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </ul>

              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-xl border-2 border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-xl border-2 border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
