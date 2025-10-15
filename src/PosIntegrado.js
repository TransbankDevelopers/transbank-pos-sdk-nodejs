const POSBase = require('./PosBase')
const FUNCTION_CODE_MULTICODE_SALE_REQUEST = '0270';
const FUNCTION_CODE_SALE_REQUEST = '0200';

module.exports = class POSIntegrado extends POSBase {

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
            sharesNumber: chunks[7],
            sharesAmount: chunks[8],
            last4Digits: chunks[9] === '' ? null : Number.parseInt(chunks[9]),
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
    }

    addVoucherToResponse(response, chunks) {
        if (chunks[19] && chunks[19].length > 1) {
            response.voucher = chunks[19]?.match(/.{1,40}/g);
        }
        return response;
    }

    /*
     |--------------------------------------------------------------------------
     | POS Methods
     |--------------------------------------------------------------------------
     */

    closeDay() {
        return this.send("0500||").then((data) => {
            return this.getBaseResponse(data.split("|"));
        });
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
            const chunks = data.split("|");
            const baseResponse = this.getBaseResponse(chunks);
            return {
                ...baseResponse,
                txCount: Number.parseInt(chunks[2]),
                txTotal: Number.parseInt(chunks[3])
            };
        });
    }

    salesDetail(printOnPos = false) {
        return new Promise((resolve, reject) => {

            if(typeof printOnPos !== 'boolean' && typeof printOnPos !== 'string') {
                return reject(new Error("printOnPos must be of type boolean."))
            }

            if(typeof printOnPos === 'string') {
                printOnPos = (printOnPos === 'true' || printOnPos === '1')
            }

            let print = this.getBooleanFlag(!printOnPos);
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
        if (typeof operationId === "undefined") {
            throw new Error("Operation ID not provided when calling refund method.");
        }

        operationId = operationId.toString().slice(0, 6);
        return this.send(`1200|${operationId}|`).then((data) => {
            const chunks = data.split("|");
            const baseResponse = this.getBaseResponse(chunks);
            return {
                ...baseResponse,
                authorizationCode: chunks[4].trim(),
                operationId: chunks[5]
            };
        });
    }

    changeToNormalMode() {
        return this.send("0300", false)
    }

    buildSaleCommand(functionCode, amount, ticket, sendStatus, sendVoucher, commerceCode = null) {
        const amountStr = this.formatNumericString(amount, 9);
        const ticketStr = this.formatNumericString(ticket, 6);
        const statusStr = this.getBooleanFlag(sendStatus);
        const voucherStr = this.getBooleanFlag(sendVoucher);
        
        let command = `${functionCode}|${amountStr}|${ticketStr}||${voucherStr}|${statusStr}`;
        
        if (commerceCode !== null) {
            const commerceCodeStr = this.formatNumericString(commerceCode, 12);
            command += `|${commerceCodeStr}`;
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
        const chunks = payload.split("|");
        const baseSaleResponse = this.getBaseSaleResponse(chunks);
        return {
            ...baseSaleResponse,
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
            feeAmount: chunks[16],
            feeNumber: chunks[17]
        };
    }

    saleResponse(payload) {
        const chunks = payload.split("|");
        const response = this.getBaseSaleResponse(chunks);
        return this.addVoucherToResponse(response, chunks);
    }

    multicodeSaleResponse(payload) {
        const chunks = payload.split("|");
        const response = this.getBaseSaleResponse(chunks);
        response.providerCommerceCode = chunks[21]?.trim() ?? null;
        return this.addVoucherToResponse(response, chunks);
    }

}
