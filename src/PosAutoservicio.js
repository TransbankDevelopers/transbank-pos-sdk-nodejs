const POSBase = require('./PosBase')
const FUNCTION_CODE_SALE = '0200';
const FUNCTION_CODE_MULTICODE_SALE = '0270';

module.exports = class POSAutoservicio extends POSBase {

    /*
     |--------------------------------------------------------------------------
     | Auxiliary Methods
     |--------------------------------------------------------------------------
     */

    formatNumericString(value, length = 9) {
        return value.toString().padStart(length, "0").slice(0, length);
    }

    getBooleanFlag(value) {
        return (value === true || value === 'true') ? "1" : "0";
    }

    getBaseResponse(chunks) {
        return {
            functionCode: Number.parseInt(chunks[0]),
            responseCode: Number.parseInt(chunks[1]),
            commerceCode: Number.parseInt(chunks[2]),
            terminalId: chunks[3],
            responseMessage: this.getResponseMessage(Number.parseInt(chunks[1])),
            successful: Number.parseInt(chunks[1]) === 0
        };
    }

    getBaseSaleResponse(chunks) {
        const baseResponse = this.getBaseResponse(chunks);
        const authorizationCode = chunks[5]?.trim() ?? null;

        return {
            ...baseResponse,
            ticket: chunks[4],
            authorizationCode,
            amount: Number.parseInt(chunks[6]),
            last4Digits: chunks[7] ? Number.parseInt(chunks[7]) : null,
            operationNumber: chunks[8],
            cardType: chunks[9],
            accountingDate: chunks[10],
            accountNumber: chunks[11],
            cardBrand: chunks[12],
            realDate: chunks[13],
            realTime: chunks[14],
            voucher: chunks[15]?.match(/.{1,40}/g) ?? null,
            shareType: chunks[16] ?? null,
            sharesNumber: chunks[17] ?? null,
            sharesAmount: chunks[18] ?? null,
            sharesTypeComment: chunks[19] ?? null
        };
    }

    /*
     |--------------------------------------------------------------------------
     | POS Methods
     |--------------------------------------------------------------------------
     */

    buildSaleCommand(functionCode, amount, ticket, sendStatus, sendVoucher) {
        const amountStr = this.formatNumericString(amount, 9);
        const ticketStr = ticket.toString().padStart(6, "0").slice(0, 6);
        const statusStr = this.getBooleanFlag(sendStatus);
        const voucherStr = this.getBooleanFlag(sendVoucher);
        
        return `${functionCode}|${amountStr}|${ticketStr}||${voucherStr}|${statusStr}`;
    }

    buildMulticodeSaleCommand(functionCode, amount, ticket, commerceCode, sendStatus, sendVoucher) {
        const amountStr = this.formatNumericString(amount, 9);
        const ticketStr = ticket.toString().slice(0, 20);
        const commerceCodeStr = this.formatNumericString(commerceCode, 12);
        const statusStr = this.getBooleanFlag(sendStatus);
        const voucherStr = this.getBooleanFlag(sendVoucher);

        return `${functionCode}|${amountStr}|${ticketStr}|${voucherStr}|${statusStr}|${commerceCodeStr}`;
    }

    sale(amount, ticket, sendStatus = false, sendVoucher = false, callback = null) {
        const command = this.buildSaleCommand(FUNCTION_CODE_SALE, amount, ticket, sendStatus, sendVoucher);
        return this.send(command, true, callback).then((data) => {
            return this.saleResponse(data)
        })
    }

    multicodeSale(amount, ticket, commerceCode, sendStatus = false, sendVoucher = false, callback = null) {
        const command = this.buildMulticodeSaleCommand(FUNCTION_CODE_MULTICODE_SALE, amount, ticket, commerceCode, sendStatus, sendVoucher);
        return this.send(command, true, callback).then((data) => {
            return this.multicodeSaleResponse(data)
        })
    }

    getLastSale(sendVoucher = false) {
        let voucher = sendVoucher ? "1" : "0"
        return this.send(`0250|${voucher}`).then((data) => {
            try {
                return this.saleResponse(data)
            } catch (e) {
                throw new Error(e.getMessage())
            }
        })
    }

    refund() {
        return this.send(`1200`).then((data) => {
            let chunks = data.split("|")
            return {
                functionCode: Number.parseInt(chunks[0].replace(/\D+/g, '')),
                responseCode: Number.parseInt(chunks[1]),
                commerceCode: Number.parseInt(chunks[2]),
                terminalId: chunks[3],
                authorizationCode: chunks[4].trim(),
                operationId: chunks[5],
                responseMessage: this.getResponseMessage(parseInt(chunks[1])),
                successful: Number.parseInt(chunks[1]) === 0
            }
        })
    }

    closeDay(sendVoucher = false) {
        let voucher = sendVoucher ? "1" : "0"
        return this.send(`0500|${voucher}`).then((data) => {
            let chunks = data.split("|")
            return {
                functionCode: Number.parseInt(chunks[0]),
                responseCode: Number.parseInt(chunks[1]),
                commerceCode: Number.parseInt(chunks[2]),
                terminalId: chunks[3],
                voucher: chunks[4]?.match(/.{1,40}/g),
                responseMessage: this.getResponseMessage(parseInt(chunks[1])),
                successful: Number.parseInt(chunks[1]) === 0
            }
        })
    }

    initialization() {
        return this.send("0070", false)
    }

    /*
     |--------------------------------------------------------------------------
     | Responses
     |--------------------------------------------------------------------------
     */

    initializationResponse() {
        return this.send("0080").then((data) => {
            let chunks = data.split("|")
            return {
                functionCode: Number.parseInt(chunks[0]),
                responseCode: Number.parseInt(chunks[1]),
                transactionDate: Number.parseInt(chunks[2]),
                transactionTime: chunks[3],
                responseMessage: this.getResponseMessage(parseInt(chunks[1])),
                successful: Number.parseInt(chunks[1])===0
            }
        })
    }

    saleResponse(payload) {
        let chunks = payload.split("|")
        let authorizationCode = typeof chunks[5] !== 'undefined' ? chunks[5].trim() : null;

        let response = {
            functionCode: Number.parseInt(chunks[0]),
            responseCode: Number.parseInt(chunks[1]),
            responseMessage: this.getResponseMessage(Number.parseInt(chunks[1])),
            commerceCode: Number.parseInt(chunks[2]),
            terminalId: chunks[3],
            successful: Number.parseInt(chunks[1]) === 0,
            ticket: chunks[4],
            authorizationCode: authorizationCode,
            amount: Number.parseInt(chunks[6]),
            last4Digits: chunks[7] !== '' ? Number.parseInt(chunks[7]) : null,
            operationNumber: chunks[8],
            cardType: chunks[9],
            accountingDate: chunks[10],
            accountNumber: chunks[11],
            cardBrand: chunks[12],
            realDate: chunks[13],
            realTime: chunks[14],
            voucher: chunks[15]?.match(/.{1,40}/g),
            shareType: chunks[16],
            sharesNumber: chunks[17],
            sharesAmount: chunks[18],
            sharesTypeComment: chunks[19]
        };
        return response;
    }

    multicodeSaleResponse(payload) {
        const chunks = payload.split("|");
        const authorizationCode = chunks[5]?.trim() ?? null;

        return {
            functionCode: Number.parseInt(chunks[0]),
            responseCode: Number.parseInt(chunks[1]),
            responseMessage: this.getResponseMessage(Number.parseInt(chunks[1])),
            successful: Number.parseInt(chunks[1]) === 0,
            commerceCode: Number.parseInt(chunks[2]),
            terminalId: chunks[3],
            ticket: chunks[4],
            authorizationCode: authorizationCode,
            amount: Number.parseInt(chunks[6]),
            last4Digits: chunks[7] ? Number.parseInt(chunks[7]) : null,
            operationNumber: chunks[8],
            cardType: chunks[9],
            accountingDate: chunks[10],
            accountNumber: chunks[11],
            cardBrand: chunks[12],
            realDate: chunks[13],
            realTime: chunks[14],
            providerCommerceCode: chunks[15],
            voucher: chunks[16]?.match(/.{1,40}/g) ?? null,
            shareType: chunks[17] ?? null,
            sharesNumber: chunks[18] ?? null,
            sharesAmount: chunks[19] ?? null,
            sharesTypeComment: chunks[20] ?? null,
        };
    }

}
