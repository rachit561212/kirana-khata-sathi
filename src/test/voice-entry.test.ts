import { describe, expect, it } from "vitest";
import { parseEntry } from "@/lib/voice-entry";

describe("parseEntry", () => {
  it("reads a Hindi spent entry with Devanagari digits", () => {
    expect(parseEntry("रमेश को ५०० रुपये दिए")).toEqual({ amount: 500, kind: "spent", payment: "Cash" });
  });
  it("reads a received UPI entry", () => {
    expect(parseEntry("Gupta ji se 1,200 mile UPI se")).toMatchObject({ amount: 1200, payment: "UPI" });
    expect(parseEntry("गुप्ता जी से 1200 मिले").kind).toBe("received");
  });
});
