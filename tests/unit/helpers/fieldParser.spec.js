const {
    normalizeEmptyField,
    parseNumber
} = require("../../../src/helpers/fieldParser");

describe("normalizeEmptyField", () => {
    it("returns null when value is missing or empty", () => {
        expect(normalizeEmptyField(undefined)).toBeNull();
        expect(normalizeEmptyField(null)).toBeNull();
        expect(normalizeEmptyField("")).toBeNull();
        expect(normalizeEmptyField("   ")).toBeNull();
    });

    it("returns trimmed string values by default", () => {
        expect(normalizeEmptyField("ABC123")).toBe("ABC123");
        expect(normalizeEmptyField("  ********331      ")).toBe("********331");
        expect(normalizeEmptyField("P ")).toBe("P");
        expect(normalizeEmptyField("  hello world  ")).toBe("hello world");
    });

    it("returns untrimmed string values when trim is false", () => {
        expect(normalizeEmptyField("ABC123", false)).toBe("ABC123");
        expect(normalizeEmptyField("  ********331      ", false)).toBe(
            "  ********331      "
        );
        expect(normalizeEmptyField("P ", false)).toBe("P ");
        expect(normalizeEmptyField("  hello world  ", false)).toBe(
            "  hello world  "
        );
    });
});

describe("parseNumber", () => {
    it("returns null when value is missing, empty, or not an integer", () => {
        expect(parseNumber(undefined)).toBeNull();
        expect(parseNumber(null)).toBeNull();
        expect(parseNumber("")).toBeNull();
        expect(parseNumber("   ")).toBeNull();
        expect(parseNumber("123abc")).toBeNull();
        expect(parseNumber("12.3")).toBeNull();
        expect(parseNumber("abc123")).toBeNull();
    });

    it("parses strict integer values", () => {
        expect(parseNumber("0")).toBe(0);
        expect(parseNumber("00123")).toBe(123);
        expect(parseNumber(" 123 ")).toBe(123);
        expect(parseNumber("-123")).toBe(-123);
    });
});
