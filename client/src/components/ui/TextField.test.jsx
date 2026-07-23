import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextField } from "./TextField.jsx";

describe("TextField", () => {
  it("renders a labelled input by default", () => {
    render(<TextField label="Email" type="email" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });

  it("renders as a textarea when requested", () => {
    render(<TextField label="Description" as="textarea" />);
    expect(screen.getByLabelText("Description").tagName).toBe("TEXTAREA");
  });
});
