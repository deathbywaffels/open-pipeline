import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { geocodeAddress } from "./geocoding.service.js";

describe("geocodeAddress", () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns null for an empty address without calling fetch", async () => {
    const result = await geocodeAddress("");
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns parsed coordinates on a successful match", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: "51.5074", lon: "-0.1278" }],
    });

    const result = await geocodeAddress("London, UK");
    expect(result).toEqual({ latitude: 51.5074, longitude: -0.1278 });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain("London%2C%20UK");
    expect(options.headers["User-Agent"]).toBeTruthy();
  });

  it("returns null when there are no results", async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const result = await geocodeAddress("Nowhere, Nowhere");
    expect(result).toBeNull();
  });

  it("returns null when the response is not ok", async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    const result = await geocodeAddress("Somewhere");
    expect(result).toBeNull();
  });

  it("returns null when fetch throws (network error)", async () => {
    global.fetch.mockRejectedValueOnce(new Error("network down"));
    const result = await geocodeAddress("Somewhere");
    expect(result).toBeNull();
  });
});
