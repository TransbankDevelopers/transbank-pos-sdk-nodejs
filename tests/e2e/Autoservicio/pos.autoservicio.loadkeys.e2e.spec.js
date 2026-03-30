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
    const pos = suite.createAutoservicio();
    await connectWithPollAck(pos);
    return pos;
}

describe("POS Autoservicio - Load keys", () => {
    const suite = setupSuiteContext();

    it("loads keys successfully and parses the response", async () => {
        const pos = await createConnectedPos(suite);
        const loadKeysPromise = pos.loadKeys();
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, "0810|00|597029414300|IM750015");
        const response = await loadKeysPromise;
        
        expect(sentMessage).toEqual(buildMessage("0800"));
        expectResponseFields(response, {
            functionCode: 810,
            responseCode: 0,
            commerceCode: 597029414300,
            terminalId: "IM750015",
            responseMessage: "Aprobado",
            successful: true
        });
    });

    it("loads keys with error and parses the response", async () => {
        const pos = await createConnectedPos(suite);
        const loadKeysPromise = pos.loadKeys();
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, "0810|01|597029414300|IM750015");
        const response = await loadKeysPromise;
        
        expect(sentMessage).toEqual(buildMessage("0800"));
        expectResponseFields(response, {
            functionCode: 810,
            responseCode: 1,
            commerceCode: 597029414300,
            terminalId: "IM750015",
            responseMessage: "Rechazado",
            successful: false
        });

    });
});
