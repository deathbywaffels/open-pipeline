import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Settings from "./Settings.jsx";

const mockUpdateUser = vi.fn();
let mockNeedsSponsorship = true;
let mockIsPublic = false;
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: "Jane",
      needsSponsorship: mockNeedsSponsorship,
      commuteRadiusKm: 50,
      isPublic: mockIsPublic,
    },
    updateUser: mockUpdateUser,
  }),
}));

// Settings.jsx and its child DesiredLocationList each fetch independently
// on mount, in an order React doesn't guarantee — a URL-aware mock (not a
// positional mockResolvedValueOnce chain) is what makes these tests robust
// to that, matching the pattern already used for multi-fetch pages like
// Home.test.jsx.
function mockFetchByUrl({ patchResponse } = {}) {
  return vi.fn((url, options) => {
    if (url === "/api/quest/today") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          count: 0,
          target: 3,
          metToday: false,
          paste: { count: 0, target: 2, metToday: false },
          reachOut: { count: 0, target: 1, metToday: false },
          checkedInToday: true,
        }),
      });
    }
    if (url === "/api/desired-locations") {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    if (url === "/api/user/settings" && options?.method === "PATCH") {
      return Promise.resolve(
        patchResponse ?? {
          ok: true,
          json: async () => ({
            dailyQuestTarget: 3,
            dailyPasteTarget: 2,
            dailyReachOutTarget: 1,
            needsSponsorship: true,
            commuteRadiusKm: 50,
            isPublic: false,
          }),
        },
      );
    }
    return Promise.reject(new Error(`Unexpected fetch to ${url}`));
  });
}

function patchCall(fetchMock) {
  return fetchMock.mock.calls.find(([url]) => url === "/api/user/settings");
}

describe("Settings", () => {
  beforeEach(() => {
    mockUpdateUser.mockReset();
    mockNeedsSponsorship = true;
    mockIsPublic = false;
  });

  it("hides the reach-out target field when sponsorship is off", async () => {
    mockNeedsSponsorship = false;
    globalThis.fetch = mockFetchByUrl();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await screen.findByLabelText(/daily application quest target/i);
    expect(
      screen.queryByLabelText(/daily companies-reached-out-to target/i),
    ).not.toBeInTheDocument();
  });

  it("loads and displays the current daily quest target", async () => {
    globalThis.fetch = mockFetchByUrl();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    expect(
      await screen.findByLabelText(/daily application quest target/i),
    ).toHaveValue(3);
  });

  it("loads and displays the current paste and reach-out targets", async () => {
    globalThis.fetch = mockFetchByUrl();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    expect(
      await screen.findByLabelText(/daily jobs-pasted target/i),
    ).toHaveValue(2);
    expect(
      screen.getByLabelText(/daily companies-reached-out-to target/i),
    ).toHaveValue(1);
  });

  it("saves an updated target", async () => {
    globalThis.fetch = mockFetchByUrl({
      patchResponse: {
        ok: true,
        json: async () => ({
          dailyQuestTarget: 5,
          dailyPasteTarget: 2,
          dailyReachOutTarget: 1,
          needsSponsorship: true,
          commuteRadiusKm: 50,
          isPublic: false,
        }),
      },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    const input = await screen.findByLabelText(
      /daily application quest target/i,
    );
    await user.clear(input);
    await user.type(input, "5");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Saved.")).toBeInTheDocument());
    const [, options] = patchCall(globalThis.fetch);
    expect(JSON.parse(options.body)).toEqual({
      dailyQuestTarget: 5,
      dailyPasteTarget: 2,
      dailyReachOutTarget: 1,
      needsSponsorship: true,
      commuteRadiusKm: 50,
      isPublic: false,
    });
  });

  it("toggles needsSponsorship, saves it, and updates the auth context", async () => {
    globalThis.fetch = mockFetchByUrl({
      patchResponse: {
        ok: true,
        json: async () => ({
          dailyQuestTarget: 3,
          dailyPasteTarget: 2,
          dailyReachOutTarget: 1,
          needsSponsorship: false,
          commuteRadiusKm: 50,
          isPublic: false,
        }),
      },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await screen.findByLabelText(/daily application quest target/i);
    await user.click(screen.getByLabelText(/i need visa sponsorship/i));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith({
        needsSponsorship: false,
        commuteRadiusKm: 50,
        isPublic: false,
      }),
    );
    const [, options] = patchCall(globalThis.fetch);
    expect(JSON.parse(options.body).needsSponsorship).toBe(false);
  });

  it("toggles isPublic, saves it, and updates the auth context", async () => {
    globalThis.fetch = mockFetchByUrl({
      patchResponse: {
        ok: true,
        json: async () => ({
          dailyQuestTarget: 3,
          dailyPasteTarget: 2,
          dailyReachOutTarget: 1,
          needsSponsorship: true,
          commuteRadiusKm: 50,
          isPublic: true,
        }),
      },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await screen.findByLabelText(/daily application quest target/i);
    await user.click(
      screen.getByLabelText(/make my profile visible to employers/i),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith({
        needsSponsorship: true,
        commuteRadiusKm: 50,
        isPublic: true,
      }),
    );
    const [, options] = patchCall(globalThis.fetch);
    expect(JSON.parse(options.body).isPublic).toBe(true);
  });

  it("shows an error when saving fails", async () => {
    globalThis.fetch = mockFetchByUrl({
      patchResponse: {
        ok: false,
        json: async () => ({
          error: "dailyQuestTarget must be a positive integer",
        }),
      },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /positive integer/i,
    );
  });
});

describe("Settings — AI extraction", () => {
  beforeEach(() => {
    globalThis.fetch = mockFetchByUrl();
    localStorage.clear();
  });

  it("saves an API key and model to localStorage", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    const keyInput = await screen.findByLabelText(/anthropic api key/i);
    await user.type(keyInput, "sk-ant-test-123");
    await user.selectOptions(
      screen.getByLabelText(/model/i),
      "claude-haiku-4-5",
    );
    await user.click(screen.getByRole("button", { name: /save key/i }));

    expect(await screen.findAllByText("Saved.")).not.toHaveLength(0);
    expect(localStorage.getItem("ai.apiKey")).toBe("sk-ant-test-123");
    expect(localStorage.getItem("ai.model")).toBe("claude-haiku-4-5");
  });

  it("clears a stored key", async () => {
    localStorage.setItem("ai.apiKey", "sk-ant-existing");
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /clear key/i }));

    expect(localStorage.getItem("ai.apiKey")).toBeNull();
  });
});
