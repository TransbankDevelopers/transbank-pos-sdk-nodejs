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

describe("POS Integrado - Details", () => {
    const suite = setupSuiteContext();

    it("parse details response when print on pos is disabled", async () => {
        const pos = await createConnectedPos(suite);

        const detailsPromise = pos.salesDetail(false);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(
            pos,
            "0261|00|597029414300|IT750050|ABC123|708410|8000|3331|000143|DB|000000|  ********331      |DB|07042026|085034||0|0|00|"
        );
        await sendReply(
            pos,
            "0261|00|597029414300|IT750050|ABC123|388892|7000|3331|000144|DB|000000|  ********331      |DB|07042026|085628||0|0|00|"
        );
        await sendReply(pos, "0261|00|597029414300|IT750050||||||||||||||||");
        await sendReply(pos, "0261|00|597029414300|IT750050||||||||||||||||");
        expect(sentMessage).toEqual(buildMessage("0260|1|"));
        const response = await detailsPromise;
        expect(response).toHaveLength(2);
        const firstSale = response[0];
        validateBaseSaleFields(
            firstSale,
            261,
            0,
            "Aprobado",
            597029414300,
            "IT750050",
            true
        );
        validateSaleFields(
            firstSale,
            "ABC123",
            "708410",
            "8000",
            "000143",
            "07042026",
            "085034"
        );
        validateAccountFields(
            firstSale,
            "DB",
            "DB",
            3331,
            "000000",
            "  ********331      "
        );
        expect(firstSale.feeAmount).toBe("0");
        expect(firstSale.feeNumber).toBe("0");
    });

    it("parse details response when print on pos is enabled", async () => {
        const pos = await createConnectedPos(suite);

        const detailsPromise = pos.salesDetail(true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        const response = await detailsPromise;
        expect(sentMessage).toEqual(buildMessage("0260|0|"));
        expect(response).toBe(true);
    });

    it("returns empty array when there are no sales", async () => {
        const pos = await createConnectedPos(suite);

        const detailsPromise = pos.salesDetail(false);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, "0261|00|597029414300|IT750050||||||||||||||||");
        await sendReply(pos, "0261|00|597029414300|IT750050||||||||||||||||");
        expect(sentMessage).toEqual(buildMessage("0260|1|"));
        const response = await detailsPromise;
        expect(response).toHaveLength(0);
    });
});
