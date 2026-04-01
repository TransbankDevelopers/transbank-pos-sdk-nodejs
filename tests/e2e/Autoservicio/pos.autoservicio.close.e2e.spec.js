const { setupSuiteContext } = require("../helpers/suiteContext");
const {
    ACK_BYTE,
    buildMessage,
    captureSend,
    sendReply,
    connectWithPollAck,
    expectResponseFields
} = require("../helpers/mockPos");

const {
    closeWithDataVoucher,
    closeWithoutDataVoucher
 } = require("../helpers/autoservicioVoucherFixtures");

const createConnectedPos = async (suite) => {
    const pos = suite.createAutoservicio();
    await connectWithPollAck(pos);
    return pos;
}

const closeWithDataVoucherResponsePayload =
            "0510|00|597029414300|IM750164|" +
            closeWithDataVoucher;
const closeWithoutDataVoucherResponsePayload =
            "0510|00|597029414300|IM750164|" +
            closeWithoutDataVoucher;

describe("POS Autoservicio - Close day transaction", () => {
    const suite = setupSuiteContext();

    it("closes day and parses approved response with voucher", async () => {
        const pos = await createConnectedPos(suite);

        const closePromise = pos.closeDay(true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, closeWithDataVoucherResponsePayload);
        const response = await closePromise;
        const voucherText = response.voucher.join('\n');

        expect(sentMessage).toEqual(buildMessage("0500|1"));
        expect(response.voucher.every(line => line.length === 40)).toBe(true);
        expect(voucherText).toContain("REPORTE DEL CIERRE DEL TERMINAL");
        expect(voucherText).toContain("NUMERO              TOTAL");
        expect(voucherText).toContain("VISA");
        expect(voucherText).toContain("TOTAL CAPTURAS");
        expect(voucherText).toContain("$20.000");

        expectResponseFields(response, {
            functionCode: 510,
            responseCode: 0,
            commerceCode: 597029414300,
            terminalId: "IM750164",
            responseMessage: "Aprobado",
            successful: true
        });
    });

    it("closes day and parses approved response without voucher", async () => {
        const pos = await createConnectedPos(suite);

        const closePromise = pos.closeDay(false);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, "0510|00|597029414300|IM750164|");
        const response = await closePromise;

        expect(sentMessage).toEqual(buildMessage("0500|0"));
        expectResponseFields(response, {
            functionCode: 510,
            responseCode: 0,
            commerceCode: 597029414300,
            terminalId: "IM750164",
            responseMessage: "Aprobado",
            voucher: null,
            successful: true
        });
    });

    it("closes day and parses approved response with voucher when there are no transactions", async () => {
        const pos = await createConnectedPos(suite);

        const closePromise = pos.closeDay(true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, closeWithoutDataVoucherResponsePayload);
        const response = await closePromise;
        const voucherText = response.voucher.join('\n');

        expect(sentMessage).toEqual(buildMessage("0500|1"));
        expect(response.voucher.every(line => line.length === 40)).toBe(true);
        expect(voucherText).toContain("REPORTE DEL CIERRE DEL TERMINAL");
        expect(voucherText).toContain("NUMERO              TOTAL");
        expect(voucherText).not.toContain("VISA");
        expect(voucherText).toContain("TOTAL CAPTURAS");
        expect(voucherText).toContain("$0");

        expectResponseFields(response, {
            functionCode: 510,
            responseCode: 0,
            commerceCode: 597029414300,
            terminalId: "IM750164",
            responseMessage: "Aprobado",
            successful: true
        });
    });

    it("closes day and parses approved response without voucher when there are no transactions", async () => {

        const pos = await createConnectedPos(suite);
        
        const closePromise = pos.closeDay();
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, "0510|00|597029414300|IM750164|");
        expect(sentMessage).toEqual(buildMessage("0500|0"));
        const response = await closePromise;

        expectResponseFields(response, {
            functionCode: 510,
            responseCode: 0,
            commerceCode: 597029414300,
            terminalId: "IM750164",
            responseMessage: "Aprobado",
            successful: true
        });
    });
});
