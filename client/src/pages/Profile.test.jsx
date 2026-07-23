import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Profile from "./Profile.jsx";

describe("Profile", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn((url) => {
      if (url === "/api/skills") {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, name: "React" }],
        });
      }
      if (url === "/api/cv") {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });
  });

  it("renders the skill list", async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    expect(await screen.findByText("React")).toBeInTheDocument();
  });

  it("renders the CV upload section", async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no cvs uploaded yet/i)).toBeInTheDocument();
  });
});
