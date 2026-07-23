import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children }) => <div>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
}));

const { default: Map } = await import("./Map.jsx");

describe("Map", () => {
  beforeEach(() => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] });
  });

  it("renders the map view", async () => {
    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/no geocoded jobs to show yet/i),
    ).toBeInTheDocument();
  });
});
