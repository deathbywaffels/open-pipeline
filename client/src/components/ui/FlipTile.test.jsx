import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { FlipTile } from "./FlipTile.jsx";

function renderTile(props = {}) {
  render(
    <MemoryRouter>
      <FlipTile
        to="/jobs"
        icon={Briefcase}
        label="Jobs"
        description="Paste & manage job listings"
        color="brand"
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("FlipTile", () => {
  it("shows the label on the front face", () => {
    renderTile();
    expect(screen.getByText("Jobs")).toBeInTheDocument();
  });

  it("includes the description for the back face", () => {
    renderTile();
    expect(screen.getByText("Paste & manage job listings")).toBeInTheDocument();
  });

  it("links to the given destination", () => {
    renderTile();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/jobs");
  });

  it("exposes both label and description in its accessible name", () => {
    renderTile();
    expect(
      screen.getByRole("link", { name: /jobs: paste & manage job listings/i }),
    ).toBeInTheDocument();
  });
});
