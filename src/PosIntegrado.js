const POSBase = require('./PosBase');
const { parseString, parseNumber } = require("./helpers/fieldParser");
const FUNCTION_CODE_MULTICODE_SALE_REQUEST = '0270';
const FUNCTION_CODE_SALE_REQUEST = '0200';
const CONSECUTIVE_EMPTY_AUTHCODE_LIMIT = 2;
const SUCCESSFUL_RESPONSE_CODE = 0;

module.exports = class POSIntegrado extends POSBase {

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

    closeDay() {
        return this.send("0500||").then((data) => {
            let chunks = data.split("|")
            return {
                functionCode: Number.parseInt(chunks[0]),
                responseCode: Number.parseInt(chunks[1]),
                commerceCode: Number.parseInt(chunks[2]),
                terminalId: chunks[3],
                responseMessage: this.getResponseMessage (Number.parseInt(chunks[1])),
                successful: Number.parseInt(chunks[1])===0
            }
        })
    }

    getLastSale() {
        return this.send("0250|").then((data) => {
            try {
                return this.lastSaleResponse(data)
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
                responseMessage: this.getResponseMessage (Number.parseInt(chunks[1])),
                successful: Number.parseInt(chunks[1])===0
            }
        })
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

            if (printOnPos) {
                    this.send(`0260|${print}|`, false)
                        .then(() => resolve(true))
                        .catch(reject);
                    return;
            }

            let sales = [];
            let consecutiveEmptyAuthCodes = 0;
            const command = `0260|${print}|`;

            const processDetailResponse = (responsePayload) => {
                let detail = this.saleDetailResponse(responsePayload);

                if (detail.authorizationCode === "" || detail.authorizationCode === null) {
                    consecutiveEmptyAuthCodes++;
                } else {
                    consecutiveEmptyAuthCodes = 0;
                    sales.push(detail);
                }

                if (consecutiveEmptyAuthCodes >= CONSECUTIVE_EMPTY_AUTHCODE_LIMIT) {;
                    return true;
                }

                return false;
            };

            this.send(command, true, processDetailResponse)
                .then(() => {
                    resolve(sales);
                })
                .catch(error => {
                    reject(error);
                });
        });
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
                responseMessage: this.getResponseMessage (Number.parseInt(chunks[1])),
                successful: Number.parseInt(chunks[1])===0
            }
        })
    }

    changeToNormalMode() {
        return this.send("0300", false)
    }

    buildSaleCommand(functionCode, amount, ticket, sendStatus, sendVoucher, commerceCode = null) {
        const statusStr = this.getBooleanFlag(sendStatus);
        const voucherStr = this.getBooleanFlag(sendVoucher);

        let command = `${functionCode}|${amount}|${ticket}||${voucherStr}|${statusStr}`;

        if (functionCode === FUNCTION_CODE_MULTICODE_SALE_REQUEST) {
            const code = commerceCode && commerceCode !== '0' ? commerceCode : '';
            command += `|${code}|`;
        }
        
        return command;
    }

    sale(amount, ticket, sendStatus = false, sendVoucher = false, callback = null) {
        const command = this.buildSaleCommand(FUNCTION_CODE_SALE_REQUEST, amount, ticket, sendStatus, sendVoucher);
        return this.send(command, true, callback).then((data) => {
            return this.saleResponse(data);
        });
    }

    multicodeSale(amount, ticket, commerceCode = null, sendStatus = false, sendVoucher = false, callback = null) {
        const command = this.buildSaleCommand(FUNCTION_CODE_MULTICODE_SALE_REQUEST, amount, ticket, sendStatus, sendVoucher, commerceCode);
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
            responseMessage: this.getResponseMessage (Number.parseInt(chunks[1])),
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
        const chunks = payload.split("|");
        const authorizationCode = typeof chunks[5] !== 'undefined' ? chunks[5].trim() : null;
        const response = {
            functionCode: Number.parseInt(chunks[0]),
            responseCode: Number.parseInt(chunks[1]),
            commerceCode: Number.parseInt(chunks[2]),
            terminalId: chunks[3],
            responseMessage: this.getResponseMessage (Number.parseInt(chunks[1])),
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
            tip: chunks[18] !== '' ? Number.parseInt(chunks[18]) : null,
            voucher: null
        }
        
        if (chunks[19] && chunks[19].length > 1) {
            response.voucher = chunks[19]?.match(/.{1,40}/g);
        }

        return response;
    }

    multicodeSaleResponse(payload) {
        const chunks = payload.split("|");
        const authorizationCode = typeof chunks[5] !== 'undefined' ? chunks[5].trim() : null;
        const response = {
            functionCode: Number.parseInt(chunks[0]),
            responseCode: Number.parseInt(chunks[1]),
            commerceCode: Number.parseInt(chunks[2]),
            terminalId: chunks[3],
            responseMessage: this.getResponseMessage (Number.parseInt(chunks[1])),
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
            tip: chunks[18] !== '' ? Number.parseInt(chunks[18]) : null,
            voucher: null,
            change: chunks[20],
            lenderCommerceCode: Number.parseInt(chunks[21])
        }

        if (chunks[19] && chunks[19].length > 1) {
            response.voucher = chunks[19]?.match(/.{1,40}/g);
        }

        return response
    }

    lastSaleResponse(payload) {
        const chunks = payload.split("|");
        const responseCode = parseNumber(chunks[1]);

        return {
            functionCode: parseString(chunks[0]),
            responseCode: responseCode,
            commerceCode: parseNumber(chunks[2]),
            terminalId: parseString(chunks[3]),
            responseMessage: this.getResponseMessage(responseCode),
            successful: responseCode === SUCCESSFUL_RESPONSE_CODE,
            ticket: parseString(chunks[4]),
            authorizationCode: parseString(chunks[5]),
            amount: parseNumber(chunks[6]),
            installmentsNumber: parseNumber(chunks[7]),
            installmentsAmount: parseNumber(chunks[8]),
            last4Digits: parseNumber(chunks[9]),
            operationNumber: parseNumber(chunks[10]),
            cardType: parseString(chunks[11]),
            accountingDate: parseString(chunks[12]),
            accountNumber: parseString(chunks[13]),
            cardBrand: parseString(chunks[14]),
            realDate: parseString(chunks[15]),
            realTime: parseString(chunks[16]),
            employeeId: parseNumber(chunks[17]),
            tip: parseNumber(chunks[18])
        };
    }

}
