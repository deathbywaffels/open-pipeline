import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SponsorCompanies from "./SponsorCompanies.jsx";

let mockNeedsSponsorship = true;
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { id: 1, needsSponsorship: mockNeedsSponsorship } }),
}));

const sampleCompany = {
  id: 1,
  name: "Acme B.V.",
  country: "NL",
  outreachStatus: "NOT_STARTED",
  hiresItWorkers: null,
  notes: "",
  careersUrl: "",
};

function pageResponse(companies, total = companies.length) {
  return {
    ok: true,
    json: async () => ({ companies, total, page: 1, limit: 30 }),
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SponsorCompanies />
    </MemoryRouter>,
  );
}

describe("SponsorCompanies", () => {
  beforeEach(() => {
    mockNeedsSponsorship = true;
    globalThis.fetch = vi.fn().mockResolvedValue(pageResponse([sampleCompany]));
  });

  it("redirects home when the user has turned off sponsorship", async () => {
    mockNeedsSponsorship = false;

    render(
      <MemoryRouter initialEntries={["/sponsors"]}>
        <Routes>
          <Route path="/" element={<p>Home page</p>} />
          <Route path="/sponsors" element={<SponsorCompanies />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("lists previously imported companies with a total count", async () => {
    renderPage();

    expect(await screen.findByText("Acme B.V.")).toBeInTheDocument();
    expect(screen.getByText(/your sponsor companies · 1/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no companies at all", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(pageResponse([], 0));

    renderPage();

    expect(await screen.findByText(/no companies yet/i)).toBeInTheDocument();
  });

  it("reloads the list after a successful import", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(pageResponse([], 0)) // initial load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ created: 1, skippedExisting: 0 }),
      }) // import
      .mockResolvedValueOnce(pageResponse([sampleCompany])); // reload after import (page already 1)
    const user = userEvent.setup();

    renderPage();
    await screen.findByText(/no companies yet/i);

    await user.type(screen.getByLabelText(/paste company names/i), "Acme B.V.");
    await user.click(screen.getByRole("button", { name: /import/i }));

    expect(await screen.findByText("Acme B.V.")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("removes a company from the list when deleted", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(pageResponse([sampleCompany]))
      .mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("Acme B.V.");

    await user.click(
      screen.getByRole("button", { name: /remove acme b\.v\./i }),
    );

    await waitFor(() =>
      expect(screen.queryByText("Acme B.V.")).not.toBeInTheDocument(),
    );
  });

  it("sends a search query and re-fetches after debouncing", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(pageResponse([sampleCompany])) // initial load
      .mockResolvedValueOnce(pageResponse([sampleCompany])); // after search
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("Acme B.V.");

    await user.type(screen.getByLabelText(/search by company name/i), "Acme");

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    const [url] = globalThis.fetch.mock.calls[1];
    expect(url).toContain("search=Acme");
  });

  it("sends a status filter and resets to page 1", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(pageResponse([sampleCompany]))
      .mockResolvedValueOnce(pageResponse([sampleCompany]));
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("Acme B.V.");

    await user.selectOptions(
      screen.getByLabelText(/filter by outreach status/i),
      "APPLIED",
    );

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    const [url] = globalThis.fetch.mock.calls[1];
    expect(url).toContain("status=APPLIED");
    expect(url).toContain("page=1");
  });

  it("shows pagination controls and requests the next page", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(pageResponse([sampleCompany], 45))
      .mockResolvedValueOnce(pageResponse([{ ...sampleCompany, id: 2 }], 45));
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("Acme B.V.");
    expect(screen.getByText(/showing 1–30 of 45/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    const [url] = globalThis.fetch.mock.calls[1];
    expect(url).toContain("page=2");
  });
});
