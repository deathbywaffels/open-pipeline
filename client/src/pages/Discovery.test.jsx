import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Discovery from "./Discovery.jsx";

let mockRole = "EMPLOYER";
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { id: 1, role: mockRole } }),
}));

function postingsResponse() {
  return [{ id: 1, title: "Backend Engineer" }];
}

function candidatesResponse() {
  return [
    {
      id: 10,
      name: "Jane Dev",
      skillMatchPercent: 100,
      isInDesiredLocation: true,
    },
    {
      id: 11,
      name: "Sam Coder",
      skillMatchPercent: 50,
      isInDesiredLocation: false,
    },
  ];
}

function mockFetchByUrl({ candidates, recommendResponse, addResponse } = {}) {
  return vi.fn((url, options) => {
    if (url === "/api/job-postings") {
      return Promise.resolve({
        ok: true,
        json: async () => postingsResponse(),
      });
    }
    if (url.startsWith("/api/discovery/candidates")) {
      return Promise.resolve({
        ok: true,
        json: async () => candidates ?? candidatesResponse(),
      });
    }
    if (url === "/api/discovery/recommend" && options?.method === "POST") {
      return Promise.resolve(
        recommendResponse ?? {
          ok: true,
          json: async () => ({
            recommendations: [
              { id: 10, name: "Jane Dev", rationale: "Great fit." },
            ],
          }),
        },
      );
    }
    if (url === "/api/candidate-leads" && options?.method === "POST") {
      return Promise.resolve(
        addResponse ?? { ok: true, json: async () => ({ id: 1 }) },
      );
    }
    return Promise.reject(new Error(`Unexpected fetch to ${url}`));
  });
}

function renderDiscovery() {
  return render(
    <MemoryRouter initialEntries={["/discovery"]}>
      <Routes>
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/discovery" element={<Discovery />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Discovery", () => {
  beforeEach(() => {
    mockRole = "EMPLOYER";
    localStorage.clear();
    globalThis.fetch = mockFetchByUrl();
  });

  it("redirects home for a Candidate account", async () => {
    mockRole = "CANDIDATE";
    renderDiscovery();
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("shows an empty state when there are no postings", async () => {
    globalThis.fetch = vi.fn((url) => {
      if (url === "/api/job-postings") {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });
    renderDiscovery();
    expect(await screen.findByText(/post a job first/i)).toBeInTheDocument();
  });

  it("lists matching candidates with skill-match and location badges", async () => {
    renderDiscovery();

    expect(await screen.findByText("Jane Dev")).toBeInTheDocument();
    expect(screen.getByText("100% skill match")).toBeInTheDocument();
    expect(
      screen.getByText(/within their commute radius/i),
    ).toBeInTheDocument();

    expect(screen.getByText("Sam Coder")).toBeInTheDocument();
    expect(screen.getByText("50% skill match")).toBeInTheDocument();
  });

  it("adds a candidate to the pipeline", async () => {
    const user = userEvent.setup();
    renderDiscovery();

    await screen.findByText("Jane Dev");
    await user.click(
      screen.getAllByRole("button", { name: /add to pipeline/i })[0],
    );

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Added" })).toHaveLength(1),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/candidate-leads",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ candidateUserId: 10, jobPostingId: 1 }),
      }),
    );
  });

  it("hides the AI recommend button and shows a settings link when no API key is set", async () => {
    renderDiscovery();

    await screen.findByText("Jane Dev");
    expect(
      screen.queryByRole("button", { name: /get ai recommendations/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /add an anthropic api key/i }),
    ).toBeInTheDocument();
  });

  it("gets and renders AI recommendations when a key is set", async () => {
    localStorage.setItem("ai.apiKey", "sk-ant-test-123");
    const user = userEvent.setup();
    renderDiscovery();

    await screen.findByText("Jane Dev");
    await user.click(
      screen.getByRole("button", { name: /get ai recommendations/i }),
    );

    expect(await screen.findByText("Top picks")).toBeInTheDocument();
    expect(screen.getByText("Great fit.")).toBeInTheDocument();
  });

  it("shows an error when getting AI recommendations fails", async () => {
    localStorage.setItem("ai.apiKey", "sk-ant-test-123");
    globalThis.fetch = mockFetchByUrl({
      recommendResponse: {
        ok: false,
        json: async () => ({ error: "Invalid Anthropic API key" }),
      },
    });
    const user = userEvent.setup();
    renderDiscovery();

    await screen.findByText("Jane Dev");
    await user.click(
      screen.getByRole("button", { name: /get ai recommendations/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid anthropic api key/i,
    );
  });
});
