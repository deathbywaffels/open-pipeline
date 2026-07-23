import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "./KanbanBoard.jsx";

const applications = [
  {
    id: 1,
    stage: "LIKED",
    isStale: false,
    jobListing: { id: 10, title: "Backend Engineer", company: "Acme" },
  },
  {
    id: 2,
    stage: "APPLIED",
    isStale: true,
    jobListing: { id: 11, title: "Frontend Engineer", company: "Acme" },
  },
];

describe("KanbanBoard", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => applications,
    });
  });

  it("groups applications into the correct stage columns", async () => {
    render(<KanbanBoard />);

    expect(await screen.findByText("Backend Engineer")).toBeInTheDocument();

    const likedColumn = screen
      .getByRole("heading", { name: /Liked/i })
      .closest("div");
    expect(
      within(likedColumn).getByText("Backend Engineer"),
    ).toBeInTheDocument();

    const appliedColumn = screen
      .getByRole("heading", { name: /Applied/i })
      .closest("div");
    expect(
      within(appliedColumn).getByText("Frontend Engineer"),
    ).toBeInTheDocument();
  });

  it("moves a card to a new stage via its select control", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => applications }) // initial load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...applications[0], stage: "APPLIED" }),
      }); // PATCH response
    const user = userEvent.setup();

    render(<KanbanBoard />);
    await screen.findByText("Backend Engineer");

    const card = screen.getByText("Backend Engineer").closest("li");
    await user.selectOptions(within(card).getByLabelText(/stage/i), "APPLIED");

    await waitFor(() => {
      const [url, options] = globalThis.fetch.mock.calls[1];
      expect(url).toBe("/api/applications/1/stage");
      expect(JSON.parse(options.body)).toEqual({ toStage: "APPLIED" });
    });
  });

  it("shows an error and reverts optimistic update when the stage change fails", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => applications })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid stage" }),
      });
    const user = userEvent.setup();

    render(<KanbanBoard />);
    const card = await screen.findByText("Backend Engineer");

    await user.selectOptions(
      within(card.closest("li")).getByLabelText(/stage/i),
      "APPLIED",
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid stage");
  });
});
