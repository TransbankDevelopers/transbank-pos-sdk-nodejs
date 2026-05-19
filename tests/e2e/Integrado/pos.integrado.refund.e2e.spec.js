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

describe("POS Integrado - Refund", () => {
    const suite = setupSuiteContext();

    it("parse denied debit refund", async () => {
        const pos = await createConnectedPos(suite);
        const refundPromise = pos.refund(143);
        const sentMessage = await captureSend(pos);
        const posResponse = "1210|21|597029414300|IT750050||143||";
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, posResponse);
        const response = await refundPromise;
        expect(sentMessage).toEqual(buildMessage("1200|143|"));
        expect(response.rawResponse).toEqual(posResponse);
        expectResponseFields(response, {
            functionCode: "1210",
            responseCode: 21,
            commerceCode: 597029414300,
            terminalId: "IT750050",
            authorizationCode: null,
            operationId: 143,
            responseMessage: "Anulación no Permitida",
            success: false
        });
    });

    it("parse approved credit refund", async () => {
        const pos = await createConnectedPos(suite);
        const refundPromise = pos.refund(142);
        const sentMessage = await captureSend(pos);
        const posResponse = "1210|00|597029414300|IT750050|162529|000142||";
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, posResponse);
        const response = await refundPromise;
        expect(response.rawResponse).toEqual(posResponse);
        expect(sentMessage).toEqual(buildMessage("1200|142|"));
        expectResponseFields(response, {
            functionCode: "1210",
            responseCode: 0,
            commerceCode: 597029414300,
            terminalId: "IT750050",
            authorizationCode: "162529",
            operationId: 142,
            responseMessage: "Aprobado",
            success: true
        });
    });
});
