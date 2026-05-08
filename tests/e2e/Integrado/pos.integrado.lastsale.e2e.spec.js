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

describe("POS Integrado - Last Sale", () => {
    const suite = setupSuiteContext();

    it("Last sale - Debit last sale", async () => {
        const pos = await createConnectedPos(suite);
        const lastSalePromise = pos.getLastSale();
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(
            pos,
            "0260|00|597029414300|IT750050|ABC123|875395|1000|00|0|3331|000140|DB|000000|  ********331      |DB|03032026|093106||||"
        );
        const response = await lastSalePromise;

        expect(sentMessage).toEqual(buildMessage("0250|"));
        validateBaseSaleFields(
            response,
            260,
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
            "000140",
            "03032026",
            "093106"
        );
        validateAccountFields(
            response,
            "DB",
            "DB",
            3331,
            "000000",
            "  ********331      "
        );
        expect(response.employeeId).toBe("");
        expect(response.tip).toBe(null);
    });

    it("Last sale - Credit last sale", async () => {
        const pos = await createConnectedPos(suite);
        const lastSalePromise = pos.getLastSale();
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(
            pos,
            "0260|00|597029414300|IT750050|ABC123|794160|12000|03|4000|6590|000141|CR|003000|3000000000000000000|VI|06042026|234109||||"
        );
        const response = await lastSalePromise;

        expect(sentMessage).toEqual(buildMessage("0250|"));
        validateBaseSaleFields(
            response,
            260,
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
            "000141",
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
        expect(response.employeeId).toBe("");
        expect(response.tip).toBe(null);
    });

    it("Last sale - No existing sale", async () => {
        const pos = await createConnectedPos(suite);
        const lastSalePromise = pos.getLastSale();
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, "0260|11|||||||||||||||||||");
        const response = await lastSalePromise;

        expect(sentMessage).toEqual(buildMessage("0250|"));
        validateBaseSaleFields(
            response,
            260,
            11,
            "No existe venta",
            null,
            "",
            false
        );
        validateSaleFields(response, null, null, null, null, null, null);
        validateAccountFields(
            response,
            "CR",
            "VI",
            6590,
            "003000",
            "3000000000000000000"
        );
        expect(response.employeeId).toBe("");
        expect(response.tip).toBe(null);
    });
});
