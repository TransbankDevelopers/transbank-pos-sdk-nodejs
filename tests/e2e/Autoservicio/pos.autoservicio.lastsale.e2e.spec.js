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
    lastSaleDebitVoucher,
    lastSaleCreditVoucher
 } = require("../helpers/autoservicioVoucherFixtures");

const createConnectedPos = async (suite) => {
    const pos = suite.createAutoservicio();
    await connectWithPollAck(pos);
    return pos;
}

const lastSaleDebitWithVoucherResponsePayload =
            "0260|00|597029414303|IM750164|123456|912108|1000|3331|68|DB|00-00-00|331|P |19032026|102438|" +
            lastSaleDebitVoucher;
const lastSaleCreditWithVoucherResponsePayload =
            "0260|00|597029414300|IM750164|123456|575354|10000|6590|34|CR|||VI|17032026|115006|" +
            lastSaleCreditVoucher +
            "|03|03|3334|CUOTAS SIN INTERES";

describe("POS Autoservicio - Última venta", () => {
    const suite =setupSuiteContext();

    it("Última venta - Débito aprobada sin comprobante", async () => {
        const pos = await createConnectedPos(suite);

        const lastSalePromise = pos.getLastSale();
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, "0260|00|597029414300|IM750164|123456|574062|1000|3331|56|DB|10032026|331|P |12032026|171142");
        const response = await lastSalePromise;

        expect(sentMessage).toEqual(buildMessage("0250|0"));


        expectResponseFields(response, {
            functionCode: 260,
            responseCode: 0,
            responseMessage: "Aprobado",
            commerceCode: 597029414300,
            terminalId: "IM750164",
            successful: true,
            ticket: "123456",
            authorizationCode: "574062",
            amount: 1000,
            last4Digits: 3331,
            operationNumber: "56",
            cardType: "DB",
            accountingDate: "10032026",
            accountNumber: "331",
            cardBrand: "P ",
            realDate: "12032026",
            realTime: "171142",
            sharesNumber: undefined,
            sharesAmount: undefined,
            sharesTypeComment: undefined
        });
    });

    it("Última venta - Débito aprobada con comprobante", async () => {
        const pos = await createConnectedPos(suite);

        const lastSalePromise = pos.getLastSale(true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, lastSaleDebitWithVoucherResponsePayload);
        const response = await lastSalePromise;
        const voucherText = response.voucher.join('\n');

        expect(sentMessage).toEqual(buildMessage("0250|1"));
        expect(response.voucher.every(line => line.length === 40)).toBe(true);
        expect(voucherText).toContain("COMPROBANTE DE VENTA");
        expect(voucherText).toContain("TARJETA DE DEBITO");
        expect(voucherText).toContain("TOTAL:");
        expect(voucherText).toContain("CODIGO DE AUTORIZACION:");
        expect(voucherText).toContain("GRACIAS POR SU COMPRA");

        expectResponseFields(response, {
            functionCode: 260,
            responseCode: 0,
            responseMessage: "Aprobado",
            commerceCode: 597029414303,
            terminalId: "IM750164",
            successful: true,
            ticket: "123456",
            authorizationCode: "912108",
            amount: 1000,
            last4Digits: 3331,
            operationNumber: "68",
            cardType: "DB",
            accountingDate: "00-00-00",
            accountNumber: "331",
            cardBrand: "P ",
            realDate: "19032026",
            realTime: "102438",
            sharesNumber: undefined,
            sharesAmount: undefined,
            sharesTypeComment: undefined
        });
    });

    it("Última venta - Crédito aprobada con comprobante", async () => {
        const pos = await createConnectedPos(suite);

        const lastSalePromise = pos.getLastSale(true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, lastSaleCreditWithVoucherResponsePayload);
        const response = await lastSalePromise;
        const voucherText = response.voucher.join('\n');

        expect(sentMessage).toEqual(buildMessage("0250|1"));
        expect(response.voucher.every(line => line.length === 40)).toBe(true);
        expect(voucherText).toContain("COMPROBANTE DE VENTA");
        expect(voucherText).toContain("PAGO EN CUOTAS");
        expect(voucherText).toContain("TARJETA DE CREDITO");
        expect(voucherText).toContain("NUMERO DE CUOTAS");
        expect(voucherText).toContain("TIPO DE CUOTAS");
        expect(voucherText).toContain("CUOTAS SIN INTERES");

        expectResponseFields(response, {
            functionCode: 260,
            responseCode: 0,
            responseMessage: "Aprobado",
            commerceCode: 597029414300,
            terminalId: "IM750164",
            successful: true,
            ticket: "123456",
            authorizationCode: "575354",
            amount: 10000,
            last4Digits: 6590,
            operationNumber: "34",
            cardType: "CR",
            accountingDate: "",
            accountNumber: "",
            cardBrand: "VI",
            realDate: "17032026",
            realTime: "115006",
            sharesNumber: "03",
            sharesAmount: "3334",
            sharesTypeComment: "CUOTAS SIN INTERES"
        });
    });

    it("Última venta - Crédito aprobada sin comprobante", async () => {
        const pos = await createConnectedPos(suite);

        const lastSalePromise = pos.getLastSale();
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, "0260|00|597029414300|IM750164|123456|575354|10000|6590|34|CR|||VI|17032026|115006||03|03|3334|CUOTAS SIN INTERES");
        const response = await lastSalePromise;

        expect(sentMessage).toEqual(buildMessage("0250|0"));


        expectResponseFields(response, {
            functionCode: 260,
            responseCode: 0,
            responseMessage: "Aprobado",
            commerceCode: 597029414300,
            terminalId: "IM750164",
            successful: true,
            ticket: "123456",
            authorizationCode: "575354",
            amount: 10000,
            last4Digits: 6590,
            operationNumber: "34",
            cardType: "CR",
            accountingDate: "",
            accountNumber: "",
            cardBrand: "VI",
            realDate: "17032026",
            realTime: "115006",
            sharesNumber: "03",
            sharesAmount: "3334",
            sharesTypeComment: "CUOTAS SIN INTERES"
        });
    });
});