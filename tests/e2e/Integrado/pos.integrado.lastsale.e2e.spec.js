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
    validateAccountFields
} = require("../helpers/validationHelpers");

const createConnectedPos = async (suite) => {
    const pos = suite.createIntegrado();
    await connectWithPollAck(pos);
    return pos;
};

describe("POS Integrado - Last Sale with transactions", () => {
    const suite = setupSuiteContext();

    it("Last sale - Debit last sale", async () => {
        const pos = await createConnectedPos(suite);
        const lastSalePromise = pos.getLastSale();
        const sentMessage = await captureSend(pos);
        const posResponse =
            "0260|00|597029414300|IT750050|ABC123|875395|1000|00|0|3331|000140|DB|000000|  ********331      |DB|03032026|093106||||";
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, posResponse);
        const response = await lastSalePromise;

        expect(response.rawResponse).toEqual(posResponse);
        expect(sentMessage).toEqual(buildMessage("0250|"));
        validateBaseSaleFields(
            response,
            "0260",
            0,
            "Aprobado",
            597029414300,
            "IT750050",
            true
        );
        validateSaleFields(
            response,
            "ABC123",
            "875395",
            1000,
            140,
            "03032026",
            "093106"
        );
        validateAccountFields(
            response,
            "DB",
            "DB",
            3331,
            "000000",
            "********331"
        );
        expect(response.employeeId).toBe(null);
        expect(response.tip).toBe(null);
    });

    it("Last sale - Credit last sale", async () => {
        const pos = await createConnectedPos(suite);
        const lastSalePromise = pos.getLastSale();
        const sentMessage = await captureSend(pos);
        const posResponse =
            "0260|00|597029414300|IT750050|ABC123|794160|12000|03|4000|6590|000141|CR|003000|3000000000000000000|VI|06042026|234109||||";
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, posResponse);
        const response = await lastSalePromise;

        expect(response.rawResponse).toEqual(posResponse);
        expect(sentMessage).toEqual(buildMessage("0250|"));
        validateBaseSaleFields(
            response,
            "0260",
            0,
            "Aprobado",
            597029414300,
            "IT750050",
            true
        );
        validateSaleFields(
            response,
            "ABC123",
            "794160",
            12000,
            141,
            "06042026",
            "234109"
        );
        validateAccountFields(
            response,
            "CR",
            "VI",
            6590,
            "003000",
            "3000000000000000000"
        );
        expect(response.employeeId).toBe(null);
        expect(response.tip).toBe(null);
    });
});

describe("POS Integrado - Last Sale without transactions", () => {
    const suite = setupSuiteContext();

    it("Last sale - No existing sale", async () => {
        const pos = await createConnectedPos(suite);
        const lastSalePromise = pos.getLastSale();
        const sentMessage = await captureSend(pos);
        const posResponse = "0260|11|||||||||||||||||||";
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, posResponse);
        const response = await lastSalePromise;

        expect(response.rawResponse).toEqual(posResponse);
        expect(sentMessage).toEqual(buildMessage("0250|"));
        validateBaseSaleFields(
            response,
            "0260",
            11,
            "No existe venta",
            null,
            null,
            false
        );
        validateSaleFields(response, null, null, null, null, null, null);
        validateAccountFields(response, null, null, null, null, null);
        expect(response.employeeId).toBe(null);
        expect(response.tip).toBe(null);
    });
});
