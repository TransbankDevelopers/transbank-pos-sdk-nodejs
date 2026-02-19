const { setupSuiteContext } = require("./helpers/suiteContext");
const {
    ackNextWriteAndMaybeRespond,
    connectWithPollAck
} = require("./helpers/mockPos");

describe("E2E POSAutoservicio (mock serial)", () => {
    const suite = setupSuiteContext();
    let pos = null;

    it("realiza venta y parsea respuesta exitosa", async () => {
        pos = suite.createAutoservicio();
        await connectWithPollAck(pos);

        const salePromise = pos.sale(1000, "123");
        await ackNextWriteAndMaybeRespond(
            pos,
            "0200|0|597020000540|12345678|000123|A1B2C3|1000|1234|000111|DEBITO|0211|123456******1234|VISA|20240210|150000||NORMAL|0|0|"
        );
        const response = await salePromise;

        expect(response.successful).toBe(true);
        expect(response.functionCode).toBe(200);
        expect(response.authorizationCode).toBe("A1B2C3");
        expect(response.amount).toBe(1000);
    });

    it("realiza venta multicodigo y parsea respuesta exitosa", async () => {
        pos = suite.createAutoservicio();
        await connectWithPollAck(pos);

        const salePromise = pos.multicodeSale(2500, "555", "597020000540");
        await ackNextWriteAndMaybeRespond(
            pos,
            "0270|0|597020000540|12345678|000555|QW12ER|2500|7788|000222|CREDITO|0211|123456******7788|MASTERCARD|20240210|151010||NORMAL|0|0|"
        );
        const response = await salePromise;

        expect(response.successful).toBe(true);
        expect(response.functionCode).toBe(270);
        expect(response.authorizationCode).toBe("QW12ER");
        expect(response.amount).toBe(2500);
        expect(response.commerceCode).toBe(597020000540);
    });

    it("obtiene ultima venta", async () => {
        pos = suite.createAutoservicio();
        await connectWithPollAck(pos);

        const lastSalePromise = pos.getLastSale();
        await ackNextWriteAndMaybeRespond(
            pos,
            "0250|0|597020000540|12345678|000777|ZZ9999|700|1122|000333|DEBITO|0211|123456******1122|VISA|20240210|152020||NORMAL|0|0|"
        );
        const response = await lastSalePromise;

        expect(response.successful).toBe(true);
        expect(response.functionCode).toBe(250);
        expect(response.authorizationCode).toBe("ZZ9999");
    });

    it("realiza cierre", async () => {
        pos = suite.createAutoservicio();
        await connectWithPollAck(pos);

        const closeDayPromise = pos.closeDay();
        await ackNextWriteAndMaybeRespond(pos, "0510|0|597020000540|12345678|");
        const response = await closeDayPromise;

        expect(response.successful).toBe(true);
        expect(response.functionCode).toBe(510);
    });

    it("inicializa el pos", async () => {
        pos = suite.createAutoservicio();
        await connectWithPollAck(pos);

        const promise = pos.initialization();
        await ackNextWriteAndMaybeRespond(pos);
        await expect(promise).resolves.toBe(true);
    });

    it("parsea respuesta de inicializacion", async () => {
        pos = suite.createAutoservicio();
        await connectWithPollAck(pos);

        const promise = pos.initializationResponse();
        await ackNextWriteAndMaybeRespond(pos, "1080|00|20240210|153000|");
        const response = await promise;

        expect(response.successful).toBe(true);
        expect(response.functionCode).toBe(1080);
        expect(response.transactionDate).toBe(20240210);
        expect(response.transactionTime).toBe("153000");
    });
});
