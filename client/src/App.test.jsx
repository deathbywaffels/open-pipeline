import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";

function mockFetchImplementation({ authenticated }) {
  return vi.fn((url) => {
    if (url === "/api/auth/me") {
      return Promise.resolve(
        authenticated
          ? {
              ok: true,
              json: async () => ({
                id: 1,
                email: "jane@example.com",
                name: "Jane",
                role: "CANDIDATE",
              }),
            }
          : { ok: false, json: async () => ({ error: "Not authenticated" }) },
      );
    }
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
          count: 0,
          target: 3,
          metToday: false,
          paste: { count: 0, target: 2, metToday: false },
          reachOut: { count: 0, target: 1, metToday: false },
          checkedInToday: true,
        }),
      });
    }
    if (url === "/api/streak") {
      return Promise.resolve({ ok: true, json: async () => ({ streak: 0 }) });
    }
    if (url === "/api/job-listings?swipeStatus=PENDING") {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    return Promise.reject(new Error(`Unexpected fetch to ${url}`));
  });
}

describe("App", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("redirects an unauthenticated visitor to the login page", async () => {
    globalThis.fetch = mockFetchImplementation({ authenticated: false });

    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /log in/i }),
      ).toBeInTheDocument(),
    );
  });

  it("shows the home page for an authenticated visitor", async () => {
    globalThis.fetch = mockFetchImplementation({ authenticated: true });

    render(<App />);

    await waitFor(() =>
      expect(screen.getByText(/welcome back, jane/i)).toBeInTheDocument(),
    );
  });
});
