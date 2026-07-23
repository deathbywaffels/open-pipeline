import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Coach from "./Coach.jsx";

function summaryResponse(overrides = {}) {
  return {
    missingSkill: null,
    weeklyStats: {
      jobsPasted: 0,
      applicationsSubmitted: 0,
      stageProgressions: 0,
      interviewsReached: 0,
    },
    ...overrides,
  };
}

function mockFetchByUrl({ suggestionsResponse, fitResponse } = {}) {
  return vi.fn((url, options) => {
    if (url === "/api/coaching/summary") {
      return Promise.resolve({
        ok: true,
        json: async () =>
          summaryResponse({
            missingSkill: { name: "React", count: 3 },
            weeklyStats: {
              jobsPasted: 2,
              applicationsSubmitted: 1,
              stageProgressions: 1,
              interviewsReached: 0,
            },
          }),
      });
    }
    if (
      url === "/api/coaching/role-suggestions" &&
      options?.method === "POST"
    ) {
      return Promise.resolve(
        suggestionsResponse ?? {
          ok: true,
          json: async () => ({
            suggestions: [
              { role: "DevOps Engineer", rationale: "You know Docker." },
            ],
          }),
        },
      );
    }
    if (url === "/api/company-fit/analyze" && options?.method === "POST") {
      return Promise.resolve(
        fitResponse ?? {
          ok: true,
          json: async () => ({
            fitLabel: "strong",
            matchingSkills: ["React"],
            gaps: ["GraphQL"],
            summary: "Good match overall.",
          }),
        },
      );
    }
    return Promise.reject(new Error(`Unexpected fetch to ${url}`));
  });
}

function renderCoach({ initialEntries } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries || ["/coach"]}>
      <Coach />
    </MemoryRouter>,
  );
}

describe("Coach", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the weekly stats and the missing-skill callout", async () => {
    globalThis.fetch = mockFetchByUrl();
    renderCoach();

    expect(await screen.findByText("2")).toBeInTheDocument(); // jobs pasted
    expect(screen.getByText(/react/i)).toBeInTheDocument();
    expect(screen.getByText(/shows up in 3 of the jobs/i)).toBeInTheDocument();
  });

  it("shows a no-clear-gap message when there's no missing skill", async () => {
    globalThis.fetch = vi.fn((url) => {
      if (url === "/api/coaching/summary") {
        return Promise.resolve({
          ok: true,
          json: async () => summaryResponse(),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });
    renderCoach();

    expect(
      await screen.findByText(/no clear skill gap yet/i),
    ).toBeInTheDocument();
  });

  it("hides the AI buttons and shows a settings link when no API key is set", async () => {
    globalThis.fetch = mockFetchByUrl();
    renderCoach();

    await screen.findByText(/no clear skill gap yet|react/i);
    expect(
      screen.queryByRole("button", { name: /get role suggestions/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /check fit/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /add an anthropic api key/i }),
    ).toHaveLength(2);
  });

  it("gets and renders role suggestions when a key is set", async () => {
    localStorage.setItem("ai.apiKey", "sk-ant-test-123");
    globalThis.fetch = mockFetchByUrl();
    const user = userEvent.setup();
    renderCoach();

    await user.click(
      await screen.findByRole("button", { name: /get role suggestions/i }),
    );

    expect(await screen.findByText("DevOps Engineer")).toBeInTheDocument();
    expect(screen.getByText("You know Docker.")).toBeInTheDocument();
  });

  it("shows an error when getting role suggestions fails", async () => {
    localStorage.setItem("ai.apiKey", "sk-ant-test-123");
    globalThis.fetch = mockFetchByUrl({
      suggestionsResponse: {
        ok: false,
        json: async () => ({ error: "Invalid Anthropic API key" }),
      },
    });
    const user = userEvent.setup();
    renderCoach();

    await user.click(
      await screen.findByRole("button", { name: /get role suggestions/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid anthropic api key/i,
    );
  });

  it("checks fit and renders the result when a key is set", async () => {
    localStorage.setItem("ai.apiKey", "sk-ant-test-123");
    globalThis.fetch = mockFetchByUrl();
    const user = userEvent.setup();
    renderCoach();

    await user.type(
      await screen.findByLabelText(/job or company description/i),
      "Looking for a React developer.",
    );
    await user.click(screen.getByRole("button", { name: /^check fit$/i }));

    expect(await screen.findByText(/strong fit/i)).toBeInTheDocument();
    expect(screen.getByText("Good match overall.")).toBeInTheDocument();
    expect(screen.getByText(/matching: react/i)).toBeInTheDocument();
    expect(screen.getByText(/gaps: graphql/i)).toBeInTheDocument();
  });

  it("pre-fills the fit textarea from router state", async () => {
    globalThis.fetch = mockFetchByUrl();
    renderCoach({
      initialEntries: [
        {
          pathname: "/coach",
          state: { fitContext: "Company: Acme B.V.\nNotes: hiring devs" },
        },
      ],
    });

    expect(
      await screen.findByLabelText(/job or company description/i),
    ).toHaveValue("Company: Acme B.V.\nNotes: hiring devs");
  });
});
