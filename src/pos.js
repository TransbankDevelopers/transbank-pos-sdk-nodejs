const LRC = require("lrc-calculator")
const SerialPort = require("serialport")
const EventEmitter = require('events');
const InterByteTimeout = require("@serialport/parser-inter-byte-timeout")
const responseMessages = require("./responseCodes")
const ACK = 0x06
const FUNCTION_CODE_MULTICODE_SALE = '0271';

module.exports = class POS extends EventEmitter {

    constructor() {
        super()
        this.currentPort = null
        this.connected = false

        this.ackTimeout = 2000
        this.posTimeout = 150000 
        this.debugEnabled = false
        this.port = null
        this.responseAsString = true
        this.waiting = false
        this.connecting = false;

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

    isConnected() {
        return this.connected
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
            // Block so just one connect command can be sent at a time
            if (this.connecting === true) {
                reject("Another connect command was already sent and it is still waiting")
                return
            }

            if (this.connected) {
                this.debug("Trying to connect to a port while its already connected. Disconnecting... ")
                this.disconnect().then(() => {
                    resolve(this.connect(portName, baudRate))
                }).catch(() => {
                    resolve(this.connect(portName, baudRate))
                })
                this.connecting = true
                return
            }

            this.connecting = true
            
            this.port = new SerialPort(portName, { baudRate, autoOpen: false })

            this.port.open((err) => {
                if (err) {
                    reject('Could not open serial connection...');
                }
            })
            this.parser = this.port.pipe(new InterByteTimeout({ interval: 100 }))

            this.parser.on("data", (data) => {
                
                let prettyData = ''
                data.forEach(char=>{
                    prettyData += (32 <= char && char<126) ? String.fromCharCode(char) : `{0x${char.toString(16).padStart(2, '0')}}`
                }, '')
                this.debug(`🤖 > ${prettyData}`, data)

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
                this.connected = true
                this.poll().then(() => {
                    this.currentPort = portName
                    this.emit('port_opened', this.currentPort);
                    resolve(true)
                }).catch(async (e) => {
                    this.connected = false
                    this.waiting = false
                    this.currentPort = null
                    try {
                        if(this.port.isOpen) await this.port.close();
                    } catch (e) {

                    }
                    reject(e)
                })

            })

            this.port.on("close", ()=> {
                this.debug("Port closed")
                this.currentPort = null
                this.waiting = false
                this.connected = false
                this.emit('port_closed');
            })

            this.connecting = false
        })
    }

    disconnect() {
        return new Promise((resolve, reject) => {

            if(!this.port.isOpen) {
                resolve(true)
                return
            }

            this.port.close((error) => {
                if (error) {
                    this.debug("Error closing port", error)
                    reject(error)
                } else {
                    this.debug("Port closed successfully")
                    resolve(true);
                }
            })

        })

    }

    async autoconnect() {
        // Block so just one autoconnect command can be sent at a time
        if (this.connecting === true) {
            this.debug("It is already trying to connect to a port and we wait for it to finish")
            return false
        }

        let vendors = [
            { vendor: "11ca", product: "0222" }, // Verifone VX520c
            { vendor: "0b00", product: "0054" }, // Ingenico DESK3500
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
                this.connecting = false;
                return port
            } catch (e) {
                console.log(e);
            }
        }

        this.connecting = false;
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
                clearTimeout(responseTimeout)
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
            let prettyData = ''
            buffer.forEach(char=>{prettyData += (32 <= char && char<126) ? String.fromCharCode(char) : `{0x${char.toString(16).padStart(2, '0')}}`}, '')
                
            this.debug(`💻 > `, buffer, " -> ", `${prettyData}`)

            //Send the message
            this.port.write(buffer, function(err) {
                if (err) {
                    reject('Failed to send message to POS. Maybe it is disconnected.');
                }
            })

            let responseTimeout = setTimeout(() => {
                this.waiting = false
                reject(`Response of POS has not been received in ${this.posTimeout/1000} seconds`)
            }, this.posTimeout)

            // Wait for the response and fullfill the Promise
            this.responseCallback = (data) => {
                clearTimeout(responseTimeout)
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
            try {
                return this.saleResponse(data)
            } catch (e) {
                return new Promise((resolve, reject) => {reject(e.getMessage())})
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
                successful: parseInt(chunks[1])===0,
            }
        })
    }

    salesDetail(printOnPos = false) {
        return new Promise((resolve) => {

            if(typeof printOnPos !== 'boolean' && typeof printOnPos !== 'string')
                return new Promise((resolve, reject) => {
                    reject("printOnPos must be of type boolean.")
                })

            if(typeof printOnPos === 'string')
                printOnPos = (printOnPos === 'true' || printOnPos === '1') ? true:false

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
            return new Promise((resolve, reject) => {
                reject("Operation ID not provided when calling refund method.")
            })
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
        let status = sendStatus ? "1":"0"

        return this.send(`0200|${amount}|${ticket}|||${status}`, true, callback).then((data) => {
            return this.saleResponse(data)
        })
    }

    multicodeSale(amount, ticket, commerceCode = null, sendStatus = false, callback = null) {
        amount = amount.toString().padStart(9, "0").slice(0, 9)
        ticket = ticket.toString().padStart(6, "0").slice(0, 6)
        commerceCode = commerceCode === null ? '0' : commerceCode;
        let status = sendStatus ? "1":"0"

        return this.send(`0270|${amount}|${ticket}|||${status}|${commerceCode}`, true, callback).then((data) => {
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
            feeNumber: (chunks[17]),
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
            tip: chunks[18] !== '' ? parseInt(chunks[18]) : null,
        };
        if (chunks[0] === FUNCTION_CODE_MULTICODE_SALE) {
            response.change = chunks[20];
            response.commerceCode = chunks[21];
        }
        return response;
    }
}
