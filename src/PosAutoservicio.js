const POSBase = require('./PosBase')
const FUNCTION_CODE_SALE_REQUEST = '0200';
const FUNCTION_CODE_MULTICODE_SALE_REQUEST = '0270';

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

     buildSaleCommand(functionCode, amount, ticket, sendVoucher, sendStatus, commerceCode = null) {
        const formattedAmount = amount.toString().padStart(9, "0");
        const formattedTicket = ticket.toString().padStart(6, "0").slice(0, 20);
        const statusStr = this.getBooleanFlag(sendStatus);
        const voucherStr = this.getBooleanFlag(sendVoucher);

        if (functionCode === FUNCTION_CODE_MULTICODE_SALE_REQUEST) {
            const code = commerceCode ? commerceCode : '0';
            return `${functionCode}|${formattedAmount}|${formattedTicket}|${voucherStr}|${statusStr}|${code}`;
        }
        
        return `${functionCode}|${formattedAmount}|${formattedTicket}||${voucherStr}|${statusStr}`;
    }

    sale(amount, ticket, sendStatus = false, sendVoucher = false, callback = null) {
        const command = this.buildSaleCommand(FUNCTION_CODE_SALE_REQUEST, amount, ticket, sendVoucher, sendStatus);
        return this.send(command, true, callback).then((data) => {
            return this.saleResponse(data)
        })
    }

    multicodeSale(amount, ticket, commerceCode, sendVoucher = false, sendStatus = false, callback = null) {
        const command = this.buildSaleCommand(FUNCTION_CODE_MULTICODE_SALE_REQUEST, amount, ticket, sendVoucher, sendStatus, commerceCode);
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
        const responseCode = Number.parseInt(chunks[1]);
        const successful = responseCode === 0;

        if (!successful) {
            return {
                functionCode: Number.parseInt(chunks[0].replace(/\D+/g, '')),
                responseCode: responseCode,
                responseMessage: this.getResponseMessage(responseCode),
                successful: successful,
            };
        }

        let authorizationCode = typeof chunks[5] !== 'undefined' ? chunks[5].trim() : null;

        let response = {
            functionCode: Number.parseInt(chunks[0].replace(/\D+/g, '')),
            responseCode: responseCode,
            responseMessage: this.getResponseMessage(responseCode),
            commerceCode: Number.parseInt(chunks[2]),
            terminalId: chunks[3],
            successful: successful,
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
        const responseCode = Number.parseInt(chunks[1]);
        const successful = responseCode === 0;

        if (!successful) {
            return {
                functionCode: Number.parseInt(chunks[0].replace(/\D+/g, '')),
                responseCode: responseCode,
                responseMessage: this.getResponseMessage(responseCode),
                successful: successful,
            };
        }
        const authorizationCode = chunks[5]?.trim() ?? null;

        return {
            functionCode: Number.parseInt(chunks[0].replace(/\D+/g, '')),
            responseCode: responseCode,
            responseMessage: this.getResponseMessage(responseCode),
            successful: successful,
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
            printingField: chunks[15]?.match(/.{1,40}/g) ?? null,
            sharesType: chunks[16] ?? null,
            sharesNumber: chunks[17] ?? null,
            sharesAmount: chunks[18] ?? null,
            sharesTypeGloss: chunks[19] ?? null,
        };
    }

}
