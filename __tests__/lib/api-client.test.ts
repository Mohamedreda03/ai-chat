import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/api-client";

describe("ApiError", () => {
  it("should create an error with message and status", () => {
    const error = new ApiError(400, "INVALID_REQUEST", "Test error");
    expect(error.message).toBe("Test error");
    expect(error.status).toBe(400);
    expect(error.code).toBe("INVALID_REQUEST");
  });

  it("should extend Error class", () => {
    const error = new ApiError(500, "INTERNAL_ERROR", "Test error");
    expect(error instanceof Error).toBe(true);
  });

  it("should have correct error name", () => {
    const error = new ApiError(400, "BAD_REQUEST", "Test");
    expect(error.name).toBe("ApiError");
  });

  it("should preserve stack trace for debugging", () => {
    const error = new ApiError(400, "BAD_REQUEST", "Test");
    expect(error.stack).toBeDefined();
  });

  it("should handle missing error code gracefully", () => {
    const error = new ApiError(400, "UNKNOWN", "Test");
    expect(error.status).toBe(400);
    expect(error.message).toBe("Test");
  });

  it("should handle different HTTP status codes", () => {
    const tests = [
      { status: 400, expected: 400 },
      { status: 401, expected: 401 },
      { status: 403, expected: 403 },
      { status: 404, expected: 404 },
      { status: 500, expected: 500 },
      { status: 503, expected: 503 },
    ];

    tests.forEach(({ status, expected }) => {
      const error = new ApiError(status, "TEST", "Test");
      expect(error.status).toBe(expected);
    });
  });

  it("should be serializable", () => {
    const error = new ApiError(400, "BAD_REQUEST", "Test error");
    const json = JSON.stringify(error, null, 2);
    expect(json).toContain("BAD_REQUEST");
    expect(json).toContain("400");
    expect(error.message).toBe("Test error");
  });
});
