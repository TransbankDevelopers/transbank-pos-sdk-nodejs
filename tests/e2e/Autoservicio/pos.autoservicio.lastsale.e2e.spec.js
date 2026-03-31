const { setupSuiteContext } = require("../helpers/suiteContext");
const {
    ACK_BYTE,
    buildMessage,
    captureSend,
    sendReply,
    connectWithPollAck
} = require("../helpers/mockPos");

const { 
    validateBaseSaleFields,
    validateSaleFields,
    validateSharesFields,
    validateAccountFields,
    validateVoucherContent
} = require("../helpers/validationHelpers");

const {
    lastSaleDebitVoucher,
    lastSaleCreditVoucher
 } = require("../helpers/autoservicioVoucherFixtures");

const createConnectedPos = async (suite) => {
    const pos = suite.createAutoservicio();
    await connectWithPollAck(pos);
    return pos;
}

const lastSaleDebitWithVoucherResponsePayload =
            "0260|00|597029414303|IM750164|123456|912108|1000|3331|68|DB|00-00-00|331|P |19032026|102438|" +
            lastSaleDebitVoucher;
const lastSaleCreditWithVoucherResponsePayload =
            "0260|00|597029414300|IM750164|123456|575354|10000|6590|34|CR|||VI|17032026|115006|" +
            lastSaleCreditVoucher +
            "|03|03|3334|CUOTAS SIN INTERES";

describe("POS Autoservicio - Debit last sale", () => {
    const suite = setupSuiteContext();

    it("last sale - approved debit without voucher", async () => {
        const pos = await createConnectedPos(suite);

        const lastSalePromise = pos.getLastSale();
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, "0260|00|597029414300|IM750164|123456|574062|1000|3331|56|DB|10032026|331|P |12032026|171142");
        const response = await lastSalePromise;

        expect(sentMessage).toEqual(buildMessage("0250|0"));
        expect(response.voucher).toBeUndefined();
        validateBaseSaleFields(response, 260, 0, "Aprobado", 597029414300, "IM750164", true);
        validateSaleFields(response, "123456", "574062", 1000, "56", "12032026", "171142");
        validateAccountFields(response, "DB", "P ", 3331, "10032026", "331");
    });

    it("last sale - approved debit with voucher", async () => {
        const pos = await createConnectedPos(suite);

        const lastSalePromise = pos.getLastSale(true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, lastSaleDebitWithVoucherResponsePayload);
        const response = await lastSalePromise;
        const expectedVoucherLines = [
            "COMPROBANTE DE VENTA",
            "TARJETA DE DEBITO",
            "TOTAL:",
            "CODIGO DE AUTORIZACION:",
            "GRACIAS POR SU COMPRA"
        ];

        expect(sentMessage).toEqual(buildMessage("0250|1"));
        validateVoucherContent(response.voucher, expectedVoucherLines);
        validateBaseSaleFields(response, 260, 0, "Aprobado", 597029414303, "IM750164", true);
        validateSaleFields(response, "123456", "912108", 1000, "68", "19032026", "102438");
        validateAccountFields(response, "DB", "P ", 3331, "00-00-00", "331");
    });

});

describe("POS Autoservicio - Credit last sale", () => {
    const suite = setupSuiteContext();

    it("last sale - approved credit with voucher", async () => {
        const pos = await createConnectedPos(suite);

        const lastSalePromise = pos.getLastSale(true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, lastSaleCreditWithVoucherResponsePayload);
        const response = await lastSalePromise;
        const expectedVoucherLines = [
            "COMPROBANTE DE VENTA",
            "PAGO EN CUOTAS",
            "TARJETA DE CREDITO",
            "NUMERO DE CUOTAS",
            "TIPO DE CUOTAS",
            "CUOTAS SIN INTERES"
        ];

        expect(sentMessage).toEqual(buildMessage("0250|1"));
        validateVoucherContent(response.voucher, expectedVoucherLines);
        validateBaseSaleFields(response, 260, 0, "Aprobado", 597029414300, "IM750164", true);
        validateSaleFields(response, "123456", "575354", 10000, "34", "17032026", "115006");
        validateAccountFields(response, "CR", "VI", 6590, "", "");
        validateSharesFields(response, "03", "03", "3334", "CUOTAS SIN INTERES");
    });

    it("last sale - approved credit without voucher", async () => {
        const pos = await createConnectedPos(suite);

        const lastSalePromise = pos.getLastSale();
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, "0260|00|597029414300|IM750164|123456|575354|10000|6590|34|CR|||VI|17032026|115006||03|03|3334|CUOTAS SIN INTERES");
        const response = await lastSalePromise;

        expect(sentMessage).toEqual(buildMessage("0250|0"));
        expect(response.voucher).toBeNull();
        validateBaseSaleFields(response, 260, 0, "Aprobado", 597029414300, "IM750164", true);
        validateSaleFields(response, "123456", "575354", 10000, "34", "17032026", "115006");
        validateAccountFields(response, "CR", "VI", 6590, "", "");
        validateSharesFields(response, "03", "03", "3334", "CUOTAS SIN INTERES");
    });
});
