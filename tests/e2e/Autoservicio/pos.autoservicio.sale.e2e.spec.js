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
    saleDebitVoucher,
    saleCreditVoucher
 } = require("../helpers/autoservicioVoucherFixtures");

const createConnectedPos = async (suite) => {
    const pos = suite.createAutoservicio();
    await connectWithPollAck(pos);
    return pos;
}

const saleDebitWithVoucherResponsePayload =
        "0210|00|597029414300|IM750164|123456|547545|1000|3331|55|DB|00-00-00|331|P |18032026|123230|" +
        saleDebitVoucher;
const saleCreditWithVoucherResponsePayload =
        "0210|00|597029414300|IM750164|123456|316557|10000|6590|57|CR|||VI|18032026|123429|" +
        saleCreditVoucher +
            "|03|03|3334|CUOTAS SIN INTERES";

describe("POS Autoservicio - Debit sale transaction", () => {
    const suite =setupSuiteContext();

    it("performs debit sale and parses approved response with voucher", async () => {
        const pos = await createConnectedPos(suite);

        const salePromise = pos.sale(1000, "123456", false, true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, saleDebitWithVoucherResponsePayload);
        const response = await salePromise;
        const voucherText = response.voucher.join('\n');

        expect(sentMessage).toEqual(buildMessage("0200|1000|123456|1|0"));
        expect(response.voucher.every(line => line.length === 40)).toBe(true);
        expect(voucherText).toContain("COMPROBANTE DE VENTA");
        expect(voucherText).toContain("TARJETA DE DEBITO");
        expect(voucherText).toContain("TOTAL:");
        expect(voucherText).toContain("CODIGO DE AUTORIZACION:");
        expect(voucherText).toContain("GRACIAS POR SU COMPRA");

        expectResponseFields(response, {
            functionCode: 210,
            responseCode: 0,
            responseMessage: "Aprobado",
            commerceCode: 597029414300,
            terminalId: "IM750164",
            successful: true,
            ticket: "123456",
            authorizationCode: "547545",
            amount: 1000,
            last4Digits: 3331,
            operationNumber: "55",
            cardType: "DB",
            accountingDate: "00-00-00",
            accountNumber: "331",
            cardBrand: "P ",
            realDate: "18032026",
            realTime: "123230",
            sharesNumber: undefined,
            sharesAmount: undefined,
            sharesTypeComment: undefined
        });
    });

    it("performs debit sale and parses approved response without voucher", async () => {
        const pos = await createConnectedPos(suite);

        const salePromise = pos.sale(1000, "123456");
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, "0210|00|597029414300|IM750164|123456|700527|1000|3331|56|DB|00-00-00|331|P |18032026|123307");
        const response = await salePromise;

        expect(sentMessage).toEqual(buildMessage("0200|1000|123456|0|0"));
        expectResponseFields(response, {
            functionCode: 210,
            responseCode: 0,
            responseMessage: "Aprobado",
            commerceCode: 597029414300,
            terminalId: "IM750164",
            successful: true,
            ticket: "123456",
            authorizationCode: "700527",
            amount: 1000,
            last4Digits: 3331,
            operationNumber: "56",
            cardType: "DB",
            accountingDate: "00-00-00",
            accountNumber: "331",
            cardBrand: "P ",
            realDate: "18032026",
            realTime: "123307",
            voucher: undefined,
            sharesNumber: undefined,
            sharesAmount: undefined,
            sharesTypeComment: undefined
        });
    });

});
describe("POS Autoservicio - Credit sale transaction", () => {
    const suite =setupSuiteContext();

    it("performs credit sale and parses approved response with voucher", async () => {
        const pos = await createConnectedPos(suite);

        const salePromise = pos.sale(1000, "123456", false, true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, saleCreditWithVoucherResponsePayload);
        const response = await salePromise;
        const voucherText = response.voucher.join('\n');

        expect(sentMessage).toEqual(buildMessage("0200|1000|123456|1|0"));
        expect(response.voucher.every(line => line.length === 40)).toBe(true);
        expect(voucherText).toContain("COMPROBANTE DE VENTA");
        expect(voucherText).toContain("PAGO EN CUOTAS");
        expect(voucherText).toContain("TARJETA DE CREDITO");
        expect(voucherText).toContain("NUMERO DE CUOTAS");
        expect(voucherText).toContain("TIPO DE CUOTAS");
        expect(voucherText).toContain("CUOTAS SIN INTERES");

        expectResponseFields(response, {
            functionCode: 210,
            responseCode: 0,
            responseMessage: "Aprobado",
            commerceCode: 597029414300,
            terminalId: "IM750164",
            successful: true,
            ticket: "123456",
            authorizationCode: "316557",
            amount: 10000,
            last4Digits: 6590,
            operationNumber: "57",
            cardType: "CR",
            accountingDate: "",
            accountNumber: "",
            cardBrand: "VI",
            realDate: "18032026",
            realTime: "123429",
            sharesNumber: "03",
            sharesAmount: "3334",
            sharesTypeComment: "CUOTAS SIN INTERES"
        });
    });

    it("performs credit sale and parses approved response without voucher", async () => {
        const pos = await createConnectedPos(suite);

        const salePromise = pos.sale(1000, "123456");
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, "0210|00|597029414300|IM750164|123456|776549|10000|6590|58|CR|||VI|18032026|123506||03|03|3334|CUOTAS SIN INTERES");
        const response = await salePromise;

        expect(sentMessage).toEqual(buildMessage("0200|10000|123456|0|0"));
        expectResponseFields(response, {
            functionCode: 210,
            responseCode: 0,
            responseMessage: "Aprobado",
            commerceCode: 597029414300,
            terminalId: "IM750164",
            successful: true,
            ticket: "123456",
            authorizationCode: "776549",
            amount: 10000,
            last4Digits: 6590,
            operationNumber: "58",
            cardType: "CR",
            accountingDate: "",
            accountNumber: "",
            cardBrand: "VI",
            realDate: "18032026",
            realTime: "123506",
            voucher: null,
            sharesNumber: "03",
            sharesAmount: "3334",
            sharesTypeComment: "CUOTAS SIN INTERES"
        });
    });
});
