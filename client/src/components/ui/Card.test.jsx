import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card.jsx";

describe("Card", () => {
  it("renders as a div by default", () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText("Hello").tagName).toBe("DIV");
  });

  it("renders as a different element when requested", () => {
    render(<Card as="form">Hello</Card>);
    expect(screen.getByText("Hello").tagName).toBe("FORM");
  });
});
