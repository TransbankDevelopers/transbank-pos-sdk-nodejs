const POSBase = require("./PosBase");
const { normalizeEmptyField, parseNumber } = require("./helpers/fieldParser");
const FUNCTION_CODE_SALE_REQUEST = "0200";
const FUNCTION_CODE_MULTICODE_SALE_REQUEST = "0270";
const SUCCESSFUL_INITIALIZATION_CODE = 90;

module.exports = class POSAutoservicio extends POSBase {
    /*
     |--------------------------------------------------------------------------
     | Auxiliary Methods
     |--------------------------------------------------------------------------
     */

    getBooleanFlag(value) {
        return value ? "1" : "0";
    }

    /*
     |--------------------------------------------------------------------------
     | POS Methods
     |--------------------------------------------------------------------------
     */

    buildSaleCommand(
        functionCode,
        amount,
        ticket,
        sendVoucher,
        sendStatus,
        commerceCode = null
    ) {
        const statusStr = this.getBooleanFlag(sendStatus);
        const voucherStr = this.getBooleanFlag(sendVoucher);

        if (functionCode === FUNCTION_CODE_MULTICODE_SALE_REQUEST) {
            const code = commerceCode || "0";
            return `${functionCode}|${amount}|${ticket}|${voucherStr}|${statusStr}|${code}`;
        }

        return `${functionCode}|${amount}|${ticket}|${voucherStr}|${statusStr}`;
    }

    sale(
        amount,
        ticket,
        sendStatus = false,
        sendVoucher = false,
        callback = null
    ) {
        const command = this.buildSaleCommand(
            FUNCTION_CODE_SALE_REQUEST,
            amount,
            ticket,
            sendVoucher,
            sendStatus
        );
        return this.send(command, true, callback).then((data) => {
            return this.saleResponse(data);
        });
    }

    multicodeSale(
        amount,
        ticket,
        commerceCode,
        sendVoucher = false,
        sendStatus = false,
        callback = null
    ) {
        const command = this.buildSaleCommand(
            FUNCTION_CODE_MULTICODE_SALE_REQUEST,
            amount,
            ticket,
            sendVoucher,
            sendStatus,
            commerceCode
        );
        return this.send(command, true, callback).then((data) => {
            return this.multicodeSaleResponse(data);
        });
    }

    getLastSale(sendVoucher = false) {
        let voucher = sendVoucher ? "1" : "0";
        return this.send(`0250|${voucher}`).then((data) => {
            try {
                return this.saleResponse(data);
            } catch (e) {
                throw new Error(e.getMessage());
            }
        });
    }

    refund() {
        return this.send(`1200`).then((data) => {
            let chunks = data.split("|");
            const responseCode = parseNumber(chunks[1]);
            return {
                functionCode: normalizeEmptyField(
                    chunks[0].replaceAll(/\D+/g, "")
                ),
                responseCode: responseCode,
                commerceCode: parseNumber(chunks[2]),
                terminalId: normalizeEmptyField(chunks[3]),
                authorizationCode: normalizeEmptyField(chunks[4].trim()),
                operationId: normalizeEmptyField(chunks[5]),
                responseMessage: this.getResponseMessage(responseCode),
                success: responseCode === 0,
                rawResponse: normalizeEmptyField(data)
            };
        });
    }

    closeDay(sendVoucher = false) {
        let voucher = sendVoucher ? "1" : "0";
        return this.send(`0500|${voucher}`).then((data) => {
            let chunks = data.split("|");
            const responseCode = parseNumber(chunks[1]);
            return {
                functionCode: normalizeEmptyField(chunks[0]),
                responseCode: responseCode,
                commerceCode: parseNumber(chunks[2]),
                terminalId: normalizeEmptyField(chunks[3]),
                printingField: chunks[4]?.match(/.{1,40}/g),
                rawVoucher: normalizeEmptyField(chunks[4]),
                responseMessage: this.getResponseMessage(responseCode),
                success: responseCode === 0,
                rawResponse: normalizeEmptyField(data)
            };
        });
    }

    initialization() {
        return this.send("0070", false);
    }

    /*
     |--------------------------------------------------------------------------
     | Responses
     |--------------------------------------------------------------------------
     */

    initializationResponse() {
        return this.send("0080").then((data) => {
            let chunks = data.split("|");
            const responseCode = parseNumber(chunks[1]);
            return {
                functionCode: normalizeEmptyField(chunks[0]),
                responseCode: responseCode,
                transactionDate: normalizeEmptyField(chunks[2]),
                transactionTime: normalizeEmptyField(chunks[3]),
                responseMessage: this.getResponseMessage(responseCode),
                success: responseCode === SUCCESSFUL_INITIALIZATION_CODE,
                rawResponse: normalizeEmptyField(data)
            };
        });
    }

    saleResponse(payload) {
        let chunks = payload.split("|");
        const responseCode = parseNumber(chunks[1]);

        return {
            functionCode: normalizeEmptyField(chunks[0].replaceAll(/\D+/g, "")),
            responseCode: responseCode,
            responseMessage: this.getResponseMessage(responseCode),
            commerceCode: parseNumber(chunks[2]),
            terminalId: normalizeEmptyField(chunks[3]),
            success: responseCode === 0,
            ticket: normalizeEmptyField(chunks[4]),
            authorizationCode: normalizeEmptyField(chunks[5]),
            amount: parseNumber(chunks[6]),
            last4Digits: parseNumber(chunks[7]),
            operationNumber: parseNumber(chunks[8]),
            cardType: normalizeEmptyField(chunks[9]),
            accountingDate: normalizeEmptyField(chunks[10]),
            accountNumber: normalizeEmptyField(chunks[11]),
            cardBrand: normalizeEmptyField(chunks[12]),
            realDate: normalizeEmptyField(chunks[13]),
            realTime: normalizeEmptyField(chunks[14]),
            printingField: chunks[15]?.match(/.{1,40}/g) ?? null,
            rawVoucher: normalizeEmptyField(chunks[15]),
            installmentsType: parseNumber(chunks[16]),
            installmentsNumber: parseNumber(chunks[17]),
            installmentsAmount: parseNumber(chunks[18]),
            installmentsTypeDescription: normalizeEmptyField(chunks[19]),
            rawResponse: normalizeEmptyField(payload)
        };
    }

    multicodeSaleResponse(payload) {
        const chunks = payload.split("|");
        const responseCode = parseNumber(chunks[1]);

        return {
            functionCode: normalizeEmptyField(chunks[0].replaceAll(/\D+/g, "")),
            responseCode: responseCode,
            responseMessage: this.getResponseMessage(responseCode),
            success: responseCode === 0,
            commerceCode: parseNumber(chunks[2]),
            terminalId: normalizeEmptyField(chunks[3]),
            ticket: normalizeEmptyField(chunks[4]),
            authorizationCode: normalizeEmptyField(chunks[5]),
            amount: parseNumber(chunks[6]),
            last4Digits: parseNumber(chunks[7]),
            operationNumber: parseNumber(chunks[8]),
            cardType: normalizeEmptyField(chunks[9]),
            accountingDate: normalizeEmptyField(chunks[10]),
            accountNumber: normalizeEmptyField(chunks[11]),
            cardBrand: normalizeEmptyField(chunks[12]),
            realDate: normalizeEmptyField(chunks[13]),
            realTime: normalizeEmptyField(chunks[14]),
            commerceProviderCode: parseNumber(chunks[15]),
            printingField: chunks[16]?.match(/.{1,40}/g) ?? null,
            rawVoucher: normalizeEmptyField(chunks[16]),
            installmentsType: parseNumber(chunks[17]),
            installmentsNumber: parseNumber(chunks[18]),
            installmentsAmount: parseNumber(chunks[19]),
            installmentsTypeDescription: normalizeEmptyField(chunks[20]),
            rawResponse: normalizeEmptyField(payload)
        };
    }
};
