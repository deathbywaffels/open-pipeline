import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DesiredLocationList } from "./DesiredLocationList.jsx";

describe("DesiredLocationList", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("loads and displays existing locations", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, label: "Amsterdam", latitude: 52.37, longitude: 4.9 },
      ],
    });

    render(<DesiredLocationList />);

    expect(await screen.findByText("Amsterdam")).toBeInTheDocument();
  });

  it("adds a new location", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // initial load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          label: "Utrecht",
          latitude: 52.09,
          longitude: 5.12,
        }),
      }); // add
    const user = userEvent.setup();

    render(<DesiredLocationList />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText(/city, country/i), "Utrecht");
    await user.click(screen.getByRole("button", { name: /add/i }));

    expect(await screen.findByText("Utrecht")).toBeInTheDocument();
  });

  it("removes a location", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 1, label: "Amsterdam", latitude: 52.37, longitude: 4.9 },
        ],
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // delete
    const user = userEvent.setup();

    render(<DesiredLocationList />);
    await screen.findByText("Amsterdam");

    await user.click(screen.getByRole("button", { name: /remove amsterdam/i }));

    await waitFor(() =>
      expect(screen.queryByText("Amsterdam")).not.toBeInTheDocument(),
    );
  });

  it("shows a retry-geocode button only for locations that failed to resolve", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, label: "Amsterdam", latitude: 52.37, longitude: 4.9 },
        { id: 2, label: "Nowhere", latitude: null, longitude: null },
      ],
    });

    render(<DesiredLocationList />);
    await screen.findByText("Amsterdam");

    expect(
      screen.queryByRole("button", { name: /retry locating amsterdam/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /retry locating nowhere/i }),
    ).toBeInTheDocument();
  });

  it("retries geocoding and updates the location on success", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 1, label: "Nowhere", latitude: null, longitude: null },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          label: "Nowhere",
          latitude: 52.37,
          longitude: 4.9,
        }),
      });
    const user = userEvent.setup();

    render(<DesiredLocationList />);
    await user.click(
      await screen.findByRole("button", { name: /retry locating nowhere/i }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /retry locating nowhere/i }),
      ).not.toBeInTheDocument(),
    );
    expect(globalThis.fetch.mock.calls[1][0]).toBe(
      "/api/desired-locations/1/geocode",
    );
  });
});
