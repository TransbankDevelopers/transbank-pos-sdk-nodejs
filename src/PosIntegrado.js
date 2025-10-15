const POSBase = require('./PosBase')
const FUNCTION_CODE_MULTICODE_SALE_REQUEST = '0270';
const FUNCTION_CODE_SALE_REQUEST = '0200';

module.exports = class POSIntegrado extends POSBase {

    /*
     |--------------------------------------------------------------------------
     | POS Methods
     |--------------------------------------------------------------------------
     */

    closeDay() {
        return this.send("0500||").then((data) => {
            let chunks = data.split("|")
            return {
                functionCode: Number.parseInt(chunks[0]),
                responseCode: Number.parseInt(chunks[1]),
                commerceCode: Number.parseInt(chunks[2]),
                terminalId: chunks[3],
                responseMessage: this.getResponseMessage(Number.parseInt(chunks[1])),
                successful: Number.parseInt(chunks[1])===0
            }
        })
    }

    getLastSale() {
        return this.send("0250|").then((data) => {
            try {
                return this.saleResponse(data)
            } catch (e) {
                throw new Error(e.getMessage())
            }

        })
    }

    getTotals() {
        return this.send("0700||").then((data) => {
            let chunks = data.split("|")
            return {
                functionCode: Number.parseInt(chunks[0]),
                responseCode: Number.parseInt(chunks[1]),
                txCount: Number.parseInt(chunks[2]),
                txTotal: Number.parseInt(chunks[3]),
                responseMessage: this.getResponseMessage(Number.parseInt(chunks[1])),
                successful: Number.parseInt(chunks[1])===0
            }
        })
    }

    formatNumericString(value, length = 9) {
        return value.toString().padStart(length, "0").slice(0, length);
    }

    getBooleanFlag(value) {
        return (value === true || value === 'true') ? "1" : "0";
    }

    salesDetail(printOnPos = false) {
        return new Promise((resolve, reject) => {

            if(typeof printOnPos !== 'boolean' && typeof printOnPos !== 'string') {
                return reject(new Error("printOnPos must be of type boolean."))
            }

            if(typeof printOnPos === 'string') {
                printOnPos = (printOnPos === 'true' || printOnPos === '1')
            }

            let print = printOnPos ? "0":"1"
            let sales = []

            let promise = this.send(`0260|${print}|`, !printOnPos, onEverySale.bind(this))
            if (printOnPos) {
                resolve(promise)
            }

            function onEverySale(sale) {

                let detail = this.saleDetailResponse(sale.toString().slice(1, -2))
                if (detail.authorizationCode=== "" || detail.authorizationCode === null) {
                    resolve(sales)
                    return
                }
                sales.push(detail)
            }

        })

    }

    refund(operationId) {
        if (typeof operationId==="undefined") {
            throw new Error("Operation ID not provided when calling refund method.")
        }

        operationId = operationId.toString().slice(0, 6)
        return this.send(`1200|${operationId}|`).then((data) => {
            let chunks = data.split("|")
            return {
                functionCode: Number.parseInt(chunks[0]),
                responseCode: Number.parseInt(chunks[1]),
                commerceCode: Number.parseInt(chunks[2]),
                terminalId: chunks[3],
                authorizationCode: chunks[4].trim(),
                operationId: chunks[5],
                responseMessage: this.getResponseMessage(Number.parseInt(chunks[1])),
                successful: Number.parseInt(chunks[1])===0
            }
        })
    }

    changeToNormalMode() {
        return this.send("0300", false)
    }

    sale(amount, ticket, sendStatus = false, sendVoucher = false, callback = null) {
        const amountStr = this.formatNumericString(amount, 9);
        const ticketStr = this.formatNumericString(ticket, 6);
        const statusStr = this.getBooleanFlag(sendStatus);
        const voucherStr = this.getBooleanFlag(sendVoucher);

        const command = `${FUNCTION_CODE_SALE_REQUEST}|${amountStr}|${ticketStr}||${voucherStr}|${statusStr}`;

        return this.send(command, true, callback).then((data) => {
            return this.saleResponse(data);
        });
    }

    multicodeSale(amount, ticket, commerceCode = null, sendStatus = false, sendVoucher = false, callback = null) {
        const amountStr = this.formatNumericString(amount, 9);
        const ticketStr = this.formatNumericString(ticket, 6);
        const statusStr = this.getBooleanFlag(sendStatus);
        const voucherStr = this.getBooleanFlag(sendVoucher);
        const commerceCodeStr = this.formatNumericString(commerceCode || '0', 12);

        const command = `${FUNCTION_CODE_MULTICODE_SALE_REQUEST}|${amountStr}|${ticketStr}||${voucherStr}|${statusStr}|${commerceCodeStr}`;

        return this.send(command, true, callback).then((data) => {
            return this.multicodeSaleResponse(data);
        });
    }

    /*
     |--------------------------------------------------------------------------
     | Responses
     |--------------------------------------------------------------------------
     */

    saleDetailResponse(payload) {
        let chunks = payload.split("|")
        let authorizationCode = typeof chunks[5] !== 'undefined' ? chunks[5].trim() : null;
        return {
            functionCode: Number.parseInt(chunks[0]),
            responseCode: Number.parseInt(chunks[1]),
            commerceCode: Number.parseInt(chunks[2]),
            terminalId: chunks[3],
            responseMessage: this.getResponseMessage(Number.parseInt(chunks[1])),
            successful: Number.parseInt(chunks[1])===0,
            ticket: chunks[4],
            authorizationCode: authorizationCode,
            amount: chunks[6],
            last4Digits: Number.parseInt(chunks[7]),
            operationNumber: chunks[8],
            cardType: chunks[9],
            accountingDate: chunks[10],
            accountNumber: chunks[11],
            cardBrand: chunks[12],
            realDate: chunks[13],
            realTime: chunks[14],
            employeeId: chunks[15],
            tip: Number.parseInt(chunks[16]),
            feeAmount: (chunks[16]),
            feeNumber: (chunks[17])
        }
    }

    saleResponse(payload) {
        let chunks = payload.split("|")
        let authorizationCode = typeof chunks[5] !== 'undefined' ? chunks[5].trim() : null;
        let response = {
            functionCode: Number.parseInt(chunks[0]),
            responseCode: Number.parseInt(chunks[1]),
            commerceCode: Number.parseInt(chunks[2]),
            terminalId: chunks[3],
            responseMessage: this.getResponseMessage(Number.parseInt(chunks[1])),
            successful: Number.parseInt(chunks[1])===0,
            ticket: chunks[4],
            authorizationCode: authorizationCode,
            amount: Number.parseInt(chunks[6]),
            sharesNumber: chunks[7],
            sharesAmount: chunks[8],
            last4Digits: chunks[9] !== '' ? Number.parseInt(chunks[9]) : null,
            operationNumber: chunks[10],
            cardType: chunks[11],
            accountingDate: chunks[12],
            accountNumber: chunks[13],
            cardBrand: chunks[14],
            realDate: chunks[15],
            realTime: chunks[16],
            employeeId: chunks[17],
            tip: chunks[18] === '' ? null : Number.parseInt(chunks[18]),
            voucher: null
        };

        if (chunks[19] && chunks[19].length > 1) {
            response.voucher = chunks[19]?.match(/.{1,40}/g)
        }
        
        return response;
    }

    multicodeSaleResponse(payload) {
        let chunks = payload.split("|")
        let authorizationCode = typeof chunks[5] !== 'undefined'
            ? chunks[5].trim()
            : null;
        let response = {
            functionCode: Number.parseInt(chunks[0]),
            responseCode: Number.parseInt(chunks[1]),
            commerceCode: Number.parseInt(chunks[2]),
            terminalId: chunks[3],
            responseMessage: this.getResponseMessage(Number.parseInt(chunks[1])),
            successful: Number.parseInt(chunks[1])===0,
            ticket: chunks[4],
            authorizationCode: authorizationCode,
            amount: Number.parseInt(chunks[6]),
            sharesNumber: chunks[7],
            sharesAmount: chunks[8],
            last4Digits: chunks[9] !== '' ? Number.parseInt(chunks[9]) : null,
            operationNumber: chunks[10],
            cardType: chunks[11],
            accountingDate: chunks[12],
            accountNumber: chunks[13],
            cardBrand: chunks[14],
            realDate: chunks[15],
            realTime: chunks[16],
            employeeId: chunks[17],
            tip: chunks[18] === '' ? null : Number.parseInt(chunks[18]),
            voucher: null,
            providerCommerceCode: chunks[21] || null
        };

        if(chunks[19] && chunks[19].length > 1) {
            response.voucher = chunks[19]?.match(/.{1,40}/g)
        }

        return response;
    }

}
