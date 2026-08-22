import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import useDebouncedValue from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  afterEach(() => vi.useRealTimers());

  it("só publica o valor mais recente depois do intervalo", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 350),
      { initialProps: { value: "" } }
    );

    rerender({ value: "m" });
    rerender({ value: "mo" });
    rerender({ value: "mouse" });
    act(() => vi.advanceTimersByTime(349));
    expect(result.current).toBe("");

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("mouse");
  });
});
