import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children, center, pathOptions }) => (
    <div
      data-testid="pin"
      data-lat={center[0]}
      data-lng={center[1]}
      data-color={pathOptions.fillColor}
    >
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}));

const { MapView } = await import("./MapView.jsx");

const pins = [
  {
    id: 1,
    title: "Backend Engineer",
    company: "Acme",
    latitude: 51.5074,
    longitude: -0.1278,
    stage: "LIKED",
    pinColor: "blue",
  },
  {
    id: 2,
    title: "Rejected Role",
    company: "Acme",
    latitude: 40.7128,
    longitude: -74.006,
    stage: "REJECTED",
    pinColor: "grey",
  },
];

describe("MapView", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("shows an empty state when there are no geocoded jobs", async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    render(<MapView />);
    expect(
      await screen.findByText(/no geocoded jobs to show yet/i),
    ).toBeInTheDocument();
  });

  it("renders one pin per job with the correct color and popup content", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => pins,
    });
    render(<MapView />);

    const renderedPins = await screen.findAllByTestId("pin");
    expect(renderedPins).toHaveLength(2);
    expect(renderedPins[0]).toHaveAttribute("data-color", "#8b5cf6");
    expect(renderedPins[1]).toHaveAttribute("data-color", "#9ca3af");
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Rejected Role")).toBeInTheDocument();
  });
});
