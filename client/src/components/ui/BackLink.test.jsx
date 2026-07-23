import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BackLink } from "./BackLink.jsx";

describe("BackLink", () => {
  it("links to / by default", () => {
    render(
      <MemoryRouter>
        <BackLink />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /back/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("links to a custom destination", () => {
    render(
      <MemoryRouter>
        <BackLink to="/jobs" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /back/i })).toHaveAttribute(
      "href",
      "/jobs",
    );
  });
});
