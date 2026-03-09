import { describe, it, expect } from "vitest";
import { maskApiKey } from "@/lib/ai-platforms";

describe("maskApiKey", () => {
  it("should mask a normal API key with standard format", () => {
    const key = "sk-test1234567890abcdef";
    const masked = maskApiKey(key);
    expect(masked).toBe("sk-t...cdef");
  });

  it("should mask keys that start with other prefixes", () => {
    const key = "pk-1234567890abcdefghijk";
    const masked = maskApiKey(key);
    expect(masked).toBe("pk-1...hijk");
  });

  it("should handle short keys by masking them completely", () => {
    const key = "short";
    const masked = maskApiKey(key);
    expect(masked).toBe("*****");
  });

  it("should handle very short keys", () => {
    const key = "ab";
    const masked = maskApiKey(key);
    expect(masked).toBe("**");
  });

  it("should handle empty string", () => {
    const masked = maskApiKey("");
    expect(masked).toBe("");
  });

  it("should handle very long keys", () => {
    const key = "sk-" + "a".repeat(100);
    const masked = maskApiKey(key);
    expect(masked).toMatch(/^sk-\.\.\./);
    expect(masked.length).toBeLessThan(key.length);
  });

  it("should preserve structure for keys with hyphens", () => {
    const key = "sk-proj-abc123-xyz789---";
    const masked = maskApiKey(key);
    // Should show first few char and last few chars and ellipsis in between
    expect(masked).toMatch(/^sk-/);
    expect(masked).toContain("...");
    expect(masked).toMatch(/--+$/);
  });

  it("should handle single character keys", () => {
    const key = "a";
    const masked = maskApiKey(key);
    expect(masked).toBe("*");
  });

  it("should handle numeric keys", () => {
    const key = "1234567890123456789012";
    const masked = maskApiKey(key);
    expect(masked).toMatch(/\.\.\./);
    expect(masked.length).toBeLessThan(key.length);
  });

  it("should handle keys with special characters", () => {
    const key = "sk-@#$%^&*()_+-=[]{}|;:',.<>?";
    const masked = maskApiKey(key);
    expect(masked).toContain("...");
  });

  it("should consistently mask the same key", () => {
    const key = "sk-consistent-test-key-12345";
    const mask1 = maskApiKey(key);
    const mask2 = maskApiKey(key);
    expect(mask1).toBe(mask2);
  });
});
