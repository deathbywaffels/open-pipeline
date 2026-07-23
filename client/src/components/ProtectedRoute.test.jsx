import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute.jsx";

const mockUseAuth = vi.fn();
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Secret Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("renders nothing while auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container } = renderProtected();
    expect(container).toBeEmptyDOMElement();
  });

  it("redirects to /login when there is no user", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderProtected();
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("renders children when a user is present", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: "Test" },
      loading: false,
    });
    renderProtected();
    expect(screen.getByText("Secret Content")).toBeInTheDocument();
  });
});
