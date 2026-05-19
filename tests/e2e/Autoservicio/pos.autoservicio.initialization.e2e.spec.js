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
};

describe("POS Autoservicio - Initialization", () => {
    const suite = setupSuiteContext();

    it("initializes the POS", async () => {
        const pos = await createConnectedPos(suite);

        const promise = pos.initialization();
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        expect(sentMessage).toEqual(buildMessage("0070"));
        await expect(promise).resolves.toBe(true);
    });

    it("parses initialization response", async () => {
        const pos = await createConnectedPos(suite);

        const promise = pos.initializationResponse();
        const sentMessage = await captureSend(pos);
        const posResponse = "1080|90|16022026|103654";
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, posResponse);
        const response = await promise;

        expect(response.rawResponse).toBe(posResponse);
        expect(sentMessage).toEqual(buildMessage("0080"));
        expectResponseFields(response, {
            functionCode: "1080",
            responseCode: 90,
            responseMessage: "Inicialización exitosa",
            transactionDate: "16022026",
            transactionTime: "103654",
            success: true
        });
    });
});
