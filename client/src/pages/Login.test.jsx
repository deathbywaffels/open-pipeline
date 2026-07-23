import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login.jsx";

const mockLogin = vi.fn();
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

describe("Login", () => {
  beforeEach(() => {
    mockLogin.mockReset();
  });

  it("submits email and password to login", async () => {
    mockLogin.mockResolvedValueOnce({ id: 1, name: "Test" });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "hunter2");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "hunter2"),
    );
  });

  it("shows an error message when login fails", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Invalid email or password"));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );
  });
});
