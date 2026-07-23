import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EmployerBoard from "./EmployerBoard.jsx";

let mockRole = "EMPLOYER";
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { id: 1, role: mockRole } }),
}));

const postings = [{ id: 1, title: "Backend Engineer" }];

function mockFetchByUrl({ postingsList = postings, createResponse } = {}) {
  return vi.fn((url, options) => {
    if (url === "/api/job-postings") {
      return Promise.resolve({ ok: true, json: async () => postingsList });
    }
    if (
      url === "/api/candidate-leads" &&
      (!options || options.method === undefined)
    ) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    if (url === "/api/candidate-leads" && options?.method === "POST") {
      return Promise.resolve(
        createResponse ?? {
          ok: true,
          json: async () => ({
            id: 1,
            name: "Jane Dev",
            stage: "SOURCED",
            notes: "",
            jobPosting: { id: 1, title: "Backend Engineer" },
          }),
        },
      );
    }
    return Promise.reject(new Error(`Unexpected fetch to ${url}`));
  });
}

function renderBoard() {
  return render(
    <MemoryRouter initialEntries={["/candidates"]}>
      <Routes>
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/candidates" element={<EmployerBoard />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("EmployerBoard", () => {
  beforeEach(() => {
    mockRole = "EMPLOYER";
    globalThis.fetch = mockFetchByUrl();
  });

  it("redirects home for a Candidate account", async () => {
    mockRole = "CANDIDATE";
    renderBoard();
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("prompts to post a job first when there are no postings", async () => {
    globalThis.fetch = mockFetchByUrl({ postingsList: [] });
    renderBoard();
    expect(await screen.findByText(/post a job first/i)).toBeInTheDocument();
  });

  it("shows the add-candidate form populated with the employer's postings", async () => {
    renderBoard();
    expect(await screen.findByLabelText(/^name$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Backend Engineer" }),
    ).toBeInTheDocument();
  });

  it("adds a candidate and refreshes the board", async () => {
    globalThis.fetch = mockFetchByUrl();
    const user = userEvent.setup();
    renderBoard();

    await user.type(await screen.findByLabelText(/^name$/i), "Jane Dev");
    await user.click(screen.getByRole("button", { name: /add candidate/i }));

    await waitFor(() => {
      const postCall = globalThis.fetch.mock.calls.find(
        ([url, options]) =>
          url === "/api/candidate-leads" && options?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(postCall[1].body);
      expect(body).toEqual({ name: "Jane Dev", jobPostingId: 1 });
    });
  });

  it("shows an error when adding a candidate fails", async () => {
    globalThis.fetch = mockFetchByUrl({
      createResponse: {
        ok: false,
        json: async () => ({ error: "name and jobPostingId are required" }),
      },
    });
    const user = userEvent.setup();
    renderBoard();

    await user.type(await screen.findByLabelText(/^name$/i), "Jane Dev");
    await user.click(screen.getByRole("button", { name: /add candidate/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/required/i);
  });
});
