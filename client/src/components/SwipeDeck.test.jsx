import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SwipeDeck } from "./SwipeDeck.jsx";

let mockNeedsSponsorship = true;
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { id: 1, needsSponsorship: mockNeedsSponsorship } }),
}));

const jobA = {
  id: 1,
  title: "Backend Engineer",
  company: "Acme",
  description: "Build APIs",
  locationText: null,
  skillMatchPercent: 50,
  requiredSkills: [{ name: "Node.js" }],
};
const jobB = {
  id: 2,
  title: "Frontend Engineer",
  company: "Acme",
  description: "Build UIs",
  locationText: null,
  skillMatchPercent: null,
  requiredSkills: [],
};

describe("SwipeDeck", () => {
  beforeEach(() => {
    mockNeedsSponsorship = true;
    globalThis.fetch = vi.fn();
  });

  it("shows an empty state when there are no pending jobs", async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    render(<SwipeDeck />);
    expect(
      await screen.findByText(/no more jobs to review/i),
    ).toBeInTheDocument();
  });

  it("likes a job and advances to the next one", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [jobA, jobB] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...jobA, swipeStatus: "LIKED" }),
      });
    const user = userEvent.setup();

    render(<SwipeDeck />);
    expect(await screen.findByText("Backend Engineer")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^like$/i }));

    const [url, options] = globalThis.fetch.mock.calls[1];
    expect(url).toBe("/api/job-listings/1/swipe");
    expect(JSON.parse(options.body).direction).toBe("like");

    await waitFor(() =>
      expect(screen.getByText("Frontend Engineer")).toBeInTheDocument(),
    );
  });

  it("dislikes a job with a reason", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [jobA] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...jobA, swipeStatus: "DISLIKED" }),
      });
    const user = userEvent.setup();

    render(<SwipeDeck />);
    await screen.findByText("Backend Engineer");

    await user.click(screen.getByRole("button", { name: /dislike/i }));
    await user.type(
      screen.getByPlaceholderText(/requires java/i),
      "Requires Java",
    );
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    const [, options] = globalThis.fetch.mock.calls[1];
    const body = JSON.parse(options.body);
    expect(body.direction).toBe("dislike");
    expect(body.reason).toBe("Requires Java");
  });

  it("shows a red flag when the current job's company isn't a recognized sponsor", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...jobA, isRecognizedSponsor: false }],
    });

    render(<SwipeDeck />);

    await screen.findByText("Backend Engineer");
    expect(
      screen.getByText(/not an ind-recognized sponsor/i),
    ).toBeInTheDocument();
  });

  it("does not show a red flag when the company is a recognized sponsor", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...jobA, isRecognizedSponsor: true }],
    });

    render(<SwipeDeck />);

    await screen.findByText("Backend Engineer");
    expect(
      screen.queryByText(/not an ind-recognized sponsor/i),
    ).not.toBeInTheDocument();
  });

  it("hides the sponsor red flag when the user has turned off sponsorship", async () => {
    mockNeedsSponsorship = false;
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...jobA, isRecognizedSponsor: false }],
    });

    render(<SwipeDeck />);

    await screen.findByText("Backend Engineer");
    expect(
      screen.queryByText(/not an ind-recognized sponsor/i),
    ).not.toBeInTheDocument();
  });

  it("shows a location flag when the current job is outside the desired area", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...jobA, isInDesiredLocation: false }],
    });

    render(<SwipeDeck />);

    await screen.findByText("Backend Engineer");
    expect(screen.getByText(/outside your desired area/i)).toBeInTheDocument();
  });

  it("does not show a location flag when the job is in the desired area", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...jobA, isInDesiredLocation: true }],
    });

    render(<SwipeDeck />);

    await screen.findByText("Backend Engineer");
    expect(
      screen.queryByText(/outside your desired area/i),
    ).not.toBeInTheDocument();
  });
});
