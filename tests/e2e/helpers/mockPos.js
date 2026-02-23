const LRC = require("lrc-calculator");

const ACK = 0x06;
const PORT_PATH = "/dev/mock-pos";
const RESPONSE_DELAY_MS = 120;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAck(buffer) {
    return Buffer.isBuffer(buffer) && buffer.length === 1 && buffer[0] === ACK;
}

function frame(payload) {
    return Buffer.from(LRC.asStxEtx(payload));
}

async function waitForHostWrite(binding, previousWrite, timeoutMs = 2000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const currentWrite = binding.lastWrite;
        if (currentWrite && currentWrite !== previousWrite && !isAck(currentWrite)) {
            return currentWrite;
        }
        await sleep(5);
    }

    throw new Error("Timeout waiting for host write");
}

async function ackNextWriteAndMaybeRespond(pos, responsePayload = null) {
    const serial = pos.raw_serial_port();
    while (!serial?.port) {
        await sleep(1);
    }

    const binding = serial.port;
    const previousWrite = binding.lastWrite;
    await waitForHostWrite(binding, previousWrite);
    binding.emitData(Buffer.from([ACK]));

    if (responsePayload) {
        await sleep(RESPONSE_DELAY_MS);
        binding.emitData(frame(responsePayload));
    }
}

async function respondWithFrames(pos, payloads) {
    for (const payload of payloads) {
        await sleep(RESPONSE_DELAY_MS);
        pos.raw_serial_port().port.emitData(frame(payload));
    }
}

async function connectWithPollAck(pos) {
    const connectPromise = pos.connect(PORT_PATH);
    pos.raw_serial_port().on("open", async () => {
        await ackNextWriteAndMaybeRespond(pos);
    });
    await connectPromise;
}

async function cleanupPos(pos) {
    if (!pos) {
        return;
    }

    if (pos.isConnected()) {
        await pos.disconnect();
    }

    pos.raw_parser()?.removeAllListeners();
    pos.raw_parser()?.destroy?.();
    pos.raw_serial_port()?.removeAllListeners();
}

module.exports = {
    ACK,
    PORT_PATH,
    frame,
    ackNextWriteAndMaybeRespond,
    cleanupPos,
    connectWithPollAck,
    respondWithFrames
};
