import { describe, it, expect } from "@jest/globals";
import { getPinColor } from "./mapPin.service.js";

describe("getPinColor", () => {
  it("returns grey for REJECTED", () => {
    expect(getPinColor("REJECTED")).toBe("grey");
  });

  it("returns blue for LIKED", () => {
    expect(getPinColor("LIKED")).toBe("blue");
  });

  it.each([
    "APPLIED",
    "PHONE_SCREEN",
    "TECHNICAL_INTERVIEW",
    "INTERVIEW",
    "OFFER",
  ])("returns green for %s", (stage) => {
    expect(getPinColor(stage)).toBe("green");
  });

  it("throws for an unknown stage", () => {
    expect(() => getPinColor("NOT_A_STAGE")).toThrow();
  });
});
