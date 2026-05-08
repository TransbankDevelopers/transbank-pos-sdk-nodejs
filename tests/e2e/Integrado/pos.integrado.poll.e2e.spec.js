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

describe("POS Integrado - Poll", () => {
    const suite = setupSuiteContext();

    it("checks connection with successful result", async () => {
        const pos = await createConnectedPos(suite);

        const pollPromise = pos.poll();
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        expect(sentMessage).toEqual(buildMessage("0100"));
        const response = await pollPromise;
        expect(response).toBe(true);
    });

    it("checks connection with error result", async () => {
        const pos = suite.createIntegrado();

        await expect(pos.poll()).rejects.toThrow(
            "You have to connect to a POS"
        );
    });
});
