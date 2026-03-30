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
    multiCodeSaleDebitVoucher,
    multiCodeSaleCreditVoucher,
 } = require("../helpers/autoservicioVoucherFixtures");

const createConnectedPos = async (suite) => {
    const pos = suite.createAutoservicio();
    await connectWithPollAck(pos);
    return pos;
}

const multiCodeSaleDebitWithVoucherResponsePayload =
        "0271|00|597029414303|IM750164|123456|475618|1000|3331|62|DB|00-00-00|331|P |18032026|171040|597012345678|" +
        multiCodeSaleDebitVoucher;
const multiCodeSaleCreditWithVoucherResponsePayload =
        "0271|00|597029414303|IM750164|123456|194937|10000|6590|64|CR|||VI|18032026|171153|597012345678|" +
        multiCodeSaleCreditVoucher +
            "|03|03|3334|CUOTAS SIN INTERES";

describe("POS Autoservicio - Transación de venta multicódigo", () => {
    const suite =setupSuiteContext();

    it("realiza venta multicódigo débito y parsea respuesta aprobada con comprobante", async () => {
        const pos = await createConnectedPos(suite);

        const salePromise = pos.multicodeSale(1000, "123456", 597029414303, true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, multiCodeSaleDebitWithVoucherResponsePayload);
        const response = await salePromise;
        const voucherText = response.printingField.join('\n');

        expect(sentMessage).toEqual(buildMessage("0270|1000|123456|1|0|597029414303"));

        expect(response.printingField.every(line => line.length === 40)).toBe(true);
        expect(voucherText).toContain("COMPROBANTE DE VENTA");
        expect(voucherText).toContain("TARJETA DE DEBITO");
        expect(voucherText).toContain("TOTAL:");
        expect(voucherText).toContain("CODIGO DE AUTORIZACION:");
        expect(voucherText).toContain("GRACIAS POR SU COMPRA");

        expectResponseFields(response, {
            functionCode: 271,
            responseCode: 0,
            responseMessage: "Aprobado",
            commerceCode: 597029414303,
            terminalId: "IM750164",
            successful: true,
            ticket: "123456",
            authorizationCode: "475618",
            amount: 1000,
            last4Digits: 3331,
            operationNumber: "62",
            cardType: "DB",
            accountingDate: "00-00-00",
            accountNumber: "331",
            cardBrand: "P ",
            realDate: "18032026",
            realTime: "171040",
            sharesNumber: null,
            sharesAmount: null,
            sharesTypeGloss: null
        });
    });

     it("realiza venta multicódigo débito y parsea respuesta aprobada sin comprobante", async () => {
         const pos = await createConnectedPos(suite);

         const salePromise = pos.multicodeSale(1000, "123456", 597029414303);
         const sentMessage = await captureSend(pos);
         await sendReply(pos, ACK_BYTE);
         await sendReply(pos, "0271|00|597029414303|IM750164|123456|673501|1000|3331|63|DB|00-00-00|331|P |18032026|171113|597012345678");
         const response = await salePromise;

         expect(sentMessage).toEqual(buildMessage("0270|1000|123456|0|0|597029414303"));
         expectResponseFields(response, {
             functionCode: 271,
             responseCode: 0,
             responseMessage: "Aprobado",
             commerceCode: 597029414303,
             terminalId: "IM750164",
             successful: true,
             ticket: "123456",
             authorizationCode: "673501",
             amount: 1000,
             last4Digits: 3331,
             operationNumber: "63",
             cardType: "DB",
             accountingDate: "00-00-00",
             accountNumber: "331",
             cardBrand: "P ",
             realDate: "18032026",
             realTime: "171113",
             printingField: null,
             sharesNumber: null,
             sharesAmount: null,
             sharesTypeGloss: null
         });
     });

     it("realiza venta multicódigo crédito y parsea respuesta aprobada con comprobante", async () => {
         const pos = await createConnectedPos(suite);

        const salePromise = pos.multicodeSale(10000, "123456", 597029414303, true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, multiCodeSaleCreditWithVoucherResponsePayload);
        const response = await salePromise;
        const voucherText = response.printingField.join('\n');

         expect(sentMessage).toEqual(buildMessage("0270|10000|123456|1|0|597029414303"));
        
         expect(response.printingField.every(line => line.length === 40)).toBe(true);
         expect(voucherText).toContain("COMPROBANTE DE VENTA");
         expect(voucherText).toContain("PAGO EN CUOTAS");
         expect(voucherText).toContain("TARJETA DE CREDITO");
         expect(voucherText).toContain("NUMERO DE CUOTAS");
         expect(voucherText).toContain("TIPO DE CUOTAS");
         expect(voucherText).toContain("CUOTAS SIN INTERES");

         expectResponseFields(response, {
             functionCode: 271,
             responseCode: 0,
             responseMessage: "Aprobado",
             commerceCode: 597029414303,
             terminalId: "IM750164",
             successful: true,
             ticket: "123456",
             authorizationCode: "194937",
             amount: 10000,
             last4Digits: 6590,
             operationNumber: "64",
             cardType: "CR",
             accountingDate: "",
             accountNumber: "",
             cardBrand: "VI",
             realDate: "18032026",
             realTime: "171153",
             sharesNumber: "03",
             sharesAmount: "3334",
             sharesTypeGloss: "CUOTAS SIN INTERES"
         });
     });

     it("realiza venta crédito y parsea respuesta aprobada sin comprobante", async () => {
         const pos = await createConnectedPos(suite);

         const salePromise = pos.multicodeSale(1000, "123456", 597029414303);
         const sentMessage = await captureSend(pos);
         await sendReply(pos, ACK_BYTE);
         await sendReply(pos, "0271|00|597029414303|IM750164|123456|785992|10000|6590|65|CR|||VI|18032026|171232|597012345678||03|03|3334|CUOTAS SIN INTERES");
         const response = await salePromise;

         expect(sentMessage).toEqual(buildMessage("0270|10000|123456|0|0|597029414303"));
         expectResponseFields(response, {
             functionCode: 271,
             responseCode: 0,
             responseMessage: "Aprobado",
             commerceCode: 597029414303,
             terminalId: "IM750164",
             successful: true,
             ticket: "123456",
             authorizationCode: "785992",
             amount: 10000,
             last4Digits: 6590,
             operationNumber: "65",
             cardType: "CR",
             accountingDate: "",
             accountNumber: "",
             cardBrand: "VI",
             realDate: "18032026",
             realTime: "171232",
             printingField: null,
             sharesNumber: "03",
             sharesAmount: "3334",
             sharesTypeGloss: "CUOTAS SIN INTERES"
         });
     });
});
