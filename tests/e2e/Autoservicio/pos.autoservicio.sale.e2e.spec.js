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
    saleDebitVoucher,
    saleCreditVoucher
} = require("../helpers/autoservicioVoucherFixtures");

const createConnectedPos = async (suite) => {
    const pos = suite.createAutoservicio();
    await connectWithPollAck(pos);
    return pos;
};

const saleDebitWithVoucherResponsePayload =
    "0210|00|597029414300|IM750164|123456|547545|1000|3331|55|DB|00-00-00|331|P |18032026|123230|" +
    saleDebitVoucher;
const saleCreditWithVoucherResponsePayload =
    "0210|00|597029414300|IM750164|123456|316557|10000|6590|57|CR|||VI|18032026|123429|" +
    saleCreditVoucher +
    "|03|03|3334|CUOTAS SIN INTERES";
const saleDebitWithoutVoucherResponsePayload =
    "0210|00|597029414300|IM750164|123456|700527|1000|3331|56|DB|00-00-00|331|P |18032026|123307";
const saleCreditWithoutVoucherResponsePayload =
    "0210|00|597029414300|IM750164|123456|776549|10000|6590|58|CR|||VI|18032026|123506||03|03|3334|CUOTAS SIN INTERES";

describe("POS Autoservicio - Debit sale transaction", () => {
    const suite = setupSuiteContext();

    it("performs debit sale and parses approved response with voucher", async () => {
        const pos = await createConnectedPos(suite);

        const salePromise = pos.sale(1000, "123456", false, true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, saleDebitWithVoucherResponsePayload);
        const response = await salePromise;

        const expectedVoucherLines = [
            "COMPROBANTE DE VENTA",
            "TARJETA DE DEBITO",
            "TOTAL:",
            "CODIGO DE AUTORIZACION:",
            "GRACIAS POR SU COMPRA"
        ];

        expect(sentMessage).toEqual(buildMessage("0200|1000|123456|1|0"));
        validateVoucherContent(response.printingField, expectedVoucherLines);
        expect(response.rawVoucher).toBe(saleDebitVoucher);
        expect(response.rawResponse).toBe(saleDebitWithVoucherResponsePayload);
        validateBaseSaleFields(
            response,
            "0210",
            0,
            "Aprobado",
            597029414300,
            "IM750164",
            true
        );
        validateSaleFields(
            response,
            "123456",
            "547545",
            1000,
            55,
            "18032026",
            "123230"
        );
        validateAccountFields(response, "DB", "P", 3331, "00-00-00", "331");
    });

    it("performs debit sale and parses approved response without voucher", async () => {
        const pos = await createConnectedPos(suite);

        const salePromise = pos.sale(1000, "123456");
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, saleDebitWithoutVoucherResponsePayload);
        const response = await salePromise;

        expect(sentMessage).toEqual(buildMessage("0200|1000|123456|0|0"));
        expect(response.printingField).toBeNull();
        expect(response.rawVoucher).toBeNull();
        expect(response.rawResponse).toBe(
            saleDebitWithoutVoucherResponsePayload
        );
        validateBaseSaleFields(
            response,
            "0210",
            0,
            "Aprobado",
            597029414300,
            "IM750164",
            true
        );
        validateSaleFields(
            response,
            "123456",
            "700527",
            1000,
            56,
            "18032026",
            "123307"
        );
        validateAccountFields(response, "DB", "P", 3331, "00-00-00", "331");
    });
});
describe("POS Autoservicio - Credit sale transaction", () => {
    const suite = setupSuiteContext();

    it("performs credit sale and parses approved response with voucher", async () => {
        const pos = await createConnectedPos(suite);

        const salePromise = pos.sale(1000, "123456", false, true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, saleCreditWithVoucherResponsePayload);
        const response = await salePromise;

        const expectedVoucherLines = [
            "COMPROBANTE DE VENTA",
            "PAGO EN CUOTAS",
            "TARJETA DE CREDITO",
            "NUMERO DE CUOTAS",
            "TIPO DE CUOTAS",
            "CUOTAS SIN INTERES"
        ];

        expect(sentMessage).toEqual(buildMessage("0200|1000|123456|1|0"));
        validateVoucherContent(response.printingField, expectedVoucherLines);
        expect(response.rawVoucher).toBe(saleCreditVoucher);
        expect(response.rawResponse).toBe(saleCreditWithVoucherResponsePayload);
        validateBaseSaleFields(
            response,
            "0210",
            0,
            "Aprobado",
            597029414300,
            "IM750164",
            true
        );
        validateSaleFields(
            response,
            "123456",
            "316557",
            10000,
            57,
            "18032026",
            "123429"
        );
        validateAccountFields(response, "CR", "VI", 6590, null, null);
        validateSharesFields(response, 3, 3, 3334, "CUOTAS SIN INTERES");
    });

    it("performs credit sale and parses approved response without voucher", async () => {
        const pos = await createConnectedPos(suite);

        const salePromise = pos.sale(10000, "123456");
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, saleCreditWithoutVoucherResponsePayload);
        const response = await salePromise;

        expect(sentMessage).toEqual(buildMessage("0200|10000|123456|0|0"));
        expect(response.printingField).toBeNull();
        expect(response.rawVoucher).toBeNull();
        expect(response.rawResponse).toBe(
            saleCreditWithoutVoucherResponsePayload
        );
        validateBaseSaleFields(
            response,
            "0210",
            0,
            "Aprobado",
            597029414300,
            "IM750164",
            true
        );
        validateSaleFields(
            response,
            "123456",
            "776549",
            10000,
            58,
            "18032026",
            "123506"
        );
        validateAccountFields(response, "CR", "VI", 6590, null, null);
        validateSharesFields(response, 3, 3, 3334, "CUOTAS SIN INTERES");
    });
});
