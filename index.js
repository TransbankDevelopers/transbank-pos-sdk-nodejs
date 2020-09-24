// let portName = '/dev/cu.usbmodem0123456789ABCD1';
// const SerialPort = require('serialport')
// const InterByteTimeout = require('@serialport/parser-inter-byte-timeout')
// const port = new SerialPort(portName, {
//     baudRate: 115200
// })
//
//
// const parser = port.pipe(new InterByteTimeout({interval: 30}))
//
// parser.on('data', (data) => {
//     console.log(`> ${data}`, data)
//     port.write(Buffer.from([0x06]));
// }) // will emit data if there is a pause between packets of at least 30ms
//
// const pollRequest = Buffer.from([0x02, 0x30, 0x38, 0x30, 0x30, 0x03, 0x0B]);
// port.write(pollRequest);

const pos = require('./dist/pos');

const Transbank = {};
Transbank.POS = pos;

module.exports = Transbank;
