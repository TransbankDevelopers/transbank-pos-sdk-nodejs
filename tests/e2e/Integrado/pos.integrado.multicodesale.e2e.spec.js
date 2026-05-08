const { setupSuiteContext } = require("../helpers/suiteContext");
const {
    ACK_BYTE,
    buildMessage,
    captureSend,
    sendReply,
    connectWithPollAck
} = require("../helpers/mockPos");

const {
    multiCodeSaleDebitVoucher,
    multiCodeSaleCreditVoucher
} = require("../helpers/integradoVoucherFixtures");

const {
    validateBaseSaleFields,
    validateSaleFields,
    validateAccountFields,
    validateVoucherContent
} = require("../helpers/validationHelpers");

const createConnectedPos = async (suite) => {
    const pos = suite.createIntegrado();
    await connectWithPollAck(pos);
    return pos;
};

const multiCodeSaleDebitWithVoucherResponsePayload =
    "0271|00|597029414300|IT750050|ABC123|708410|8000|00||3331|000143|DB|000000|  ********331      |DB|07042026|085034|||" +
    multiCodeSaleDebitVoucher +
    "|0|597029414303";

const multiCodeSaleDebitWithoutVoucherResponsePayload =
    "0271|00|597029414300|IT750050|ABC123|388892|7000|00||3331|000144|DB|000000|  ********331      |DB|07042026|085628||||0|597029414303|";

const multiCodeSaleCreditWithVoucherResponsePayload =
    "0271|00|597029414300|IT750050|ABC123|794160|12000|03|4000|6590|000141|CR|003000|3000000000000000000|VI|06042026|234109|||" +
    multiCodeSaleCreditVoucher +
    "|0|597029414303";

const multiCodeSaleCreditWithoutVoucherResponsePayload =
    "0271|00|597029414300|IT750050|ABC123|162529|9000|03|3000|6590|000142|CR|003000|3000000000000000000|VI|07042026|084918||||0|597029414303|";

const multiCodeSaleCancelledResponsePayload =
    "0271|07|||ABC123||90000|||||||||||||||597029414303|";

describe("POS Integrado - Debit multicode sale transaction", () => {
    const suite = setupSuiteContext();

    it("performs debit multicode sale and parses approved response with voucher", async () => {
        const pos = await createConnectedPos(suite);
        const salePromise = pos.multicodeSale(
            8000,
            "ABC123",
            597029414303,
            false,
            true
        );
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, multiCodeSaleDebitWithVoucherResponsePayload);
        const response = await salePromise;
        const expectedVoucherLines = [
            "               TRANSBANK                ",
            "         VENTA - COPIA COMERCIO         ",
            "OPERACION: 000143   AUTORIZACION: 708410",
            "               TRANSBANK                ",
            "         VENTA - COPIA CLIENTE          "
        ];

        expect(sentMessage).toEqual(
            buildMessage("0270|8000|ABC123||1|0|597029414303|")
        );
        validateVoucherContent(response.voucher, expectedVoucherLines);
        validateBaseSaleFields(
            response,
            271,
            0,
            "Aprobado",
            597029414300,
            "IT750050",
            true
        );
        validateSaleFields(
            response,
            "ABC123",
            "708410",
            8000,
            "000143",
            "07042026",
            "085034"
        );
        validateAccountFields(
            response,
            "DB",
            "DB",
            3331,
            "000000",
            "  ********331      "
        );
        expect(response.lenderCommerceCode).toBe(597029414303);
    });

    it("performs debit multicode sale and parses approved response without voucher", async () => {
        const pos = await createConnectedPos(suite);
        const salePromise = pos.multicodeSale(
            7000,
            "ABC123",
            597029414303,
            false,
            false
        );
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, multiCodeSaleDebitWithoutVoucherResponsePayload);
        const response = await salePromise;
        expect(response.voucher).toBeNull();
        validateBaseSaleFields(
            response,
            271,
            0,
            "Aprobado",
            597029414300,
            "IT750050",
            true
        );
        validateSaleFields(
            response,
            "ABC123",
            "388892",
            7000,
            "000144",
            "07042026",
            "085628"
        );
        validateAccountFields(
            response,
            "DB",
            "DB",
            3331,
            "000000",
            "  ********331      "
        );
        expect(response.lenderCommerceCode).toBe(597029414303);
        expect(sentMessage).toEqual(
            buildMessage("0270|7000|ABC123||0|0|597029414303|")
        );
    });
});

describe("POS Integrado - Cancelled transaction", () => {
    const suite = setupSuiteContext();

    it("performs debit multicode sale and parses cancelled response", async () => {
        const pos = await createConnectedPos(suite);
        const salePromise = pos.multicodeSale(
            90000,
            "ABC123",
            597029414303,
            false,
            true
        );
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, multiCodeSaleCancelledResponsePayload);
        const response = await salePromise;
        expect(sentMessage).toEqual(
            buildMessage("0270|90000|ABC123||1|0|597029414303|")
        );
        expect(response.responseCode).toBe(7);
        expect(response.responseMessage).toBe(
            "Transacción Cancelada desde el POS"
        );
        expect(response.successful).toBe(false);
    });
});

describe("POS Integrado - Credit multicode sale transaction", () => {
    const suite = setupSuiteContext();

    it("performs credit multicode sale and parses approved response with voucher", async () => {
        const pos = await createConnectedPos(suite);
        const salePromise = pos.multicodeSale(
            12000,
            "ABC123",
            597029414303,
            false,
            true
        );
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, multiCodeSaleCreditWithVoucherResponsePayload);
        const response = await salePromise;
        const expectedVoucherLines = [
            "               TRANSBANK                ",
            "     VENTA CON PIN - COPIA COMERCIO     ",
            "                                        ",
            "               TRANSBANK                ",
            "     VENTA CON PIN - COPIA CLIENTE      ",
            "OPERACION: 000141   AUTORIZACION: 794160"
        ];

        validateVoucherContent(response.voucher, expectedVoucherLines);
        validateBaseSaleFields(
            response,
            271,
            0,
            "Aprobado",
            597029414300,
            "IT750050",
            true
        );
        validateSaleFields(
            response,
            "ABC123",
            "794160",
            12000,
            "000141",
            "06042026",
            "234109"
        );
        validateAccountFields(
            response,
            "CR",
            "VI",
            6590,
            "003000",
            "3000000000000000000"
        );
        expect(response.sharesNumber).toBe("03");
        expect(response.sharesAmount).toBe("4000");
        expect(response.lenderCommerceCode).toBe(597029414303);
        expect(sentMessage).toEqual(
            buildMessage("0270|12000|ABC123||1|0|597029414303|")
        );
    });

    it("performs credit multicode sale and parses approved response without voucher", async () => {
        const pos = await createConnectedPos(suite);
        const salePromise = pos.multicodeSale(
            9000,
            "ABC123",
            597029414303,
            false,
            false
        );
        const sentMessage = await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
        await sendReply(pos, multiCodeSaleCreditWithoutVoucherResponsePayload);
        const response = await salePromise;

        expect(response.voucher).toBeNull();
        validateBaseSaleFields(
            response,
            271,
            0,
            "Aprobado",
            597029414300,
            "IT750050",
            true
        );
        validateSaleFields(
            response,
            "ABC123",
            "162529",
            9000,
            "000142",
            "07042026",
            "084918"
        );
        validateAccountFields(
            response,
            "CR",
            "VI",
            6590,
            "003000",
            "3000000000000000000"
        );
        expect(response.sharesNumber).toBe("03");
        expect(response.sharesAmount).toBe("3000");
        expect(response.lenderCommerceCode).toBe(597029414303);
        expect(sentMessage).toEqual(
            buildMessage("0270|9000|ABC123||0|0|597029414303|")
        );
    });
});
