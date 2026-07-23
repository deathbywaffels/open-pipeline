import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Board from "./Board.jsx";

describe("Board", () => {
  beforeEach(() => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] });
  });

  it("renders the kanban board with all stage columns", async () => {
    render(
      <MemoryRouter>
        <Board />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Liked/i)).toBeInTheDocument();
    expect(screen.getByText(/Rejected/i)).toBeInTheDocument();
  });
});
