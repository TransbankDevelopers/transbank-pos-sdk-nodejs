const { setupSuiteContext } = require("../helpers/suiteContext");
const {
    ACK_BYTE,
    buildMessage,
    captureSend,
    sendReply,
    connectWithPollAck,
} = require("../helpers/mockPos");

const {
    multiCodeSaleDebitVoucher,
    multiCodeSaleCreditVoucher
 } = require("../helpers/autoservicioVoucherFixtures");

const { 
    validateAutoservicioMulticodeSaleFields,
    validateVoucherContent
} = require("../helpers/validationHelpers");

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

describe("POS Autoservicio - Debit multicode sale transaction", () => {
    const suite = setupSuiteContext();

    it("performs debit multicode sale and parses approved response with voucher", async () => {
        const pos = await createConnectedPos(suite);

        const salePromise = pos.multicodeSale(1000, "123456", 597029414303, true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, multiCodeSaleDebitWithVoucherResponsePayload);
        const response = await salePromise;
        const expectedVoucherLines = [
            "COMPROBANTE DE VENTA",
            "TARJETA DE DEBITO",
            "TOTAL:",
            "CODIGO DE AUTORIZACION:",
            "GRACIAS POR SU COMPRA"
        ];

        expect(sentMessage).toEqual(buildMessage("0270|1000|123456|1|0|597029414303"));
        validateVoucherContent(response.printingField, expectedVoucherLines);
        validateAutoservicioMulticodeSaleFields(response, 271, 0, "Aprobado", 597029414303, "IM750164", true, "123456", "475618", 1000, 3331, "62", "DB", "00-00-00", "331", "P ", "18032026", "171040", 597012345678, null, null, null, null);

        expect(sentMessage).toEqual(buildMessage("0270|1000|123456|1|0|597029414303"));

    });

     it("performs debit multicode sale and parses approved response without voucher", async () => {
         const pos = await createConnectedPos(suite);

         const salePromise = pos.multicodeSale(1000, "123456", 597029414303);
         const sentMessage = await captureSend(pos);
         await sendReply(pos, ACK_BYTE);
         await sendReply(pos, "0271|00|597029414303|IM750164|123456|673501|1000|3331|63|DB|00-00-00|331|P |18032026|171113|597012345678");
         const response = await salePromise;

         expect(response.printingField).toBeNull();
         validateAutoservicioMulticodeSaleFields(response, 271, 0, "Aprobado", 597029414303, "IM750164", true, "123456", "673501", 1000, 3331, "63", "DB", "00-00-00", "331", "P ", "18032026", "171113", 597012345678, null, null, null, null);
         expect(sentMessage).toEqual(buildMessage("0270|1000|123456|0|0|597029414303"));
     });
});

describe("POS Autoservicio - Credit multicode sale transaction", () => {
    const suite = setupSuiteContext();

     it("performs credit multicode sale and parses approved response with voucher", async () => {
         const pos = await createConnectedPos(suite);

        const salePromise = pos.multicodeSale(10000, "123456", 597029414303, true);
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, multiCodeSaleCreditWithVoucherResponsePayload);
        const response = await salePromise;
        const expectedVoucherLines = [
            "COMPROBANTE DE VENTA",
            "PAGO EN CUOTAS",
            "TARJETA DE CREDITO",
            "NUMERO DE CUOTAS",
            "TIPO DE CUOTAS",
            "CUOTAS SIN INTERES"
        ];

        validateVoucherContent(response.printingField, expectedVoucherLines);
        validateAutoservicioMulticodeSaleFields(response, 271, 0, "Aprobado", 597029414303, "IM750164", true, "123456", "194937", 10000, 6590, "64", "CR", "", "", "VI", "18032026", "171153", 597012345678, "03", "03", "3334", "CUOTAS SIN INTERES");
         expect(sentMessage).toEqual(buildMessage("0270|10000|123456|1|0|597029414303"));
     });

     it("performs credit multicode sale and parses approved response without voucher", async () => {
         const pos = await createConnectedPos(suite);

         const salePromise = pos.multicodeSale(1000, "123456", 597029414303);
         const sentMessage = await captureSend(pos);
         await sendReply(pos, ACK_BYTE);
         await sendReply(pos, "0271|00|597029414303|IM750164|123456|785992|10000|6590|65|CR|||VI|18032026|171232|597012345678||03|03|3334|CUOTAS SIN INTERES");
         const response = await salePromise;

         expect(sentMessage).toEqual(buildMessage("0270|10000|123456|0|0|597029414303"));
         expect(response.printingField).toBeNull();
         validateAutoservicioMulticodeSaleFields(response, 271, 0, "Aprobado", 597029414303, "IM750164", true, "123456", "785992", 10000, 6590, "65", "CR", "", "", "VI", "18032026", "171232", 597012345678, "03", "03", "3334", "CUOTAS SIN INTERES");
     });
});
