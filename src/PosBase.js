const LRC = require("lrc-calculator")
const SerialPort = require("serialport")
const EventEmitter = require('events');
const InterByteTimeout = require("@serialport/parser-inter-byte-timeout")
const responseMessages = require("./responseCodes");
const ACK = 0x06

module.exports = class POSBase extends EventEmitter {

    constructor() {
        super()

        this.currentPort = null
        this.connected = false
        this.defaultBaudRate = this.constructor.name === 'POSAutoservicio' ? 19200 : 115200 
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


    connect(portName = null, baudRate = this.defaultBaudRate) {
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
                data.forEach(char => {
                    prettyData += (32 <= char && char < 126) ? String.fromCharCode(char) : `{0x${char.toString(16).padStart(2, '0')}}`
                }, '')
                this.debug(`🤖 > ${prettyData}`, data)

                // Primero, se recibe un ACK
                if (this.itsAnACK(data)) {
                    if (typeof this.ackCallback === "function") {
                        this.ackCallback(data)
                    }
                    return
                }

                // Si se recibió una respuesta (diferente a un ACK) entonces responder con un ACK y mandar el mensaje por callback
                this.port.write(Buffer.from([ACK]))
                if (typeof this.responseCallback === "function") {
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
                        if (this.port.isOpen) await this.port.close();
                    } catch (e) {

                    }
                    reject(e)
                })

            })

            this.port.on("close", () => {
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

            if (!this.port.isOpen) {
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

    async autoconnect(baudrate = this.defaultBaudRate) {
        // Block so just one autoconnect command can be sent at a time
        if (this.connecting === true) {
            this.debug("It is already trying to connect. Please wait for it to finish")
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
                if (vendor.vendor === port.vendorId) ports.push(port)
            })
        }
        if (ports.length === 0) {
            ports = availablePorts
        }
        for (let port of ports) {
            this.debug("Trying to connect to " + port.path)
            try {
                await this.connect(port.path, baudrate)
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
            if (this.waiting === true) {
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
            buffer.forEach(char => { prettyData += (32 <= char && char < 126) ? String.fromCharCode(char) : `{0x${char.toString(16).padStart(2, '0')}}` }, '')

            this.debug(`💻 > `, buffer, " -> ", `${prettyData}`)

            //Send the message
            this.port.write(buffer, function (err) {
                if (err) {
                    reject('Failed to send message to POS. Maybe it is disconnected.');
                }
            })

            let responseTimeout = setTimeout(() => {
                this.waiting = false
                reject(`Response of POS has not been received in ${this.posTimeout / 1000} seconds`)
            }, this.posTimeout)

            // Wait for the response and fullfill the Promise
            this.responseCallback = (data) => {
                clearTimeout(responseTimeout)
                let response = data
                if (this.responseAsString) {
                    response = data.toString().slice(1, -2)
                }
                let functionCode = data.toString().slice(1, 5)
                
                if (functionCode === "0900") { // Sale status messages
                    if (typeof callback === "function"){
                        callback(this.intermediateResponse(response), data)
                    }
                    return
                }
                if (functionCode === "0261") {
                    if (typeof callback === "function"){
                        callback(response, data)
                    }
                    return
                }

                this.waiting = false

                resolve(response, data)
            }

        })
    }

    getResponseMessage(response) {
        return typeof responseMessages[response] !== "undefined" ? responseMessages[response] : null
    }

    itsAnACK(data) {
        return Buffer.compare(data, Buffer.from([ACK])) === 0
    }

    poll() {
        return this.send("0100", false)
    }

    /*  
     |--------------------------------------------------------------------------
     | Shared Commands
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

    intermediateResponse(payload) {
        let chunks = payload.split("|")
        let response = {
            responseCode: parseInt(chunks[1]),
            responseMessage: this.getResponseMessage(parseInt(chunks[1])),
        }

        return response;
    }
}