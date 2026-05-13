const {
    ACK_BYTE,
    buildMessage,
    captureSend,
    sendReply,
    connectWithPollAck,
    expectResponseFields
} = require("../helpers/mockPos");

const COMMERCE_CODE = 597029414300;
const TERMINAL_ID = "TEST7500";

const createConnectedPos = async (createPos) => {
    const pos = createPos();
    await connectWithPollAck(pos);
    return pos;
};

const describePosBaseTests = ({ createPos }) => {
    describe("Poll", () => {
        it("checks connection with successful result", async () => {
            const pos = await createConnectedPos(createPos);

            const pollPromise = pos.poll();
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            const response = await pollPromise;

            expect(sentMessage).toEqual(buildMessage("0100"));
            expect(response).toBe(true);
        });

        it("checks connection with error result", async () => {
            const pos = createPos();

            await expect(pos.poll()).rejects.toThrow(
                "You have to connect to a POS"
            );
        });
    });

    describe("Load keys", () => {
        it("loads keys successfully and parses the response", async () => {
            const pos = await createConnectedPos(createPos);
            const loadKeysPromise = pos.loadKeys();
            const sentMessage = await captureSend(pos);
            const posReply = `0810|00|${COMMERCE_CODE}|${TERMINAL_ID}`;
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, posReply);
            const response = await loadKeysPromise;

            expect(sentMessage).toEqual(buildMessage("0800"));
            expectResponseFields(response, {
                functionCode: "0810",
                responseCode: 0,
                commerceCode: COMMERCE_CODE,
                terminalId: TERMINAL_ID,
                responseMessage: "Aprobado",
                success: true,
                rawResponse: posReply
            });
        });

        it("loads keys with error and parses the response", async () => {
            const pos = await createConnectedPos(createPos);
            const loadKeysPromise = pos.loadKeys();
            const sentMessage = await captureSend(pos);
            const posReply = `0810|01|${COMMERCE_CODE}|${TERMINAL_ID}`;
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, posReply);
            const response = await loadKeysPromise;

            expect(sentMessage).toEqual(buildMessage("0800"));
            expectResponseFields(response, {
                functionCode: "0810",
                responseCode: 1,
                commerceCode: COMMERCE_CODE,
                terminalId: TERMINAL_ID,
                responseMessage: "Rechazado",
                success: false,
                rawResponse: posReply
            });
        });
    });
};

module.exports = {
    describePosBaseTests
};
