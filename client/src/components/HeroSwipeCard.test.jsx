import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HeroSwipeCard } from "./HeroSwipeCard.jsx";

function renderCard() {
  render(
    <MemoryRouter>
      <HeroSwipeCard />
    </MemoryRouter>,
  );
}

describe("HeroSwipeCard", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("shows the pending job count once loaded", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
    renderCard();

    expect(
      await screen.findByText(/3 jobs waiting for you/i),
    ).toBeInTheDocument();
  });

  it("uses singular phrasing for exactly one pending job", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }],
    });
    renderCard();

    expect(
      await screen.findByText(/1 job waiting for you/i),
    ).toBeInTheDocument();
  });

  it("links to the swipe page", async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    renderCard();

    await screen.findByText(/waiting for you/i);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/swipe");
  });

  it("fetches only pending job listings", () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    renderCard();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/job-listings?swipeStatus=PENDING",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
