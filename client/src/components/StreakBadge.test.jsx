import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreakBadge } from "./StreakBadge.jsx";

describe("StreakBadge", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("shows a pluralized streak count", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ streak: 5 }),
    });
    render(<StreakBadge />);
    expect(await screen.findByText("5")).toBeInTheDocument();
    expect(screen.getByText("days streak")).toBeInTheDocument();
  });

  it("shows a singular day for a streak of 1", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ streak: 1 }),
    });
    render(<StreakBadge />);
    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(screen.getByText("day streak")).toBeInTheDocument();
  });
});
