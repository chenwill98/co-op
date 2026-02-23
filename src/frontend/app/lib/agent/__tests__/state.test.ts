import { describe, it, expect } from "vitest";
import { deepMergeFilters } from "../state";
import type { ClaudeResponse } from "../../claudeQueryParser";

describe("deepMergeFilters", () => {
  it("returns right when left is empty", () => {
    const right: ClaudeResponse = { neighborhood: ["chelsea"] };
    expect(deepMergeFilters({}, right)).toEqual(right);
  });

  it("returns left when right is empty", () => {
    const left: ClaudeResponse = { neighborhood: ["chelsea"] };
    expect(deepMergeFilters(left, {})).toEqual(left);
  });

  it("returns right when left is null-ish", () => {
    const right: ClaudeResponse = { no_fee: true };
    expect(deepMergeFilters(null as unknown as ClaudeResponse, right)).toEqual(right);
  });

  it("merges range fields independently (min only)", () => {
    const left: ClaudeResponse = { price: { min: 1000, max: 5000 } };
    const right: ClaudeResponse = { price: { min: 2000, max: null } };
    expect(deepMergeFilters(left, right)).toEqual({
      price: { min: 2000, max: 5000 },
    });
  });

  it("merges range fields independently (max only)", () => {
    const left: ClaudeResponse = { price: { min: 1000, max: 5000 } };
    const right: ClaudeResponse = { price: { min: null, max: 3000 } };
    expect(deepMergeFilters(left, right)).toEqual({
      price: { min: 1000, max: 3000 },
    });
  });

  it("replaces arrays entirely", () => {
    const left: ClaudeResponse = { neighborhood: ["chelsea", "soho"] };
    const right: ClaudeResponse = { neighborhood: ["williamsburg"] };
    expect(deepMergeFilters(left, right)).toEqual({
      neighborhood: ["williamsburg"],
    });
  });

  it("preserves unrelated fields from left", () => {
    const left: ClaudeResponse = {
      neighborhood: ["chelsea"],
      no_fee: true,
    };
    const right: ClaudeResponse = { price: { min: null, max: 4000 } };
    expect(deepMergeFilters(left, right)).toEqual({
      neighborhood: ["chelsea"],
      no_fee: true,
      price: { min: null, max: 4000 },
    });
  });

  it("overrides primitive values", () => {
    const left: ClaudeResponse = { no_fee: false };
    const right: ClaudeResponse = { no_fee: true };
    expect(deepMergeFilters(left, right)).toEqual({ no_fee: true });
  });

  it("removes a filter when right sets it to null", () => {
    const left: ClaudeResponse = { no_fee: true, neighborhood: ["chelsea"] };
    const right: ClaudeResponse = { no_fee: null } as unknown as ClaudeResponse;
    expect(deepMergeFilters(left, right)).toEqual({ neighborhood: ["chelsea"] });
  });

  it("removes a range filter when right sets it to null", () => {
    const left: ClaudeResponse = { price: { min: null, max: 3000 }, neighborhood: ["chelsea"] };
    const right: ClaudeResponse = { price: null } as unknown as ClaudeResponse;
    expect(deepMergeFilters(left, right)).toEqual({ neighborhood: ["chelsea"] });
  });

  it("removes an array filter when right sets it to null", () => {
    const left: ClaudeResponse = { neighborhood: ["chelsea"], no_fee: true };
    const right: ClaudeResponse = { neighborhood: null } as unknown as ClaudeResponse;
    expect(deepMergeFilters(left, right)).toEqual({ no_fee: true });
  });

  it("skips undefined values in right", () => {
    const left: ClaudeResponse = { no_fee: true };
    const right: ClaudeResponse = { no_fee: undefined } as unknown as ClaudeResponse;
    expect(deepMergeFilters(left, right)).toEqual({ no_fee: true });
  });
});
