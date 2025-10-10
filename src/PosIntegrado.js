const POSBase = require('./PosBase')
const FUNCTION_CODE_MULTICODE_SALE = '0271';
const FUNCTION_CODE_MULTICODE_SALE_REQUEST = '0270';
const FUNCTION_CODE_MULTICODE_CASHBACK_SALE_REQUEST = '0280';
const FUNCTION_CODE_MULTICODE_CASHBACK_SALE_RESPONSE = '281';

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
                functionCode: parseInt(chunks[0]),
                responseCode: parseInt(chunks[1]),
                commerceCode: parseInt(chunks[2]),
                terminalId: chunks[3],
                responseMessage: this.getResponseMessage(parseInt(chunks[1])),
                successful: parseInt(chunks[1])===0
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
                functionCode: parseInt(chunks[0]),
                responseCode: parseInt(chunks[1]),
                txCount: parseInt(chunks[2]),
                txTotal: parseInt(chunks[3]),
                responseMessage: this.getResponseMessage(parseInt(chunks[1])),
                successful: parseInt(chunks[1])===0
            }
        })
    }

    formatNumericString(value, length = 9) {
        return value.toString().padStart(length, "0").slice(0, length);
    }

    getBooleanFlag(value) {
        return (value === true || value === 'true') ? "1" : "0";
    }

    getCommandParameters(amount, ticket, commerceCode, cashbackAmount, sendStatus, sendVoucher) {
        const numericCashback = Number.parseInt(cashbackAmount) || 0;
        const hasCashback = numericCashback > 0;

        return {
            commandCode: hasCashback ? FUNCTION_CODE_MULTICODE_CASHBACK_SALE_REQUEST : FUNCTION_CODE_MULTICODE_SALE_REQUEST,
            amountStr: this.formatNumericString(amount, 9),
            ticketStr: this.formatNumericString(ticket, 6),
            cashbackStr: hasCashback ? this.formatNumericString(numericCashback, 9) : "",
            statusStr: this.getBooleanFlag(sendStatus),
            voucherStr: hasCashback ? "0" : this.getBooleanFlag(sendVoucher),
            commerceCodeStr: this.formatNumericString(commerceCode ?? '0', 12),
            numericCashback
        };
    }



    buildMulticodeSaleCommand(params) {
        return `${params.commandCode}|${params.amountStr}|${params.ticketStr}|${params.cashbackStr}|${params.voucherStr}|${params.statusStr}|${params.commerceCodeStr}`;
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
                functionCode: parseInt(chunks[0]),
                responseCode: parseInt(chunks[1]),
                commerceCode: parseInt(chunks[2]),
                terminalId: chunks[3],
                authorizationCode: chunks[4].trim(),
                operationId: chunks[5],
                responseMessage: this.getResponseMessage(parseInt(chunks[1])),
                successful: parseInt(chunks[1])===0
            }
        })
    }

    changeToNormalMode() {
        return this.send("0300", false)
    }

    sale(amount, ticket, sendStatus = false, sendVoucher = false, callback = null) {
        amount = amount.toString().padStart(9, "0").slice(0, 9);
        ticket = ticket.toString().padStart(6, "0").slice(0, 6);
        let status = sendStatus ? "1" : "0";
        let voucher = sendVoucher ? "1" : "0";

        return this.send(`0200|${amount}|${ticket}||${voucher}|${status}`, true, callback).then((data) => {
            return this.saleResponse(data);
        });
    }

    multicodeSale(amount, ticket, commerceCode = null, cashbackAmount = 0, sendStatus = false, sendVoucher = false, callback = null) {
        const params = this.getCommandParameters(amount, ticket, commerceCode, cashbackAmount, sendStatus, sendVoucher);
        const command = this.buildMulticodeSaleCommand(params);

        return this.send(command, true, callback).then((data) => {
            const parsedResponse = this.saleResponse(data);
            
            if (parsedResponse.functionCode.toString() === FUNCTION_CODE_MULTICODE_CASHBACK_SALE_RESPONSE) {
                parsedResponse.cashbackSent = params.numericCashback;
                parsedResponse.commerceCodeSent = params.commerceCodeStr;
            }

            return parsedResponse;
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
            functionCode: parseInt(chunks[0]),
            responseCode: parseInt(chunks[1]),
            commerceCode: parseInt(chunks[2]),
            terminalId: chunks[3],
            responseMessage: this.getResponseMessage(parseInt(chunks[1])),
            successful: parseInt(chunks[1])===0,
            ticket: chunks[4],
            authorizationCode: authorizationCode,
            amount: chunks[6],
            last4Digits: parseInt(chunks[7]),
            operationNumber: chunks[8],
            cardType: chunks[9],
            accountingDate: chunks[10],
            accountNumber: chunks[11],
            cardBrand: chunks[12],
            realDate: chunks[13],
            realTime: chunks[14],
            employeeId: chunks[15],
            tip: parseInt(chunks[16]),
            feeAmount: (chunks[16]),
            feeNumber: (chunks[17])
        }
    }

    saleResponse(payload) {
        let chunks = payload.split("|")
            let authorizationCode = typeof chunks[5] !== 'undefined' ? chunks[5].trim() : null;
            let response = {
                functionCode: parseInt(chunks[0]),
                responseCode: parseInt(chunks[1]),
                commerceCode: parseInt(chunks[2]),
                terminalId: chunks[3],
                responseMessage: this.getResponseMessage(parseInt(chunks[1])),
                successful: parseInt(chunks[1])===0,
                ticket: chunks[4],
                authorizationCode: authorizationCode,
                amount: parseInt(chunks[6]),
                sharesNumber: chunks[7],
                sharesAmount: chunks[8],
                last4Digits: chunks[9] !== '' ? parseInt(chunks[9]) : null,
                operationNumber: chunks[10],
                cardType: chunks[11],
                accountingDate: chunks[12],
                accountNumber: chunks[13],
                cardBrand: chunks[14],
                realDate: chunks[15],
                realTime: chunks[16],
                employeeId: chunks[17],
                tip: chunks[18] === '' ? null : Number.parseInt(chunks[18]),
                commerceCodeSent: null,
                providerCommerceCode: null,
                voucher: null
            };

            const functionCodeStr = response.functionCode.toString(); 

            if (functionCodeStr !== FUNCTION_CODE_MULTICODE_CASHBACK_SALE_RESPONSE && chunks[19] 
                && chunks[19].length > 1) {
                response.voucher = chunks[19]?.match(/.{1,40}/g)
            }
            
            if (functionCodeStr === FUNCTION_CODE_MULTICODE_SALE || 
                functionCodeStr === FUNCTION_CODE_MULTICODE_CASHBACK_SALE_RESPONSE) {
                response.cashback = Number.parseInt(chunks[20]) || 0;
                response.providerCommerceCode = chunks[21]; 
            }
        
        return response;
    }

}
