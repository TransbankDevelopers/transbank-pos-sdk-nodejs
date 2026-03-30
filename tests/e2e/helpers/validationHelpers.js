const expectResponseFields = (response, expectedFields) => {
    Object.entries(expectedFields).forEach(([field, expectedValue]) => {
        expect(response[field]).toBe(expectedValue);
    });
}

const buildBaseExpectedSaleFields = ({
    functionCode,
    responseCode,
    responseMessage,
    commerceCode,
    terminalId,
    successful,
    ticket,
    authorizationCode,
    amount,
    last4Digits,
    operationNumber,
    cardType,
    accountingDate,
    accountNumber,
    cardBrand,
    realDate,
    realTime
}) => ({
    functionCode,
    responseCode,
    responseMessage,
    commerceCode,
    terminalId,
    successful,
    ticket,
    authorizationCode,
    amount,
    last4Digits,
    operationNumber,
    cardType,
    accountingDate,
    accountNumber,
    cardBrand,
    realDate,
    realTime
});

const validateAutoservicioSaleFields = (
    posResponse,
    functionCode,
    responseCode,
    responseMessage,
    commerceCode,
    terminalId,
    successful,
    ticket,
    authorizationCode,
    amount,
    last4Digits,
    operationNumber,
    cardType,
    accountingDate,
    accountNumber,
    cardBrand,
    realDate,
    realTime,
    shareType,
    sharesNumber,
    sharesAmount,
    sharesTypeComment) => {
    expectResponseFields(posResponse, {
            ...buildBaseExpectedSaleFields({
                functionCode,
                responseCode,
                responseMessage,
                commerceCode,
                terminalId,
                successful,
                ticket,
                authorizationCode,
                amount,
                last4Digits,
                operationNumber,
                cardType,
                accountingDate,
                accountNumber,
                cardBrand,
                realDate,
                realTime
            }),
            shareType: shareType,
            sharesNumber: sharesNumber,
            sharesAmount: sharesAmount,
            sharesTypeComment: sharesTypeComment
        });
};

const validateAutoservicioMulticodeSaleFields = (
    posResponse,
    functionCode,
    responseCode,
    responseMessage,
    commerceCode,
    terminalId,
    successful,
    ticket,
    authorizationCode,
    amount,
    last4Digits,
    operationNumber,
    cardType,
    accountingDate,
    accountNumber,
    cardBrand,
    realDate,
    realTime,
    lenderCommerceCode,
    sharesType,
    sharesNumber,
    sharesAmount,
    sharesTypeComment) => {
    expectResponseFields(posResponse, {
            ...buildBaseExpectedSaleFields({
                functionCode,
                responseCode,
                responseMessage,
                commerceCode,
                terminalId,
                successful,
                ticket,
                authorizationCode,
                amount,
                last4Digits,
                operationNumber,
                cardType,
                accountingDate,
                accountNumber,
                cardBrand,
                realDate,
                realTime
            }),
            lenderCommerceCode: lenderCommerceCode,
            sharesType: sharesType,
            sharesNumber: sharesNumber,
            sharesAmount: sharesAmount,
            sharesTypeGloss: sharesTypeComment
        });
};

const validateVoucherContent = (voucher, expectedLines) => {
    expect(voucher.every(line => line.length === 40)).toBe(true);
    const voucherText = voucher.join('\n');
    expectedLines.forEach((expectedLine) => {
        expect(voucherText).toContain(expectedLine);
    });
};

module.exports = {
    expectResponseFields,
    validateAutoservicioSaleFields,
    validateVoucherContent,
    validateAutoservicioMulticodeSaleFields
};
