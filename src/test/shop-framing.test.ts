import { describe, expect, it } from "vitest";
import { shopFraming } from "@/lib/shop-framing";

describe("phone storefront framing", () => {
  it("fits the full nine-unit forecourt at phone widths", () => {
    for (const [width, height] of [[320, 667], [390, 844], [767, 859]]) {
      const frame = shopFraming(width, height);
      expect(frame.mobile).toBe(true);
      const visibleWidth = 2 * frame.distance * Math.tan(Math.PI / 9) * width / height;
      expect(visibleWidth).toBeGreaterThanOrEqual(9 - 0.00001);
      expect(frame.distance).toBeLessThan(26 * frame.fogScale);
    }
  });
  it("preserves the desktop camera mode", () => {
    expect(shopFraming(1280, 1800).mobile).toBe(false);
    expect(shopFraming(812, 859).mobile).toBe(false);
  });
});