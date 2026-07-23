import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Swipe from "./Swipe.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { id: 1, needsSponsorship: true } }),
}));

describe("Swipe", () => {
  beforeEach(() => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] });
  });

  it("renders the swipe deck", async () => {
    render(
      <MemoryRouter>
        <Swipe />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/no more jobs to review/i),
    ).toBeInTheDocument();
  });
});
