const INTEGER_PATTERN = /^-?\d+$/;

const parseString = (value) => {
    if (typeof value === "undefined" || value === null || value === "") {
        return null;
    }

    return value;
};

const parseNumber = (value) => {
    const parsedValue = parseString(value);

    if (parsedValue === null) {
        return null;
    }

    const normalizedValue = parsedValue.trim();

    if (!INTEGER_PATTERN.test(normalizedValue)) {
        return null;
    }

    return Number.parseInt(normalizedValue, 10);
};

module.exports = {
    parseString,
    parseNumber
};
