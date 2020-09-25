const LRC = require("lrc-calculator")
const SerialPort = require("serialport")
const InterByteTimeout = require("@serialport/parser-inter-byte-timeout")
const responseMessages = require("./responseCodes")
const ACK = 0x06

module.exports = class POS {
    constructor() {
        this.currentPort = null
        this.connected = false

        this.ackTimeout = 2000
        this.debugEnabled = false
        this.port = null
        this.responseAsString = true
        this.waiting = false

        this.responseCallback = function () {
        }
        this.ackCallback = function () {
        }
    }

    /*
     |--------------------------------------------------------------------------
     | Getters and Setters
     |--------------------------------------------------------------------------
     */

    debug(...args) {
        if (this.debugEnabled) {
            console.log(...args)
        }
    }

    setDebug(debug = true) {
        this.debugEnabled = debug
    }

    getResponsesAsString() {
        this.responseAsString = true
    }

    getResponsesAsHexArray() {
        this.responseAsString = false
    }

    getConnectedPort() {
        return this.currentPort
    }


    raw_serial_port() {
        return this.port
    }

    raw_parser() {
        return this.parser
    }

    listPorts() {
        return SerialPort.list()
    }

    /*
     |--------------------------------------------------------------------------
     | Serial Port Handling
     |--------------------------------------------------------------------------
     */


    connect(portName = null, baudRate = 115200) {
        this.debug("Connecting to " + portName + " @" + baudRate)
        return new Promise((resolve, reject) => {
            if (this.connected) {
                this.debug("Trying to connect to a port while its already connected. Disconnecting... ")
                this.disconnect().then(() => {
                    resolve(this.connect(portName, baudRate))
                }).catch(() => {
                    resolve(this.connect(portName, baudRate))
                })
                return
            }
            this.port = new SerialPort(portName, { baudRate })
            this.connected = true

            this.parser = this.port.pipe(new InterByteTimeout({ interval: 100 }))

            this.parser.on("data", (data) => {

                this.debug(`🤖 > ${data}`, data)

                // Primero, se recibe un ACK
                if (this.itsAnACK(data)) {
                    if (typeof this.ackCallback==="function") {
                        this.ackCallback(data)
                    }
                    return
                }

                // Si se recibió una respuesta (diferente a un ACK) entonces responder con un ACK y mandar el mensaje por callback
                this.port.write(Buffer.from([ACK]))
                if (typeof this.responseCallback==="function") {
                    this.responseCallback(data)
                }

            }) // will emit data if there is a pause between packets of at least 30ms


            this.port.on("open", () => {
                this.poll().then(() => {
                    this.currentPort = portName
                    resolve(true)
                }).catch((e) => {
                    reject(e)
                })

            })
        })
    }

    disconnect() {
        return new Promise((resolve, reject) => {
            this.port.close((error) => {
                this.currentPort = null
                this.connected = false
                if (error) {
                    this.debug("Error closing port", error)
                    reject(error)
                } else {
                    this.debug("Port closed sucessfully")
                    resolve(true);
                }
            })

        })

    }

    async autoconnect() {
        let vendors = [
            { vendor: "11ca", product: "0222" }, // Verifone VX520c
            { vendor: "0b00", product: "0054" }, // Ingenico 3500
        ]

        let availablePorts = await this.listPorts()
        let ports = []
        for (let port of availablePorts) {
            vendors.forEach((vendor) => {
                if (vendor.vendor===port.vendorId) ports.push(port)
            })
        }
        if (ports.length===0) {
            ports = availablePorts
        }
        for (let port of ports) {
            this.debug("Trying to connect to " + port.path)
            try {
                await this.connect(port.path)
                return port
            } catch (e) {
            }
        }

        this.debug("Autoconnection failed")
        return false
    }

    send(payload, waitResponse = true, callback = null) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject("You have to connect to a POS to send this message: " + payload.toString())
                return
            }
            // Block so just one message can be sent at a time
            if (this.waiting===true) {
                reject("Another message was already sent and it is still waiting for a response from the POS")
                return
            }
            this.waiting = true

            // Assert the ack arrives before the given timeout.
            let timeout = setTimeout(() => {
                this.waiting = false
                reject("ACK has not been received in " + this.ackTimeout + " ms.")
            }, this.ackTimeout)

            // Defines what should happen when the ACK is received
            this.ackCallback = () => {
                clearTimeout(timeout)
                if (!waitResponse) {
                    this.waiting = false
                    resolve(true)
                }
            }

            // Prepare the message
            let buffer = Buffer.from(LRC.asStxEtx(payload))
            this.debug(`💻 > `, buffer, " -> ", `${buffer}`)

            //Send the message
            this.port.write(buffer)

            // Wait for the response and fullfill the Promise
            this.responseCallback = (data) => {
                let response = data
                if (this.responseAsString) {
                    response = data.toString().slice(1, -2)
                }
                let functionCode = data.toString().slice(1, 5)
                if (functionCode==="0900") { // Sale status messages
                    if (typeof callback==="function") {
                        callback(response, data)
                    }
                    return
                }
                if (typeof callback==="function") {
                    callback(response, data)
                }
                this.waiting = false

                resolve(response, data)
            }

        })
    }

    getResponseMessage(response) {
        return typeof responseMessages[response]!=="undefined" ? responseMessages[response]:null
    }

    itsAnACK(data) {
        return Buffer.compare(data, Buffer.from([ACK]))===0
    }

    /*
     |--------------------------------------------------------------------------
     | POS Methods
     |--------------------------------------------------------------------------
     */

    poll() {
        return this.send("0100", false)
    }

    loadKeys() {
        return this.send("0800").then((data) => {
            let chunks = data.split("|")
            return {
                functionCode: parseInt(chunks[0]),
                responseCode: parseInt(chunks[1]),
                commerceCode: parseInt(chunks[2]),
                terminalId: chunks[3],
                responseMessage: this.getResponseMessage(parseInt(chunks[1])),
                successful: parseInt(chunks[1])===0,
            }
        })
    }

    closeDay() {
        return this.send("0500||").then((data) => {
            let chunks = data.split("|")
            return {
                functionCode: parseInt(chunks[0]),
                responseCode: parseInt(chunks[1]),
                commerceCode: parseInt(chunks[2]),
                terminalId: chunks[3],
                responseMessage: this.getResponseMessage(parseInt(chunks[1])),
                successful: parseInt(chunks[1])===0,
            }
        })
    }

    getLastSale() {
        return this.send("0250|").then((data) => {
            return this.saleResponse(data)
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
                successful: parseInt(chunks[1])===0,
            }
        })
    }

    salesDetail(printOnPos = false) {
        return new Promise((resolve) => {
            let print = printOnPos ? "0":"1"
            let sales = []

            let promise = this.send(`0260|${print}|`, !printOnPos, onEverySale.bind(this))
            if (printOnPos) {
                resolve(promise)
            }

            function onEverySale(sale) {

                let detail = this.saleDetailResponse(sale.toString().slice(1, -2))
                if (detail.authorizationCode==="") {
                    allSalesReceived(sales)
                    return
                }
                sales.push(detail)
            }

            function allSalesReceived() {
                resolve(sales)
            }

        })

    }

    refund(operationId) {
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
                successful: parseInt(chunks[1])===0,
            }
        })
    }

    changeToNormalMode() {
        return this.send("0300", false)
    }

    sale(amount, ticket, sendStatus = false, callback = null) {
        amount = amount.toString().padStart(9, "0").slice(0, 9)
        ticket = ticket.toString().padStart(6, "0").slice(0, 6)
        let status = sendStatus ? "1":"10"

        return this.send(`0200|${amount}|${ticket}|||${status}`, true, callback).then((data) => {
            return this.saleResponse(data)
        })
    }

    /*
     |--------------------------------------------------------------------------
     | Responses
     |--------------------------------------------------------------------------
     */

    saleDetailResponse(payload) {
        let chunks = payload.split("|")
        return {
            functionCode: parseInt(chunks[0]),
            responseCode: parseInt(chunks[1]),
            commerceCode: parseInt(chunks[2]),
            terminalId: chunks[3],
            responseMessage: this.getResponseMessage(parseInt(chunks[1])),
            successful: parseInt(chunks[1])===0,
            ticket: chunks[4],
            authorizationCode: chunks[5].trim(),
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
            feeNumber: (chunks[17]),
        }
    }

    saleResponse(payload) {
        let chunks = payload.split("|")
        return {
            functionCode: parseInt(chunks[0]),
            responseCode: parseInt(chunks[1]),
            commerceCode: parseInt(chunks[2]),
            terminalId: chunks[3],
            responseMessage: this.getResponseMessage(parseInt(chunks[1])),
            successful: parseInt(chunks[1])===0,
            ticket: chunks[4],
            authorizationCode: (chunks[5]).trim(),
            amount: chunks[6],
            sharesNumber: chunks[7],
            sharesAmount: chunks[8],
            last4Digits: parseInt(chunks[9]),
            operationNumber: chunks[10],
            cardType: chunks[11],
            accountingDate: chunks[12],
            accountNumber: chunks[13],
            cardBrand: chunks[14],
            realDate: chunks[15],
            realTime: chunks[16],
            employeeId: chunks[17],
            tip: parseInt(chunks[18]),
        }
    }
}
