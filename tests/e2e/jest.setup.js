jest.mock("serialport", () => {
    const actual = jest.requireActual("serialport");
    return {
        ...actual,
        SerialPort: actual.SerialPortMock
    };
});
