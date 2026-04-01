const { setupSuiteContext } = require("./helpers/suiteContext");
const {
    ACK_BYTE,
    buildMessage,
    captureSend,
    sendReply,
    connectWithPollAck
} = require("./helpers/mockPos");

const createConnectedPos = async (suite) => {
    const pos = suite.createIntegrado();
    await connectWithPollAck(pos);
    return pos;
}

function registerConnectionTests(suite) {
    describe("connection", () => {
        it("connects and performs poll during connect", async () => {
            const pos = suite.createIntegrado();
            await connectWithPollAck(pos);
            expect(pos.isConnected()).toBe(true);
        });
    });
}

function registerConfigurationTests(suite) {
    describe("configuration", () => {
        it("executes loadKeys and parses the response", async () => {
            const pos = await createConnectedPos(suite);

            const loadKeysPromise = pos.loadKeys();
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, "0810|00|597020000540|12345678|");
            expect(sentMessage).toEqual(buildMessage("0800"));
            const response = await loadKeysPromise;
            expect(response.successful).toBe(true);
            expect(response.functionCode).toBe(810);
            expect(response.commerceCode).toBe(597020000540);
            expect(response.terminalId).toBe("12345678");
        });

        it("changes POS to normal mode", async () => {
            const pos = await createConnectedPos(suite);

            const promise = pos.changeToNormalMode();
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            expect(sentMessage).toEqual(buildMessage("0300"));
            await expect(promise).resolves.toBe(true);
        });
    });
}

function registerTransactionTests(suite) {
    describe("transactions", () => {
        it("performs sale and parses the response", async () => {
            const pos = await createConnectedPos(suite);

            const responsePayload =
                "0210|00|597020000540|12345678|T123|ABC123|1000|00|0|1234|000001|DB|0211|***************1234|VI|20240210|153045||0 |";

            const salePromise = pos.sale(1000, "T123");
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, responsePayload);
            expect(sentMessage).toEqual(buildMessage("0200|1000|T123||0|0"));
            const response = await salePromise;
            expect(response.successful).toBe(true);
            expect(response.functionCode).toBe(210);
            expect(response.responseCode).toBe(0);
            expect(response.authorizationCode).toBe("ABC123");
            expect(response.amount).toBe(1000);
        });

        it("performs multicode sale and parses the response", async () => {
            const pos = await createConnectedPos(suite);

            const responsePayload =
                "0271|0|597020000540|12345678|T555|ZXCV12|2500|00|0|7788|000777|CREDITO|0212|123456******7788|MASTERCARD|20240210|163045|01|0||0|597020000541|";

            const salePromise = pos.multicodeSale(2500, "T555", "597020000540");
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, responsePayload);
            expect(sentMessage).toEqual(buildMessage("0270|2500|T555||0|0|597020000540|"));
            const response = await salePromise;
            expect(response.successful).toBe(true);
            expect(response.functionCode).toBe(271);
            expect(response.responseCode).toBe(0);
            expect(response.authorizationCode).toBe("ZXCV12");
            expect(response.commerceCode).toBe(597020000540);
            expect(response.lenderCommerceCode).toBe(597020000541);
        });

        it("gets sales detail until two consecutive empty authorizations", async () => {
            const pos = await createConnectedPos(suite);

            const salesDetailPromise = pos.salesDetail(false);
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, "0261|0|597020000540|12345678|1001|AUTH01|1000|1234|1|DEBITO|0211|ACC1|VISA|20240210|101010|01|0|0|");
            await sendReply(pos, "0261|0|597020000540|12345678|1002||1500|5678|2|DEBITO|0211|ACC2|VISA|20240210|111111|01|0|0|");
            await sendReply(pos, "0261|0|597020000540|12345678|1003||1700|9999|3|DEBITO|0211|ACC3|VISA|20240210|121212|01|0|0|");
            expect(sentMessage).toEqual(buildMessage("0260|1|"));
            const response = await salesDetailPromise;
            expect(response).toHaveLength(1);
            expect(response[0].ticket).toBe("1001");
            expect(response[0].authorizationCode).toBe("AUTH01");
        });

        it("performs refund and parses the response", async () => {
            const pos = await createConnectedPos(suite);

            const refundPromise = pos.refund("137");
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, "1210|07|597029414300|IT750050||137||");
            expect(sentMessage).toEqual(buildMessage("1200|137|"));
            const response = await refundPromise;
            expect(response.successful).toBe(false);
            expect(response.functionCode).toBe(1210);
            expect(response.responseCode).toBe(7);
            expect(response.authorizationCode).toBe("");
            expect(response.operationId).toBe("137");
        });
    });
}

function registerReportingTests(suite) {
    describe("reports and close day", () => {
        it("gets totals", async () => {
            const pos = await createConnectedPos(suite);

            const totalsPromise = pos.getTotals();
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, "0700|0|12|34500|");
            expect(sentMessage).toEqual(buildMessage("0700||"));
            const response = await totalsPromise;
            expect(response.successful).toBe(true);
            expect(response.functionCode).toBe(700);
            expect(response.txCount).toBe(12);
            expect(response.txTotal).toBe(34500);
        });

        it("performs POS close day", async () => {
            const pos = await createConnectedPos(suite);

            const closeDayPromise = pos.closeDay();
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, "0510|00|597029414300|IT750050||");
            expect(sentMessage).toEqual(buildMessage("0500||"));
            const response = await closeDayPromise;
            expect(response.successful).toBe(true);
            expect(response.functionCode).toBe(510);
            expect(response.responseCode).toBe(0);
        });
    });
}

describe("E2E POSIntegrado (mock serial)", () => {
    const suite = setupSuiteContext();
    registerConnectionTests(suite);
    registerConfigurationTests(suite);
    registerTransactionTests(suite);
    registerReportingTests(suite);
});
