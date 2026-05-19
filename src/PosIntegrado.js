const POSBase = require("./PosBase");
const { normalizeEmptyField, parseNumber } = require("./helpers/fieldParser");
const FUNCTION_CODE_MULTICODE_SALE_REQUEST = "0270";
const FUNCTION_CODE_SALE_REQUEST = "0200";
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
            let chunks = data.split("|");
            const responseCode = parseNumber(chunks[1]);
            return {
                functionCode: normalizeEmptyField(
                    chunks[0].replaceAll(/\D+/g, "")
                ),
                responseCode: responseCode,
                commerceCode: parseNumber(chunks[2]),
                terminalId: normalizeEmptyField(chunks[3]),
                responseMessage: this.getResponseMessage(responseCode),
                success: responseCode === 0,
                rawResponse: normalizeEmptyField(data, false)
            };
        });
    }

    getLastSale() {
        return this.send("0250|").then((data) => {
            try {
                return this.lastSaleResponse(data);
            } catch (e) {
                throw new Error(e.getMessage());
            }
        });
    }

    getTotals() {
        return this.send("0700||").then((data) => {
            let chunks = data.split("|");
            const responseCode = parseNumber(chunks[1]);
            return {
                functionCode: normalizeEmptyField(
                    chunks[0].replaceAll(/\D+/g, "")
                ),
                responseCode: responseCode,
                txCount: parseNumber(chunks[2]),
                txTotal: parseNumber(chunks[3]),
                responseMessage: this.getResponseMessage(responseCode),
                success: responseCode === 0,
                rawResponse: normalizeEmptyField(data, false)
            };
        });
    }

    salesDetail(printOnPos = false) {
        return new Promise((resolve, reject) => {
            if (
                typeof printOnPos !== "boolean" &&
                typeof printOnPos !== "string"
            ) {
                return reject(new Error("printOnPos must be of type boolean."));
            }

            if (typeof printOnPos === "string") {
                printOnPos = printOnPos === "true" || printOnPos === "1";
            }

            let print = printOnPos ? "0" : "1";

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

                if (
                    detail.authorizationCode === "" ||
                    detail.authorizationCode === null
                ) {
                    consecutiveEmptyAuthCodes++;
                } else {
                    consecutiveEmptyAuthCodes = 0;
                    sales.push(detail);
                }

                return (
                    consecutiveEmptyAuthCodes >=
                    CONSECUTIVE_EMPTY_AUTHCODE_LIMIT
                );
            };

            this.send(command, true, processDetailResponse)
                .then(() => {
                    resolve(sales);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    refund(operationId) {
        if (typeof operationId === "undefined") {
            throw new Error(
                "Operation ID not provided when calling refund method."
            );
        }

        operationId = operationId.toString().slice(0, 6);
        return this.send(`1200|${operationId}|`).then((data) => {
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
                operationId: parseNumber(chunks[5]),
                responseMessage: this.getResponseMessage(responseCode),
                success: responseCode === 0,
                rawResponse: normalizeEmptyField(data, false)
            };
        });
    }

    changeToNormalMode() {
        return this.send("0300", false);
    }

    buildSaleCommand(
        functionCode,
        amount,
        ticket,
        sendStatus,
        sendVoucher,
        commerceCode = null
    ) {
        const statusStr = this.getBooleanFlag(sendStatus);
        const voucherStr = this.getBooleanFlag(sendVoucher);

        let command = `${functionCode}|${amount}|${ticket}||${voucherStr}|${statusStr}`;

        if (functionCode === FUNCTION_CODE_MULTICODE_SALE_REQUEST) {
            const code =
                commerceCode && commerceCode !== "0" ? commerceCode : "";
            command += `|${code}|`;
        }

        return command;
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
            sendStatus,
            sendVoucher
        );
        return this.send(command, true, callback).then((data) => {
            return this.saleResponse(data);
        });
    }

    multicodeSale(
        amount,
        ticket,
        commerceCode = null,
        sendStatus = false,
        sendVoucher = false,
        callback = null
    ) {
        const command = this.buildSaleCommand(
            FUNCTION_CODE_MULTICODE_SALE_REQUEST,
            amount,
            ticket,
            sendStatus,
            sendVoucher,
            commerceCode
        );
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
        let chunks = payload.split("|");
        const responseCode = parseNumber(chunks[1]);

        return {
            functionCode: normalizeEmptyField(chunks[0]),
            responseCode: parseNumber(chunks[1]),
            commerceCode: parseNumber(chunks[2]),
            terminalId: normalizeEmptyField(chunks[3]),
            responseMessage: this.getResponseMessage(responseCode),
            success: responseCode === SUCCESSFUL_RESPONSE_CODE,
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
            employeeId: parseNumber(chunks[15]),
            tip: parseNumber(chunks[16]),
            installmentsAmount: parseNumber(chunks[17]),
            installmentsNumber: parseNumber(chunks[18]),
            rawResponse: normalizeEmptyField(payload, false)
        };
    }

    saleResponse(payload) {
        const chunks = payload.split("|");
        const responseCode = parseNumber(chunks[1]);
        return {
            functionCode: normalizeEmptyField(chunks[0].replaceAll(/\D+/g, "")),
            responseCode: responseCode,
            commerceCode: parseNumber(chunks[2]),
            terminalId: normalizeEmptyField(chunks[3]),
            responseMessage: this.getResponseMessage(responseCode),
            success: responseCode === 0,
            ticket: normalizeEmptyField(chunks[4]),
            authorizationCode: normalizeEmptyField(chunks[5]),
            amount: parseNumber(chunks[6]),
            installmentsNumber: parseNumber(chunks[7]),
            installmentsAmount: parseNumber(chunks[8]),
            last4Digits: parseNumber(chunks[9]),
            operationNumber: parseNumber(chunks[10]),
            cardType: normalizeEmptyField(chunks[11]),
            accountingDate: normalizeEmptyField(chunks[12]),
            accountNumber: normalizeEmptyField(chunks[13]),
            cardBrand: normalizeEmptyField(chunks[14]),
            realDate: normalizeEmptyField(chunks[15]),
            realTime: normalizeEmptyField(chunks[16]),
            employeeId: parseNumber(chunks[17]),
            tip: parseNumber(chunks[18]),
            printingField: chunks[19]?.match(/.{1,40}/g) ?? null,
            rawVoucher: normalizeEmptyField(chunks[19], false),
            rawResponse: normalizeEmptyField(payload, false)
        };
    }

    multicodeSaleResponse(payload) {
        const chunks = payload.split("|");
        const responseCode = parseNumber(chunks[1]);
        const response = {
            functionCode: normalizeEmptyField(chunks[0].replaceAll(/\D+/g, "")),
            responseCode: responseCode,
            commerceCode: parseNumber(chunks[2]),
            terminalId: normalizeEmptyField(chunks[3]),
            responseMessage: this.getResponseMessage(responseCode),
            success: responseCode === 0,
            ticket: normalizeEmptyField(chunks[4]),
            authorizationCode: normalizeEmptyField(chunks[5]),
            amount: parseNumber(chunks[6]),
            installmentsNumber: parseNumber(chunks[7]),
            installmentsAmount: parseNumber(chunks[8]),
            last4Digits: parseNumber(chunks[9]),
            operationNumber: parseNumber(chunks[10]),
            cardType: normalizeEmptyField(chunks[11]),
            accountingDate: normalizeEmptyField(chunks[12]),
            accountNumber: normalizeEmptyField(chunks[13]),
            cardBrand: normalizeEmptyField(chunks[14]),
            realDate: normalizeEmptyField(chunks[15]),
            realTime: normalizeEmptyField(chunks[16]),
            employeeId: parseNumber(chunks[17]),
            tip: parseNumber(chunks[18]),
            printingField: chunks[19]?.match(/.{1,40}/g) ?? null,
            rawVoucher: normalizeEmptyField(chunks[19], false),
            change: parseNumber(chunks[20]),
            commerceProviderCode: parseNumber(chunks[21]),
            rawResponse: normalizeEmptyField(payload, false)
        };

        return response;
    }

    lastSaleResponse(payload) {
        const chunks = payload.split("|");
        const responseCode = parseNumber(chunks[1]);

        return {
            functionCode: normalizeEmptyField(chunks[0]),
            responseCode: responseCode,
            commerceCode: parseNumber(chunks[2]),
            terminalId: normalizeEmptyField(chunks[3]),
            responseMessage: this.getResponseMessage(responseCode),
            success: responseCode === SUCCESSFUL_RESPONSE_CODE,
            ticket: normalizeEmptyField(chunks[4]),
            authorizationCode: normalizeEmptyField(chunks[5]),
            amount: parseNumber(chunks[6]),
            installmentsNumber: parseNumber(chunks[7]),
            installmentsAmount: parseNumber(chunks[8]),
            last4Digits: parseNumber(chunks[9]),
            operationNumber: parseNumber(chunks[10]),
            cardType: normalizeEmptyField(chunks[11]),
            accountingDate: normalizeEmptyField(chunks[12]),
            accountNumber: normalizeEmptyField(chunks[13]),
            cardBrand: normalizeEmptyField(chunks[14]),
            realDate: normalizeEmptyField(chunks[15]),
            realTime: normalizeEmptyField(chunks[16]),
            employeeId: parseNumber(chunks[17]),
            tip: parseNumber(chunks[18]),
            rawResponse: normalizeEmptyField(payload, false)
        };
    }
};
