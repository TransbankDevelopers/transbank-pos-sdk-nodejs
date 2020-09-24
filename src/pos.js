const LRC = require("lrc-calculator")
const SerialPort = require("serialport")
const InterByteTimeout = require("@serialport/parser-inter-byte-timeout")

const ACK = 0x06

module.exports = class POS {
    constructor() {
        this.currentPort = null
        this.connected = false

        this.ackTimeout = 1000
        this.debugEnabled = false
        this.port = null
        this.responseAsString = true
        this.waiting = false

        this.responseCallback = function () {
        }
        this.ackCallback = function () {
        }
    }

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


    raw_serial_port() {
        return this.port
    }

    raw_parser() {
        return this.parser
    }

    listPorts() {
        return SerialPort.list()
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

    connect(portName = null, baudRate = 115200) {
        return new Promise((resolve, reject) => {
            if (this.connected) {
                this.debug("Trying to connect to a port while its already connected. Disconnecting... ")
                this.disconnect()
            }
            this.port = new SerialPort(portName, { baudRate })
            this.connected = true;

            this.parser = this.port.pipe(new InterByteTimeout({ interval: 30 }))

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
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
                this.currentPort = null;
                this.connected = false;

            })

        });

    }

    send(payload, waitResponse = true, callback = null) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject('You have to connect to a POS to send this message: ' + payload.toString());
                return;
            }
            // Block so just one message can be sent at a time
            if (this.waiting===true) {
                reject( "Another message was already sent and it is still waiting for a response from the POS")
                return;
            }
            this.waiting = true

            // Assert the ack arrives before the given timeout.
            let timeout = setTimeout(() => {
                this.waiting = false
                reject("ACK has not been received in " + this.ackTimeout + " ms.");
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
                this.waiting = false
                if (typeof callback === 'function') {
                    callback(data);
                }
                if (this.responseAsString) {
                    resolve(data.toString())
                } else {
                    resolve(data)
                }
            }

        })
    }

    itsAnACK(data) {
        return Buffer.compare(data, Buffer.from([ACK]))===0
    }

    poll() {
        return this.send("0100", false)
    }

    loadKeys() {
        return this.send("0800")
    }

    closeDay() {
        return this.send("0500||")
    }

    getLastSale() {
        return this.send("0250|")
    }

    getTotals() {
        return this.send("0700||")
    }

    salesDetail(printOnPos = false) {
        let print = printOnPos ? "1":"0"
        return this.send(`0260|${print}|`)
    }

    changeToNormalMode() {
        return this.send("0300")
    }

    sale(amount, ticket, sendStatus = false, callback = null) {
        amount = amount.toString().padStart(9, '0').slice(0,9);
        ticket = ticket.toString().padStart(6, '0').slice(0,6);
        let status = sendStatus ? '1' : '10';

        return this.send(`0200|${amount}|${ticket}|||${status}`, true, callback)
    }
}
