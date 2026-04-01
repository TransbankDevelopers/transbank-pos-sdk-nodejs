const { rawlist, input, select } = require("@inquirer/prompts");
const Transbank = require("../index");

const CLOSE_PORT = 1;
const PORT_OPEN = 2;
const EXIT_CODE = 3;

let pos;
let selectedPosType;

const askYesNo = async function (message) {
    return select({
        message,
        choices: [
            { name: "Si", value: true },
            { name: "No", value: false }
        ]
    });
};

const main = async function () {
    selectedPosType = await showPosTypeMenu();

    if (selectedPosType === "integrado") {
        pos = new Transbank.POSIntegrado();
    } else {
        pos = new Transbank.POSAutoservicio();
    }

    pos.setDebug(true);

    let shouldExit = false;
    let isConnected = false;

    while (!shouldExit) {
        const connectOption = await showConnectionMenu();
        const connectionOperationResult =
            await executeConnectionOption(connectOption);

        if (connectionOperationResult === PORT_OPEN) {
            isConnected = true;
        }

        if (connectionOperationResult === EXIT_CODE) {
            shouldExit = true;
        }

        const operationState = await handleConnectedOperations(
            shouldExit,
            isConnected
        );
        shouldExit = operationState.shouldExit;
        isConnected = operationState.isConnected;
    }
};

const handleConnectedOperations = async function (shouldExit, isConnected) {
    while (!shouldExit && isConnected) {
        const option = await showMenu(selectedPosType);
        const operationResult = await executeOption(option, selectedPosType);

        if (operationResult === CLOSE_PORT) {
            isConnected = false;
        }

        if (operationResult === EXIT_CODE) {
            shouldExit = true;
            isConnected = false;
        }
    }

    return { shouldExit, isConnected };
};

const showPosTypeMenu = async function () {
    return select({
        message: "Seleccione el tipo de POS a utilizar:",
        choices: [
            { name: "POS Integrado", value: "integrado" },
            { name: "POS Autoservicio", value: "autoservicio" }
        ]
    });
};

const getOperationsByPosType = function (posType) {
    if (posType === "integrado") {
        return [
            { name: "Poll", value: "poll" },
            { name: "Carga de llaves", value: "loadKey" },
            { name: "Cambiar a modo normal", value: "changeToNormalMode" },
            { name: "Obtener última venta", value: "getLastSale" },
            { name: "Obtener totales", value: "getTotals" },
            { name: "Realizar una venta", value: "sale" },
            { name: "Realizar una venta multicódigo", value: "multicodeSale" },
            { name: "Realizar una devolución", value: "refund" },
            { name: "Ver detalle de ventas", value: "salesDetail" },
            { name: "Cerrar sesión POS", value: "close" }
        ];
    }

    return [
        { name: "Poll", value: "poll" },
        { name: "Carga de llaves", value: "loadKey" },
        { name: "Inicializar POS", value: "initialization" },
        {
            name: "Respuesta de inicialización",
            value: "initializationResponse"
        },
        { name: "Obtener última venta", value: "getLastSale" },
        { name: "Realizar una venta", value: "sale" },
        { name: "Realizar una venta multicódigo", value: "multicodeSale" },
        { name: "Realizar una devolución", value: "refund" },
        { name: "Cerrar sesión POS", value: "close" }
    ];
};

const showMenu = async function (posType) {
    const answer = await rawlist({
        message: "Seleccione una opción:",
        choices: [
            ...getOperationsByPosType(posType),
            { name: "Cerrar Puerto", value: "closePort" },
            { name: "Salir", value: "exit" }
        ]
    });

    return answer;
};

const showConnectionMenu = async function () {
    return rawlist({
        message: "Seleccione una opción:",
        choices: [
            { name: "Auto conectar POS", value: "autoConnect" },
            { name: "Seleccionar puerto manualmente", value: "listPort" },
            { name: "Salir", value: "exit" }
        ]
    });
};

const showPortMenu = async function (portList) {
    const choices = portList.map((port) => {
        return {
            name: `Puerto ${port.path}`,
            value: port.path
        };
    });

    return rawlist({
        message: "Seleccione una opción:",
        choices
    });
};

const handlePoll = async function () {
    await pos
        .poll()
        .then((response) => console.log("Respuesta Poll:", response))
        .catch((error) => console.log("Error al ejecutar poll:", error));
};

const handleLoadKey = async function () {
    await pos
        .loadKeys()
        .then((response) => console.log("Respuesta Carga de llaves:", response))
        .catch((error) =>
            console.log("Error al ejecutar carga de llaves:", error)
        );
};

const handleInitialization = async function () {
    await pos
        .initialization()
        .then((response) => console.log("Respuesta Initialization:", response))
        .catch((error) =>
            console.log("Error al ejecutar initialization:", error)
        );
};

const handleInitializationResponse = async function () {
    await pos
        .initializationResponse()
        .then((response) =>
            console.log("Respuesta InitializationResponse:", response)
        )
        .catch((error) =>
            console.log("Error al ejecutar initializationResponse:", error)
        );
};

const handleGetLastSale = async function () {
    if (selectedPosType === "autoservicio") {
        const sendVoucher = await askYesNo(
            "¿Desea incluir voucher en la respuesta?"
        );
        await pos
            .getLastSale(sendVoucher)
            .then((response) =>
                console.log("Respuesta Última venta:", response)
            )
            .catch((error) =>
                console.log("Error al obtener última venta:", error)
            );
        return;
    }

    await pos
        .getLastSale()
        .then((response) => console.log("Respuesta Última venta:", response))
        .catch((error) => console.log("Error al obtener última venta:", error));
};

const handleGetTotals = async function () {
    await pos
        .getTotals()
        .then((response) => console.log("Respuesta Totales:", response))
        .catch((error) => console.log("Error al obtener totales:", error));
};

const handleSalesDetail = async function () {
    const printOnPos = await askYesNo("¿Desea imprimir el detalle en el POS?");

    await pos
        .salesDetail(printOnPos)
        .then((result) => {
            console.log("Detalle de ventas:", result);
        })
        .catch((error) => {
            console.log("Error al obtener detalle de ventas:", error);
        });
};

const handleCloseDay = async function () {
    if (selectedPosType === "autoservicio") {
        const sendVoucher = await askYesNo(
            "¿Desea incluir voucher de cierre en la respuesta?"
        );
        await pos
            .closeDay(sendVoucher)
            .then((response) => {
                console.log("Cierre del día realizado:", response);
            })
            .catch((error) => {
                console.log("Error al cerrar el día:", error);
            });
        return;
    }

    await pos
        .closeDay()
        .then((response) => {
            console.log("Cierre del día realizado:", response);
        })
        .catch((error) => {
            console.log("Error al cerrar el día:", error);
        });
};

const handleChangeToNormalMode = async function () {
    await pos
        .changeToNormalMode()
        .then((response) =>
            console.log("POS cambiado a modo normal:", response)
        )
        .catch((error) =>
            console.log("Error al cambiar a modo normal:", error)
        );
};

const handleClosePort = async function () {
    const result = await pos.disconnect();

    if (result) {
        console.log("Puerto desconectado");
        return CLOSE_PORT;
    }

    console.log("No se logro cerrar el puerto");
    return null;
};

const handleExit = async function () {
    console.log("Saliendo...");
    await pos.disconnect();
    return EXIT_CODE;
};

const executeOption = async function (option) {
    const handler = optionHandlers[option];

    if (!handler) {
        console.log("Opción no válida. Inténtalo de nuevo.");
        return;
    }

    return handler();
};

const executeConnectionOption = async function (option) {
    switch (option) {
        case "autoConnect":
            return autoConnect();

        case "listPort": {
            const portList = await pos.listPorts();
            if (portList.length === 0) {
                console.log("No hay puertos disponibles");
                return;
            }

            const selectedPort = await showPortMenu(portList);

            try {
                const result = await pos.connect(selectedPort);

                if (result) {
                    console.log("Puerto conectado");
                    return PORT_OPEN;
                }
            } catch (error) {
                console.log(error.message);
            }

            console.log("No se logro abrir el puerto");
            break;
        }

        case "exit":
            console.log("Saliendo...");
            await pos.disconnect();
            return EXIT_CODE;

        default:
            console.log("Opción no válida. Inténtalo de nuevo.");
            break;
    }
};

const autoConnect = async function () {
    return new Promise((resolve) => {
        pos.autoconnect()
            .then((port) => {
                if (port) {
                    console.log("Conectado a", port.path);
                    resolve(PORT_OPEN);
                } else {
                    console.log(
                        "No se pudo conectar a un POS. Saliendo del programa..."
                    );
                }
            })
            .catch((error) => {
                console.log("Error al conectar:", error);
                console.log(
                    "No se pudo conectar a un POS. Saliendo del programa..."
                );
            });
    });
};

const saleOperation = async function () {
    const amount = await input({
        message: "Ingrese el monto de la venta:",
        default: "1000"
    });

    const ticket = await input({
        message: "Ingrese el ticket de la venta:",
        default: "ABC123"
    });

    const sendStatus = await askYesNo("¿Desea recibir mensajes intermedios?");
    const sendVoucher = await askYesNo(
        "¿Desea el voucher en la respuesta JSON?"
    );

    await pos
        .sale(amount, ticket, sendStatus, sendVoucher, (intermediateResponse) =>
            console.log(intermediateResponse)
        )
        .then((response) => {
            console.log("Respuesta de la venta:", response);
        })
        .catch((error) => {
            console.log("Error en la venta:", error);
        });
};

const multicodeSaleOperation = async function () {
    const amount = await input({
        message: "Ingrese el monto de la venta:",
        default: "1000"
    });

    const ticket = await input({
        message: "Ingrese el ticket de la venta:",
        default: "ABC123"
    });

    const commerceCode = await input({
        message: "Ingrese el código de comercio del proveedor:",
        default: "597029414308"
    });

    const sendStatus = await askYesNo("¿Desea recibir mensajes intermedios?");
    const sendVoucher = await askYesNo(
        "¿Desea incluir voucher en la respuesta?"
    );

    if (selectedPosType === "autoservicio") {
        await pos
            .multicodeSale(
                amount,
                ticket,
                commerceCode,
                sendVoucher,
                sendStatus,
                (intermediateResponse) => console.log(intermediateResponse)
            )
            .then((response) => {
                console.log("Respuesta de la venta multicódigo:", response);
            })
            .catch((error) => {
                console.log("Error en la venta multicódigo:", error);
            });
        return;
    }

    await pos
        .multicodeSale(
            amount,
            ticket,
            commerceCode,
            sendStatus,
            sendVoucher,
            (intermediateResponse) => console.log(intermediateResponse)
        )
        .then((response) => {
            console.log("Respuesta de la venta multicódigo:", response);
        })
        .catch((error) => {
            console.log("Error en la venta multicódigo:", error);
        });
};

const refundOperation = async function () {
    if (selectedPosType === "integrado") {
        const operationId = await input({
            message: "Ingresa el número de operación"
        });

        await pos
            .refund(operationId)
            .then((data) => {
                console.log("Devolución realizada:", data);
            })
            .catch((error) => {
                console.log("Error en la devolución:", error);
            });
        return;
    }

    await pos
        .refund()
        .then((data) => {
            console.log("Devolución realizada:", data);
        })
        .catch((error) => {
            console.log("Error en la devolución:", error);
        });
};

const optionHandlers = {
    poll: handlePoll,
    loadKey: handleLoadKey,
    initialization: handleInitialization,
    initializationResponse: handleInitializationResponse,
    changeToNormalMode: handleChangeToNormalMode,
    getLastSale: handleGetLastSale,
    getTotals: handleGetTotals,
    sale: saleOperation,
    multicodeSale: multicodeSaleOperation,
    refund: refundOperation,
    salesDetail: handleSalesDetail,
    close: handleCloseDay,
    closePort: handleClosePort,
    exit: handleExit
};

main();
