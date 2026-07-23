import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreferenceProfile } from "./PreferenceProfile.jsx";

describe("PreferenceProfile", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("shows an empty state when there are no reasons yet", async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    render(<PreferenceProfile />);
    expect(
      await screen.findByText(/no dislike reasons recorded/i),
    ).toBeInTheDocument();
  });

  it("lists grouped reasons with counts and associated jobs", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          reason: "Requires Java",
          count: 2,
          jobs: [
            { id: 1, title: "Backend Engineer", company: "Acme" },
            { id: 2, title: "Platform Engineer", company: "Acme" },
          ],
        },
      ],
    });

    render(<PreferenceProfile />);

    expect(await screen.findByText("Requires Java")).toBeInTheDocument();
    expect(screen.getByText("2×")).toBeInTheDocument();
    expect(
      screen.getByText(/Backend Engineer \(Acme\), Platform Engineer \(Acme\)/),
    ).toBeInTheDocument();
  });
});
