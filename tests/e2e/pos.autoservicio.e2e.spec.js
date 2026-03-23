const { setupSuiteContext } = require("./helpers/suiteContext");
const {
    ACK_BYTE,
    buildMessage,
    captureSend,
    sendReply,
    connectWithPollAck,
} = require("./helpers/mockPos");

const createConnectedPos = async (suite) => {
    const pos = suite.createAutoservicio();
    await connectWithPollAck(pos);
    return pos;
}

function registerTransactionTests(suite) {
    describe("transacciones", () => {
        it("realiza venta y parsea respuesta exitosa", async () => {
            const pos = await createConnectedPos(suite);

            const salePromise = pos.sale(1000, "123");
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, "0200|0|597020000540|12345678|000123|A1B2C3|1000|1234|000111|DEBITO|0211|123456******1234|VISA|20240210|150000||NORMAL|0|0|");
            expect(sentMessage).toEqual(buildMessage("0200|000001000|000123||0|0"));
            const response = await salePromise;
            expect(response.successful).toBe(true);
            expect(response.functionCode).toBe(200);
            expect(response.authorizationCode).toBe("A1B2C3");
            expect(response.amount).toBe(1000);
        });

        it("realiza venta multicodigo y parsea respuesta exitosa", async () => {
            const pos = await createConnectedPos(suite);

            const salePromise = pos.multicodeSale(2500, "555", "597020000540");
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, "0270|0|597020000540|12345678|000555|QW12ER|2500|7788|000222|CREDITO|0211|123456******7788|MASTERCARD|20240210|151010||NORMAL|0|0|");
            expect(sentMessage).toEqual(buildMessage("0270|000002500|000555|0|0|597020000540"));
            const response = await salePromise;
            expect(response.successful).toBe(true);
            expect(response.functionCode).toBe(270);
            expect(response.authorizationCode).toBe("QW12ER");
            expect(response.amount).toBe(2500);
            expect(response.commerceCode).toBe(597020000540);
        });

        it("obtiene ultima venta", async () => {
            const pos = await createConnectedPos(suite);

            const lastSalePromise = pos.getLastSale();
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, "0250|0|597020000540|12345678|000777|ZZ9999|700|1122|000333|DEBITO|0211|123456******1122|VISA|20240210|152020||NORMAL|0|0|");
            expect(sentMessage).toEqual(buildMessage("0250|0"));
            const response = await lastSalePromise;
            expect(response.successful).toBe(true);
            expect(response.functionCode).toBe(250);
            expect(response.authorizationCode).toBe("ZZ9999");
        });
    });
}

function registerLifecycleTests(suite) {
    describe("ciclo de vida", () => {
        it("envia comando poll", async () => {
            const pos = await createConnectedPos(suite);

            const pollPromise = pos.poll();
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            expect(sentMessage).toEqual(buildMessage("0100"));
            await expect(pollPromise).resolves.toBe(true);
        });

        it("carga llaves", async () => {
            const pos = await createConnectedPos(suite);

            const loadKeysPromise = pos.loadKeys();
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, "0810|00|597029414300|IM750164");
            expect(sentMessage).toEqual(buildMessage("0800"));
            const response = await loadKeysPromise;
            expect(response.successful).toBe(true);
            expect(response.functionCode).toBe(810);
            expect(response.commerceCode).toBe(597029414300);
            expect(response.terminalId).toBe("IM750164");
        });
        
        it("realiza cierre", async () => {
            const pos = await createConnectedPos(suite);

            const closeDayPromise = pos.closeDay();
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, "0510|0|597020000540|12345678|");
            expect(sentMessage).toEqual(buildMessage("0500|0"));
            const response = await closeDayPromise;
            expect(response.successful).toBe(true);
            expect(response.functionCode).toBe(510);
        });

        it("inicializa el pos", async () => {
            const pos = await createConnectedPos(suite);

            const promise = pos.initialization();
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            expect(sentMessage).toEqual(buildMessage("0070"));
            await expect(promise).resolves.toBe(true);
        });

        it("parsea respuesta de inicializacion", async () => {
            const pos = await createConnectedPos(suite);

            const promise = pos.initializationResponse();
            const sentMessage = await captureSend(pos);
            await sendReply(pos, ACK_BYTE);
            await sendReply(pos, "1080|90|03022026|111543");
            expect(sentMessage).toEqual(buildMessage("0080"));
            const response = await promise;
            expect(response.successful).toBe(true);
            expect(response.functionCode).toBe(1080);
            expect(response.transactionDate).toBe('03022026');
            expect(response.transactionTime).toBe("111543");
        });
    });
}

describe("E2E POSAutoservicio (mock serial)", () => {
    const suite = setupSuiteContext();
    registerTransactionTests(suite);
    registerLifecycleTests(suite);
});
