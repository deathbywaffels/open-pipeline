import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppFooter } from "./AppFooter.jsx";

describe("AppFooter", () => {
  it("links the support button to the Ko-fi page in a new tab", () => {
    render(<AppFooter status="ok" />);

    const link = screen.getByRole("link", { name: /buy me a coffee/i });
    expect(link).toHaveAttribute("href", "https://ko-fi.com/maddy17095");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("links the feedback button to a prefilled mailto", () => {
    render(<AppFooter status="ok" />);

    const link = screen.getByRole("link", { name: /got an idea or a bug/i });
    expect(link.getAttribute("href")).toBe(
      "mailto:villen00madz@gmail.com?subject=Open%20Pipeline%20feedback",
    );
  });

  it("shows a no-guarantee / AI-assisted disclaimer", () => {
    render(<AppFooter status="ok" />);

    expect(
      screen.getByText(/doesn't guarantee interviews, offers, or a job/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/built with AI assistance/i)).toBeInTheDocument();
  });

  it("still exposes the health-status text for the given status", () => {
    render(<AppFooter status="ok" />);

    expect(screen.getByTestId("health-status")).toHaveTextContent(
      "System status: ok",
    );
  });
});
