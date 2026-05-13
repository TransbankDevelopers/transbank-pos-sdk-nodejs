const expectResponseFields = (response, expectedFields) => {
    Object.entries(expectedFields).forEach(([field, expectedValue]) => {
        expect(response[field]).toBe(expectedValue);
    });
};

const validateBaseSaleFields = (
    response,
    functionCode,
    responseCode,
    responseMessage,
    commerceCode,
    terminalId,
    success
) => {
    expectResponseFields(response, {
        functionCode: functionCode,
        responseCode: responseCode,
        responseMessage: responseMessage,
        commerceCode: commerceCode,
        terminalId: terminalId,
        success: success
    });
};

const validateSaleFields = (
    response,
    ticket,
    authorizationCode,
    amount,
    operationNumber,
    realDate,
    realTime
) => {
    expectResponseFields(response, {
        ticket: ticket,
        authorizationCode: authorizationCode,
        amount: amount,
        operationNumber: operationNumber,
        realDate: realDate,
        realTime: realTime
    });
};

const validateSharesFields = (
    response,
    installmentsType,
    installmentsNumber,
    installmentsAmount,
    InstallmentsTypeDescription
) => {
    expectResponseFields(response, {
        installmentsType: installmentsType,
        installmentsNumber: installmentsNumber,
        installmentsAmount: installmentsAmount,
        InstallmentsTypeDescription: InstallmentsTypeDescription
    });
};

const validateAccountFields = (
    response,
    cardType,
    cardBrand,
    last4Digits,
    accountingDate,
    accountNumber
) => {
    expectResponseFields(response, {
        cardType: cardType,
        cardBrand: cardBrand,
        last4Digits: last4Digits,
        accountingDate: accountingDate,
        accountNumber: accountNumber
    });
};

const validateVoucherContent = (voucher, expectedLines) => {
    expect(voucher.every((line) => line.length === 40)).toBe(true);
    const voucherText = voucher.join("\n");
    expectedLines.forEach((expectedLine) => {
        expect(voucherText).toContain(expectedLine);
    });
};

module.exports = {
    expectResponseFields,
    validateBaseSaleFields,
    validateSaleFields,
    validateSharesFields,
    validateAccountFields,
    validateVoucherContent
};
