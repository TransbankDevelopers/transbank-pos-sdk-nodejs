const LRC = require("lrc-calculator");

const ACK_BYTE = 0x06;
const PORT_PATH = "/dev/mock-pos";
const RESPONSE_DELAY_MS = 120;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAck(buffer) {
    return Buffer.isBuffer(buffer) && buffer.length === 1 && buffer[0] === ACK_BYTE;
}

function buildMessage(payload) {
    return Buffer.from(LRC.asStxEtx(payload));
}

const expectResponseFields = (response, expectedFields) => {
    Object.entries(expectedFields).forEach(([field, expectedValue]) => {
        expect(response[field]).toBe(expectedValue);
    });
}

const waitForHostWrite = async (binding, previousWrite, timeoutMs = 2000) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const currentWrite = binding.lastWrite;
        if (currentWrite && currentWrite !== previousWrite && !isAck(currentWrite)) {
            return currentWrite;
        }
        await sleep(5);
    }

    throw new Error("Timeout waiting for host write");
};

const getBinding = async (pos) => {
    const serial = pos.raw_serial_port();
    while (!serial?.port) {
        await sleep(1);
    }
    return serial.port;
};

const sendDeviceReply = async (binding, reply) => {
    if (reply === ACK_BYTE || (Buffer.isBuffer(reply) && isAck(reply))) {
        binding.emitData(Buffer.from([ACK_BYTE]));
        return;
    }

    if (typeof reply === "string") {
        await sleep(RESPONSE_DELAY_MS);
        binding.emitData(buildMessage(reply));
        return;
    }

    throw new Error("Invalid POS reply. Use ACK or a payload string.");
};

const captureSend = async (pos) => {
    const binding = await getBinding(pos);
    const hostWrite = await waitForHostWrite(binding, binding.lastWrite);
    return hostWrite;
};

const sendReply = async (pos, reply) => {
    const binding = await getBinding(pos);

    if (Array.isArray(reply)) {
        for (const currentReply of reply) {
            await sendDeviceReply(binding, currentReply);
        }
        return;
    }

    await sendDeviceReply(binding, reply);
};

const connectWithPollAck = async (pos) => {
    const connectPromise = pos.connect(PORT_PATH);
    pos.raw_serial_port().on("open", async () => {
        await captureSend(pos);
        await sendReply(pos, ACK_BYTE);
    });
    await connectPromise;
};

const cleanupPos = async (pos) => {
    if (!pos) {
        return;
    }

    if (pos.isConnected()) {
        await pos.disconnect();
    }

    pos.raw_parser()?.removeAllListeners();
    pos.raw_parser()?.destroy?.();
    pos.raw_serial_port()?.removeAllListeners();
};

module.exports = {
    ACK_BYTE,
    PORT_PATH,
    buildMessage,
    captureSend,
    sendReply,
    cleanupPos,
    connectWithPollAck,
    expectResponseFields
};
