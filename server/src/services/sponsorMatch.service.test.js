import { describe, it, expect } from "@jest/globals";
import {
  normalizeCompanyName,
  isRecognizedSponsor,
} from "./sponsorMatch.service.js";

describe("normalizeCompanyName", () => {
  it("trims, lowercases, and collapses internal whitespace", () => {
    expect(normalizeCompanyName("  Acme   B.V.  ")).toBe("acme b.v.");
  });
});

describe("isRecognizedSponsor", () => {
  it("returns true for a case/whitespace-insensitive match", () => {
    const sponsors = new Set(["acme b.v.", "globex nv"]);
    expect(isRecognizedSponsor("  ACME   b.v.  ", sponsors)).toBe(true);
  });

  it("returns false when the company isn't in the set", () => {
    const sponsors = new Set(["acme b.v."]);
    expect(isRecognizedSponsor("Initech", sponsors)).toBe(false);
  });

  it("returns false against an empty set", () => {
    expect(isRecognizedSponsor("Acme B.V.", new Set())).toBe(false);
  });
});
