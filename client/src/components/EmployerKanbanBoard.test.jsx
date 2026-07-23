import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmployerKanbanBoard } from "./EmployerKanbanBoard.jsx";

const leads = [
  {
    id: 1,
    name: "Jane Dev",
    stage: "SOURCED",
    notes: "",
    jobPosting: { id: 10, title: "Backend Engineer" },
  },
  {
    id: 2,
    name: "John Dev",
    stage: "CONTACTED",
    notes: "",
    jobPosting: { id: 11, title: "Frontend Engineer" },
  },
];

describe("EmployerKanbanBoard", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => leads,
    });
  });

  it("groups candidate leads into the correct stage columns", async () => {
    render(<EmployerKanbanBoard />);

    expect(await screen.findByText("Jane Dev")).toBeInTheDocument();

    const sourcedColumn = screen
      .getByRole("heading", { name: /Sourced/i })
      .closest("div");
    expect(within(sourcedColumn).getByText("Jane Dev")).toBeInTheDocument();

    const contactedColumn = screen
      .getByRole("heading", { name: /Contacted/i })
      .closest("div");
    expect(within(contactedColumn).getByText("John Dev")).toBeInTheDocument();
  });

  it("moves a card to a new stage via its select control", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => leads }) // initial load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...leads[0], stage: "CONTACTED" }),
      }); // PATCH response
    const user = userEvent.setup();

    render(<EmployerKanbanBoard />);
    await screen.findByText("Jane Dev");

    const card = screen.getByText("Jane Dev").closest("li");
    await user.selectOptions(
      within(card).getByLabelText(/stage/i),
      "CONTACTED",
    );

    await waitFor(() => {
      const [url, options] = globalThis.fetch.mock.calls[1];
      expect(url).toBe("/api/candidate-leads/1");
      expect(options.method).toBe("PATCH");
      expect(JSON.parse(options.body)).toEqual({ stage: "CONTACTED" });
    });
  });

  it("shows an error and reverts the optimistic update when the stage change fails", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => leads })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid stage" }),
      });
    const user = userEvent.setup();

    render(<EmployerKanbanBoard />);
    const card = await screen.findByText("Jane Dev");

    await user.selectOptions(
      within(card.closest("li")).getByLabelText(/stage/i),
      "CONTACTED",
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid stage");
  });

  it("PATCHes notes when a card's notes field is blurred with a change", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => leads })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...leads[0], notes: "Great fit" }),
      });
    const user = userEvent.setup();

    render(<EmployerKanbanBoard />);
    const card = await screen.findByText("Jane Dev");

    await user.type(
      within(card.closest("li")).getByLabelText(/notes/i),
      "Great fit",
    );
    await user.tab();

    await waitFor(() => {
      const [url, options] = globalThis.fetch.mock.calls[1];
      expect(url).toBe("/api/candidate-leads/1");
      expect(JSON.parse(options.body)).toEqual({ notes: "Great fit" });
    });
  });
});
