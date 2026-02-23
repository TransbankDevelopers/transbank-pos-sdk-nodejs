const Transbank = require("../../../index");
const { SerialPortMock } = require("serialport");
const { PORT_PATH, cleanupPos } = require("./mockPos");

function setupSuiteContext() {
    let pos = null;

    beforeEach(() => {
        pos = null;
        SerialPortMock.binding.reset();
        SerialPortMock.binding.createPort(PORT_PATH, { echo: false, record: true });
    });

    afterEach(async () => {
        await cleanupPos(pos);
    });

    return {
        createIntegrado() {
            pos = new Transbank.POSIntegrado();
            return pos;
        },
        createAutoservicio() {
            pos = new Transbank.POSAutoservicio();
            return pos;
        }
    };
}

module.exports = {
    setupSuiteContext
};
