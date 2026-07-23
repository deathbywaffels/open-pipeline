import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Postings from "./Postings.jsx";

let mockRole = "EMPLOYER";
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { id: 1, role: mockRole } }),
}));

function renderPostings() {
  return render(
    <MemoryRouter initialEntries={["/postings"]}>
      <Routes>
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/postings" element={<Postings />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Postings", () => {
  beforeEach(() => {
    mockRole = "EMPLOYER";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: "Backend Engineer",
          locationText: "Remote",
          requiredSkills: [],
        },
      ],
    });
  });

  it("redirects home for a Candidate account", async () => {
    mockRole = "CANDIDATE";
    renderPostings();
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("lists previously posted jobs", async () => {
    renderPostings();
    expect(await screen.findByText("Backend Engineer")).toBeInTheDocument();
  });

  it("shows an empty state when there are no postings", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] });
    renderPostings();
    expect(await screen.findByText(/no postings yet/i)).toBeInTheDocument();
  });

  it("shows a retry-geocoding button only for postings missing coordinates", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: "No Coords",
          locationText: "Remote",
          latitude: null,
          requiredSkills: [],
        },
        {
          id: 2,
          title: "Has Coords",
          locationText: "London",
          latitude: 51.5,
          requiredSkills: [],
        },
      ],
    });
    renderPostings();

    await screen.findByText("No Coords");
    expect(
      screen.getAllByRole("button", { name: /retry map location/i }),
    ).toHaveLength(1);
  });

  it("shows the required skills for a posting", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: "Backend Engineer",
          locationText: null,
          requiredSkills: [{ name: "Node.js" }, { name: "SQL" }],
        },
      ],
    });
    renderPostings();

    expect(
      await screen.findByText(/requires: node\.js, sql/i),
    ).toBeInTheDocument();
  });

  it("deletes a posting", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            title: "Backend Engineer",
            locationText: "Remote",
            requiredSkills: [],
          },
        ],
      })
      .mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();

    renderPostings();
    await screen.findByText("Backend Engineer");

    await user.click(
      screen.getByRole("button", { name: /remove backend engineer/i }),
    );

    await waitFor(() =>
      expect(screen.queryByText("Backend Engineer")).not.toBeInTheDocument(),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/job-postings/1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
