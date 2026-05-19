const { setupSuiteContext } = require("../helpers/suiteContext");
const {
    ACK_BYTE,
    buildMessage,
    captureSend,
    sendReply,
    connectWithPollAck
} = require("../helpers/mockPos");

const createConnectedPos = async (suite) => {
    const pos = suite.createIntegrado();
    await connectWithPollAck(pos);
    return pos;
};

describe("POS Integrado - Totals", () => {
    const suite = setupSuiteContext();

    it("get totals response with sales", async () => {
        const pos = await createConnectedPos(suite);

        const totalsPromise = pos.getTotals();
        const sentMessage = await captureSend(pos);
        const posResponse = "0710|00|002|15000||";
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, posResponse);
        expect(sentMessage).toEqual(buildMessage("0700||"));
        const response = await totalsPromise;
        expect(response).toEqual({
            functionCode: "0710",
            responseCode: 0,
            txCount: 2,
            txTotal: 15000,
            responseMessage: "Aprobado",
            success: true,
            rawResponse: posResponse
        });
    });

    it("get totals response with no sales", async () => {
        const pos = await createConnectedPos(suite);

        const totalsPromise = pos.getTotals();
        const sentMessage = await captureSend(pos);
        const posResponse = "0710|00|000|0||";
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, posResponse);
        expect(sentMessage).toEqual(buildMessage("0700||"));
        const response = await totalsPromise;
        expect(response).toEqual({
            functionCode: "0710",
            responseCode: 0,
            txCount: 0,
            txTotal: 0,
            responseMessage: "Aprobado",
            success: true,
            rawResponse: posResponse
        });
    });
});
