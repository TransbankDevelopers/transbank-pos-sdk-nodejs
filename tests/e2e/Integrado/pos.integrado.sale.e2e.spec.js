const { setupSuiteContext } = require("../helpers/suiteContext");
const {
    ACK_BYTE,
    buildMessage,
    captureSend,
    sendReply,
    connectWithPollAck
} = require("../helpers/mockPos");

const {
    normalSaleCreditVoucher
} = require("../helpers/integradoVoucherFixtures");

const {
    validateBaseSaleFields,
    validateSaleFields,
    validateAccountFields,
    validateVoucherContent
} = require("../helpers/validationHelpers");

const createConnectedPos = async (suite) => {
    const pos = suite.createIntegrado();
    await connectWithPollAck(pos);
    return pos;
};

const expectedVoucherLines = [
    "MONTO VENTA:                     $32.773",
    "           RUT: 11.111.111-1            ",
    "OPERACION: 000156   AUTORIZACION: 532264"
];

const normalSaleCreditWithVoucherResponsePayload =
    "0210|00|597029414300|IT750870|ABC123|532264|39000|00||6590|000156|CR|000000|3000000000000000000|VI|07052026|161140||0|" +
    normalSaleCreditVoucher +
    "|";

const normalSaleWithOutVoucherResponsePayload =
    "0210|00|597029414300|IT750870|ABC123|144809|35000|03|11668|6590|000155|CR|003000|3000000000000000000|VI|07052026|152829||0||";

const canceledSaleResponsePayload =
    "0210|07|597029414300|IT750870|ABC123||80000||||||||||||||";

describe("POS Integrado - Normal sale transaction", () => {
    const suite = setupSuiteContext();
    it("performs normal sale and parses approved response with voucher", async () => {
        const pos = await createConnectedPos(suite);
        const salePromise = pos.sale(39000, "ABC123", false, true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, normalSaleCreditWithVoucherResponsePayload);
        const response = await salePromise;
        expect(response.rawResponse).toBe(
            normalSaleCreditWithVoucherResponsePayload
        );
        expect(response.rawVoucher).toBe(normalSaleCreditVoucher);
        validateVoucherContent(response.printingField, expectedVoucherLines);
        expect(sentMessage).toEqual(buildMessage("0200|39000|ABC123||1|0"));
        validateBaseSaleFields(
            response,
            "0210",
            0,
            "Aprobado",
            597029414300,
            "IT750870",
            true
        );
        validateSaleFields(
            response,
            "ABC123",
            "532264",
            39000,
            156,
            "07052026",
            "161140"
        );
        validateAccountFields(
            response,
            "CR",
            "VI",
            6590,
            "000000",
            "3000000000000000000"
        );
    });

    it("performs normal sale and parses approved response without voucher", async () => {
        const pos = await createConnectedPos(suite);
        const salePromise = pos.sale(35000, "ABC123", false, false);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, normalSaleWithOutVoucherResponsePayload);
        const response = await salePromise;
        expect(response.rawResponse).toBe(
            normalSaleWithOutVoucherResponsePayload
        );
        expect(response.printingField).toBeNull();
        expect(response.rawVoucher).toBeNull();
        expect(sentMessage).toEqual(buildMessage("0200|35000|ABC123||0|0"));
        validateBaseSaleFields(
            response,
            "0210",
            0,
            "Aprobado",
            597029414300,
            "IT750870",
            true
        );
        validateSaleFields(
            response,
            "ABC123",
            "144809",
            35000,
            155,
            "07052026",
            "152829"
        );
        validateAccountFields(
            response,
            "CR",
            "VI",
            6590,
            "003000",
            "3000000000000000000"
        );
    });

    it("performs normal sale and parses cancelled response", async () => {
        const pos = await createConnectedPos(suite);
        const salePromise = pos.sale(80000, "ABC123", false, true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, canceledSaleResponsePayload);
        const response = await salePromise;
        expect(response.rawResponse).toBe(canceledSaleResponsePayload);
        expect(response.printingField).toBeNull();
        expect(response.rawVoucher).toBeNull();
        expect(sentMessage).toEqual(buildMessage("0200|80000|ABC123||1|0"));
    });
});
