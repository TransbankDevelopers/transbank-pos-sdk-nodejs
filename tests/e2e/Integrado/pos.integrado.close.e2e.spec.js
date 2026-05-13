const { setupSuiteContext } = require("../helpers/suiteContext");
const {
    ACK_BYTE,
    buildMessage,
    captureSend,
    sendReply,
    connectWithPollAck,
    expectResponseFields
} = require("../helpers/mockPos");

const createConnectedPos = async (suite) => {
    const pos = suite.createIntegrado();
    await connectWithPollAck(pos);
    return pos;
};

describe("POS Integrado - Close day transaction", () => {
    const suite = setupSuiteContext();

    it("closes day and parses approved response", async () => {
        const pos = await createConnectedPos(suite);
        const posResponse = "0510|00|597029414300|IT750050||";
        const closePromise = pos.closeDay(false);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, posResponse);
        const response = await closePromise;

        expect(sentMessage).toEqual(buildMessage("0500||"));
        expectResponseFields(response, {
            functionCode: "0510",
            responseCode: 0,
            commerceCode: 597029414300,
            terminalId: "IT750050",
            responseMessage: "Aprobado",
            success: true,
            rawResponse: posResponse
        });
    });
});
