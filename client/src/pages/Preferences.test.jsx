import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Preferences from "./Preferences.jsx";

describe("Preferences", () => {
  beforeEach(() => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] });
  });

  it("renders the preference profile", async () => {
    render(
      <MemoryRouter>
        <Preferences />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/no dislike reasons recorded/i),
    ).toBeInTheDocument();
  });
});
