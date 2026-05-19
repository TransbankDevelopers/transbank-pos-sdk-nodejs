const INTEGER_PATTERN = /^-?\d+$/;

const normalizeEmptyField = (value, trim = true) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (trim) {
        const trimmedValue = value.trim();
        if (trimmedValue === "") {
            return null;
        }
        return trimmedValue;
    }

    return value;
};

const parseNumber = (value) => {
    const parsedValue = normalizeEmptyField(value);

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
    normalizeEmptyField,
    parseNumber
};
