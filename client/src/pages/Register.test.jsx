import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Register from "./Register.jsx";

const mockRegister = vi.fn();
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ register: mockRegister }),
}));

describe("Register", () => {
  beforeEach(() => {
    mockRegister.mockReset();
  });

  it("submits name, email, password, and defaults to the Candidate role", async () => {
    mockRegister.mockResolvedValueOnce({ id: 1, name: "Jane" });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/name/i), "Jane");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/password/i), "hunter22");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith(
        "jane@example.com",
        "hunter22",
        "Jane",
        "CANDIDATE",
      ),
    );
  });

  it("submits the Employer role when selected", async () => {
    mockRegister.mockResolvedValueOnce({ id: 1, name: "Acme" });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("radio", { name: /i'm hiring/i }));
    await user.type(screen.getByLabelText(/name/i), "Acme");
    await user.type(screen.getByLabelText(/email/i), "acme@example.com");
    await user.type(screen.getByLabelText(/password/i), "hunter22");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith(
        "acme@example.com",
        "hunter22",
        "Acme",
        "EMPLOYER",
      ),
    );
  });

  it("shows an error message when registration fails", async () => {
    mockRegister.mockRejectedValueOnce(new Error("Email already registered"));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/name/i), "Jane");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/password/i), "hunter22");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email already registered",
    );
  });
});
