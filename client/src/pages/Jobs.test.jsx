import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Jobs from "./Jobs.jsx";

let mockNeedsSponsorship = true;
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { id: 1, needsSponsorship: mockNeedsSponsorship } }),
}));

describe("Jobs", () => {
  beforeEach(() => {
    mockNeedsSponsorship = true;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: "Backend Engineer",
          company: "Acme Inc",
          locationText: "Remote",
        },
      ],
    });
  });

  it("lists previously pasted jobs", async () => {
    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
  });

  it("shows an empty state when there are no jobs", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no jobs pasted yet/i)).toBeInTheDocument();
  });

  it("shows a retry-geocoding button only for jobs missing coordinates", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: "No Coords",
          company: "Acme",
          locationText: "Remote",
          latitude: null,
        },
        {
          id: 2,
          title: "Has Coords",
          company: "Acme",
          locationText: "London",
          latitude: 51.5,
        },
      ],
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>,
    );

    await screen.findByText("No Coords");
    expect(
      screen.getAllByRole("button", { name: /retry map location/i }),
    ).toHaveLength(1);
  });

  it("retries geocoding and updates the job on success", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            title: "No Coords",
            company: "Acme",
            locationText: "Remote",
            latitude: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: "No Coords",
          company: "Acme",
          locationText: "Remote",
          latitude: 51.5,
        }),
      });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: /retry map location/i }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /retry map location/i }),
      ).not.toBeInTheDocument(),
    );
    expect(globalThis.fetch.mock.calls[1][0]).toBe(
      "/api/job-listings/1/geocode",
    );
  });

  it("shows a red flag only for jobs not on the sponsor list", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: "Not Sponsored",
          company: "Initech",
          isRecognizedSponsor: false,
        },
        {
          id: 2,
          title: "Sponsored",
          company: "Acme B.V.",
          isRecognizedSponsor: true,
        },
      ],
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>,
    );

    await screen.findByText("Not Sponsored");
    expect(
      screen.getByText(/not an ind-recognized sponsor/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/not an ind-recognized sponsor/i)).toHaveLength(
      1,
    );
  });

  it("hides the sponsor red flag when the user has turned off sponsorship", async () => {
    mockNeedsSponsorship = false;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: "Not Sponsored",
          company: "Initech",
          isRecognizedSponsor: false,
        },
      ],
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>,
    );

    await screen.findByText("Not Sponsored");
    expect(
      screen.queryByText(/not an ind-recognized sponsor/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/sponsor recognized/i)).not.toBeInTheDocument();
  });

  it("shows a location flag for jobs outside the desired area", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: "Far Away",
          company: "Acme",
          isInDesiredLocation: false,
        },
        {
          id: 2,
          title: "Nearby",
          company: "Acme",
          isInDesiredLocation: true,
        },
      ],
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>,
    );

    await screen.findByText("Far Away");
    expect(screen.getByText(/outside your desired area/i)).toBeInTheDocument();
  });

  it("filters the list to jobs in the desired area", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: "Far Away",
          company: "Acme",
          isInDesiredLocation: false,
        },
        {
          id: 2,
          title: "Nearby",
          company: "Acme",
          isInDesiredLocation: true,
        },
      ],
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>,
    );

    await screen.findByText("Far Away");
    await user.click(screen.getByLabelText(/in my desired area/i));

    expect(screen.queryByText("Far Away")).not.toBeInTheDocument();
    expect(screen.getByText("Nearby")).toBeInTheDocument();
  });

  it("filters the list to sponsor-recognized companies", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: "Not Sponsored",
          company: "Initech",
          isRecognizedSponsor: false,
        },
        {
          id: 2,
          title: "Sponsored",
          company: "Acme B.V.",
          isRecognizedSponsor: true,
        },
      ],
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>,
    );

    await screen.findByText("Not Sponsored");
    await user.click(screen.getByLabelText(/sponsor recognized/i));

    expect(screen.queryByText("Not Sponsored")).not.toBeInTheDocument();
    expect(screen.getByText("Sponsored")).toBeInTheDocument();
  });
});
