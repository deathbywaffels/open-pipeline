import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home.jsx";

const mockLogout = vi.fn();
let mockNeedsSponsorship = true;
let mockRole = "CANDIDATE";
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: "Jane",
      role: mockRole,
      needsSponsorship: mockNeedsSponsorship,
    },
    logout: mockLogout,
  }),
}));

function mockFetchByUrl() {
  return vi.fn((url) => {
    if (url === "/api/health") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          status: "ok",
          timestamp: new Date().toISOString(),
        }),
      });
    }
    if (url === "/api/quest/today") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          count: 1,
          target: 3,
          metToday: false,
          paste: { count: 0, target: 2, metToday: false },
          reachOut: { count: 0, target: 1, metToday: false },
          checkedInToday: true,
        }),
      });
    }
    if (url === "/api/streak") {
      return Promise.resolve({ ok: true, json: async () => ({ streak: 2 }) });
    }
    if (url === "/api/job-listings?swipeStatus=PENDING") {
      return Promise.resolve({
        ok: true,
        json: async () => [{ id: 1 }, { id: 2 }],
      });
    }
    return Promise.reject(new Error(`Unexpected fetch to ${url}`));
  });
}

describe("Home", () => {
  beforeEach(() => {
    mockLogout.mockReset();
    mockNeedsSponsorship = true;
    mockRole = "CANDIDATE";
    globalThis.fetch = mockFetchByUrl();
  });

  it("greets the logged-in user and shows backend status", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(screen.getByText(/welcome back, jane/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("health-status")).toHaveTextContent(
        "System status: ok",
      ),
    );
  });

  it("shows the quest progress and streak", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("1 / 3 applications today"),
    ).toBeInTheDocument();
    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(screen.getByText("days streak")).toBeInTheDocument();
  });

  it("shows the pending job count in the hero swipe card", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/2 jobs waiting for you/i),
    ).toBeInTheDocument();
  });

  it("calls logout when the log out button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /log out/i }));
    expect(mockLogout).toHaveBeenCalled();
  });

  it("renders a nav tile linking to every secondary section", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    for (const label of [
      "Jobs",
      "Board",
      "Map",
      "Profile",
      "Preferences",
      "Sponsors",
      "Coach",
      "Settings",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("hides the Sponsors tile when the user has turned off sponsorship", async () => {
    mockNeedsSponsorship = false;
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByText("Jobs");
    expect(screen.queryByText("Sponsors")).not.toBeInTheDocument();
  });

  it("shows Postings/Candidates tiles instead of candidate tiles for an Employer account", async () => {
    mockRole = "EMPLOYER";
    globalThis.fetch = vi.fn((url) => {
      if (url === "/api/health") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: "ok", timestamp: "" }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Postings")).toBeInTheDocument();
    expect(screen.getByText("Candidates")).toBeInTheDocument();
    expect(screen.queryByText("Jobs")).not.toBeInTheDocument();
    expect(screen.queryByText(/jobs waiting for you/i)).not.toBeInTheDocument();
  });
});
