const POSBase = require('./PosBase')

module.exports = class POSAutoservicio extends POSBase {

    constructor() {
        super()
    }

    sale(amount, ticket, sendStatus = false, sendVoucher = false, callback = null) {
        amount = amount.toString().padStart(9, "0").slice(0, 9)
        ticket = ticket.toString().padStart(6, "0").slice(0, 6)
        let status = sendStatus ? "1" : "0"
        let voucher = sendVoucher ? "1" : "0"

        return this.send(`0200|${amount}|${ticket}|${voucher}|${status}`, true, callback).then((data) => {
            return this.saleResponse(data)
        })
    }

    saleResponse(payload) {
        let chunks = payload.split("|")
        let authorizationCode = typeof chunks[5] !== 'undefined' ? chunks[5].trim() : null;

        let response = {
            functionCode: parseInt(chunks[0]),
            responseCode: parseInt(chunks[1]),
            responseMessage: this.getResponseMessage(parseInt(chunks[1])),
            commerceCode: parseInt(chunks[2]),
            terminalId: chunks[3],
            successful: parseInt(chunks[1]) === 0,
            ticket: chunks[4],
            authorizationCode: authorizationCode,
            amount: parseInt(chunks[6]),
            last4Digits: chunks[7] !== '' ? parseInt(chunks[7]) : null,
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
            sharesTypeComment: chunks[19],
        };
        return response;
    }

    getLastSale(sendVoucher = false) {
        let voucher = sendVoucher ? "1" : "0"
        return this.send(`0250|${voucher}`).then((data) => {
            try {
                return this.saleResponse(data)
            } catch (e) {
                return new Promise((resolve, reject) => { reject(e.getMessage()) })
            }

        })
    }

    refund() {
        return this.send(`1200`).then((data) => {
            let chunks = data.split("|")
            return {
                functionCode: parseInt(chunks[0].replace(/\D+/g, '')),
                responseCode: parseInt(chunks[1]),
                commerceCode: parseInt(chunks[2]),
                terminalId: chunks[3],
                authorizationCode: chunks[4].trim(),
                operationId: chunks[5],
                responseMessage: this.getResponseMessage(parseInt(chunks[1])),
                successful: parseInt(chunks[1]) === 0,
            }
        })
    }

    closeDay(sendVoucher = false) {
        let voucher = sendVoucher ? "1" : "0"
        return this.send(`0500|${voucher}`).then((data) => {
            let chunks = data.split("|")
            return {
                functionCode: parseInt(chunks[0]),
                responseCode: parseInt(chunks[1]),
                commerceCode: parseInt(chunks[2]),
                terminalId: chunks[3],
                voucher: chunks[4]?.match(/.{1,40}/g),
                responseMessage: this.getResponseMessage(parseInt(chunks[1])),
                successful: parseInt(chunks[1]) === 0,
            }
        })
    }

    initialization() {
        return this.send("0070", false)
    }

    initializationResponse() {
        return this.send("0080").then((data) => {
            let chunks = data.split("|")
            return {
                functionCode: parseInt(chunks[0]),
                responseCode: parseInt(chunks[1]),
                transactionDate: parseInt(chunks[2]),
                transactionTime: chunks[3],
                responseMessage: this.getResponseMessage(parseInt(chunks[1])),
                successful: parseInt(chunks[1])===0,
            }
        })
    }

}