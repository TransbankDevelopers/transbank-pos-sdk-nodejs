const {
    parseString,
    parseNumber
} = require("../../../src/helpers/fieldParser");

describe("parseString", () => {
    it("returns null when value is missing or empty", () => {
        expect(parseString(undefined)).toBeNull();
        expect(parseString(null)).toBeNull();
        expect(parseString("")).toBeNull();
    });

    it("returns string values without trimming spaces", () => {
        expect(parseString("ABC123")).toBe("ABC123");
        expect(parseString("  ********331      ")).toBe("  ********331      ");
        expect(parseString("P ")).toBe("P ");
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
