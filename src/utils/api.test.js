import { describe, it, expect } from "vitest";
import {
  sanitizeInput,
  calculateDaysRemaining,
  parseAIResponse,
} from "./api.js";

describe("API Utilities", () => {
  describe("sanitizeInput", () => {
    it("strips HTML tags", () => {
      const html = "<p>Test <strong>bold</strong></p>";
      expect(sanitizeInput(html)).toBe("Test bold");
    });

    it("removes dangerous characters", () => {
      const dangerous = "hello 'world' \"test\" `backtick`";
      expect(sanitizeInput(dangerous)).toBe("hello world test backtick");
    });

    it("trims whitespace", () => {
      const untrimmed = "  hello world   ";
      expect(sanitizeInput(untrimmed)).toBe("hello world");
    });
  });

  describe("calculateDaysRemaining", () => {
    it("returns correct countdown for future dates", () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const futureStr = future.toISOString().split("T")[0];
      expect(calculateDaysRemaining(futureStr)).toBe(5);
    });

    it("returns 0 for today", () => {
      const todayStr = new Date().toISOString().split("T")[0];
      expect(calculateDaysRemaining(todayStr)).toBe(0);
    });

    it("returns negative for past dates", () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      const pastStr = past.toISOString().split("T")[0];
      expect(calculateDaysRemaining(pastStr)).toBe(-5);
    });
  });

  describe("parseAIResponse", () => {
    it("parses valid JSON string", () => {
      const text = '{"test": 123}';
      expect(parseAIResponse(text)).toEqual({ test: 123 });
    });

    it("parses JSON inside markdown blocks", () => {
      const markdown = '```json\n{"test": 123}\n```';
      expect(parseAIResponse(markdown)).toEqual({ test: 123 });
    });

    it("falls back to extracting the first object match", () => {
      const loose = 'Here is the response: {"test": 123} and some other text';
      expect(parseAIResponse(loose)).toEqual({ test: 123 });
    });

    it("throws error for invalid JSON", () => {
      const invalid = "not json";
      expect(() => parseAIResponse(invalid)).toThrow("Could not parse AI response");
    });
  });
});
