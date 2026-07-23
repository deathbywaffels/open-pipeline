import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestWidget } from "./QuestWidget.jsx";

let mockNeedsSponsorship = true;
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { id: 1, needsSponsorship: mockNeedsSponsorship } }),
}));

function questResponse(overrides = {}) {
  return {
    count: 1,
    target: 3,
    metToday: false,
    paste: { count: 0, target: 2, metToday: false },
    reachOut: { count: 0, target: 1, metToday: false },
    checkedInToday: true,
    ...overrides,
  };
}

describe("QuestWidget", () => {
  beforeEach(() => {
    mockNeedsSponsorship = true;
    globalThis.fetch = vi.fn();
  });

  it("shows the count and target once loaded", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => questResponse(),
    });
    render(<QuestWidget />);
    expect(
      await screen.findByText("1 / 3 applications today"),
    ).toBeInTheDocument();
  });

  it("renders nothing before the quest has loaded", () => {
    globalThis.fetch.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<QuestWidget />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the pasted-jobs goal", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        questResponse({ paste: { count: 1, target: 2, metToday: false } }),
    });
    render(<QuestWidget />);
    expect(await screen.findByText("Jobs pasted")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("shows the reach-out goal when sponsorship is needed", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        questResponse({ reachOut: { count: 1, target: 1, metToday: true } }),
    });
    render(<QuestWidget />);
    expect(
      await screen.findByText("Companies reached out to"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 1 ✓")).toBeInTheDocument();
  });

  it("hides the reach-out goal when sponsorship is off", async () => {
    mockNeedsSponsorship = false;
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => questResponse(),
    });
    render(<QuestWidget />);
    await screen.findByText("Jobs pasted");
    expect(
      screen.queryByText("Companies reached out to"),
    ).not.toBeInTheDocument();
  });

  it("shows the checked-in-today row", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => questResponse(),
    });
    render(<QuestWidget />);
    expect(await screen.findByText("Checked in today")).toBeInTheDocument();
  });
});
