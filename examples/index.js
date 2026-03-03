const { rawlist, input, select } = require('@inquirer/prompts')
const Transbank = require('../index')

const CLOSE_PORT = 1
const PORT_OPEN = 2
const EXIT_CODE = 3

let pos;

const main = async function() {
    const posType = await showPosTypeMenu();

    if (posType === 'integrado') {
        pos = new Transbank.POSIntegrado();
    } else {
        pos = new Transbank.POSAutoservicio();
    }
    pos.setDebug(true);

    let shouldExit = false
    let isConnected = false
    
    while(!shouldExit) {
        let connectOption = await showConnectionMenu()
        let connectionOperationResult = await executeConnectionOption(connectOption)

        if(connectionOperationResult == PORT_OPEN) {
            isConnected = true
        }

        if(connectionOperationResult == EXIT_CODE) {
            shouldExit = true
        }

        while(!shouldExit && isConnected) {
            let option = await showMenu()
            let operationResult = await executeOption(option)

            if(operationResult == CLOSE_PORT) {
                isConnected = false
            }

            if(operationResult == EXIT_CODE) {
                shouldExit = true
                isConnected = false
            }
        }
    }
}

const showPosTypeMenu = async function() {
    const answer = await select({
        message: 'Seleccione el tipo de POS a utilizar:',
        choices: [
            {
                name: 'POS Integrado',
                value: 'integrado'
            },
            {
                name: 'POS Autoservicio',
                value: 'autoservicio'
            }
        ]
    });
    return answer;
}

const showMenu = async function() {
    const answer = await rawlist({
        message: 'Seleccione una opción:',
        choices: [
            {name: 'Poll', value: 'poll'},
            {name: 'Carga de llaves', value: 'loadKey'},
            {name: 'Obtener última venta', value: 'getLastSale'},
            {name: 'Obtener totales', value: 'getTotals'},
            {name: 'Realizar una venta', value: 'sale'},
            {name: 'Realizar una venta multicódigo', value: 'multicodeSale'},
            {name: 'Realizar una devolución', value: 'refund'},
            {name: 'Ver detalle de ventas', value: 'salesDetail'},
            {name: 'Cerrar sesión POS', value: 'close'},
            {name: 'Cerrar Puerto', value: 'closePort'},
            {name: 'Salir', value: 'exit'}
        ]
    })

    return answer
}

const showConnectionMenu = async function() {
    const answer = await rawlist({
        message: 'Seleccione una opción:',
        choices: [
            {name: 'Auto conectar POS', value: 'autoConnect'},
            {name: 'Seleccionar puerto manualmente', value: 'listPort'},
            {name: 'Salir', value: 'exit'}
        ]
    })

    return answer
}

const showPortMenu = async function(portList) {
    const choices = portList.map((port) => {
        return {
            name: `Puerto ${port.path}`,
            value: port.path
        }
    })

    const answer = await rawlist({
        message: 'Seleccione una opción:',
        choices: choices
    })

    return answer
}

const handlePoll = async function() {
    await pos.poll()
        .then(response => console.log('Respuesta Poll:', response))
        .catch(error => console.log('Error al ejecutar poll:', error));
}

const handleLoadKey = async function() {
    await pos.loadKeys().then(response => console.log('Respuesta Carga de llaves:', response));
}

const handleGetLastSale = async function() {
    if (typeof pos.getLastSale !== 'function') {
        console.log('Método getLastSale no disponible para este tipo de POS');
        return
    }

    await pos.getLastSale()
        .then(response => console.log('Respuesta Última venta:', response))
        .catch(error => console.log('Error al obtener última venta:', error));
}

const handleGetTotals = async function() {
    if (typeof pos.getTotals !== 'function') {
        console.log('Método getTotals no disponible para este tipo de POS');
        return
    }

    await pos.getTotals()
        .then(response => console.log('Respuesta Totales:', response))
        .catch(error => console.log('Error al obtener totales:', error));
}

const handleSalesDetail = async function() {
    await pos.salesDetail(false).then(result => {
        console.log('Detalle de ventas:', result);
    }).catch(error => {
        console.log('Error al obtener detalle de ventas:', error)
    });
}

const handleCloseDay = async function() {
    await pos.closeDay().then(response => {
        console.log('Cierre del día realizado:', response)
    }).catch(error => {
        console.log('Error al cerrar el día:', error)
    });
}

const handleClosePort = async function() {
    const result = await pos.disconnect()

    if(result) {
        console.log('Puerto desconectado')
        return CLOSE_PORT;
    }

    console.log('No se logro cerrar el puerto')
}

const handleExit = async function() {
    console.log('Saliendo...')
    await pos.disconnect();
    return EXIT_CODE;
}


const executeOption = async function(option) {
    const handler = optionHandlers[option]

    if (!handler) {
        console.log('Opción no válida. Inténtalo de nuevo.')
        return
    }

    return handler()
}

const executeConnectionOption = async function(option) {
    switch (option) {
        case 'autoConnect':
            await autoConnect()
            break;

        case 'listPort': {
            const portList = await pos.listPorts();
            if(portList.length === 0) {
                console.log('No hay puertos disponibles')
                return
            }

            const selectedPort = await showPortMenu(portList)

            try {
                const result = await pos.connect(selectedPort)

                if(result) {
                    console.log('Puerto conectado')
                    return PORT_OPEN;
                }
            } catch(error) {
                console.log(error.message)
            }

            console.log('No se logro abrir el puerto')   
            break;
        }

        case 'exit':
            console.log('Saliendo...')
            await pos.disconnect();
            return EXIT_CODE;

        default:
            console.log('Opción no válida. Inténtalo de nuevo.')
            break;
    }
}

const autoConnect = async function() {
    return new Promise((resolve) => {
        pos.autoconnect().then(port => {
            if (port) {
                console.log('Conectado a', port.path)
                resolve(PORT_OPEN)
            } else {
                console.log('No se pudo conectar a un POS. Saliendo del programa...')
            }
        }).catch(error => {
            console.log('Error al conectar:', error)
            console.log('No se pudo conectar a un POS. Saliendo del programa...')
        });
    })
}

const saleOperation = async function() {
    const amount = await input({
        message: 'Ingrese el monto de la venta:',
        default: '1000'
    })

    const ticket = await input({
        message: 'Ingrese el ticket de la venta:',
        default: 'ABC123'
    })

    const intermediateMessages = await select({
    message: '¿Desea recibir mensajes intermedios?',
    choices: [
            { name: 'Si', value: true },
            { name: 'No', value: false }
        ]
    });

    const printVoucher = await select({
        message: '¿Desea el voucher en la respuesta JSON?',
        choices: [
            {
                name: 'Si',
                value: true,
                description: 'Se imprimirá el voucher en la respuesta' 
            },
            {
                name: 'No',
                value: false,
                description: 'El POS imprimirá el voucher'
            }
        ]
    });

    await pos.sale(amount, ticket, intermediateMessages, printVoucher, (intermediateResponse) => console.log(intermediateResponse))
    .then(response => {
        console.log('Respuesta de la venta:', response);
    })
    .catch(error => {
        console.log('Error en la venta:', error)
    });
}

const multicodeSaleOperation = async function() {
    const amount = await input({
        message: 'Ingrese el monto de la venta:',
        default: '1000'
    })

    const ticket = await input({
        message: 'Ingrese el ticket de la venta:',
        default: 'ABC123'
    })

    const commerceCode = await input({
        message: 'Ingrese el código de comercio del proveedor:',
        default: '597029414308'
    })

    const sendVoucher = await select({
        message: '¿Devolver voucher formateado? (Campo Impresión)',
        choices: [
            {
                name: 'Si',
                value: true
            },
            {
                name: 'No',
                value: false
            }
        ]
    });

    const intermediateMessages = await select({
    message: 'Recibir mensajes intermedios? (Enviar Mensajes)',
    choices: [
        {
            name: 'Si',
            value: true,
            description: 'Se recibirán mensajes intermedios durante la venta.'
        },
        {
            name: 'No',
            value: false,
            description: 'Solo se recibe la respuesta de la venta.'
        }
        ]
    });

    await pos.multicodeSale(amount, ticket, commerceCode, sendVoucher, intermediateMessages, (intermediateResponse) => console.log(intermediateResponse))
    .then(response => {
        console.log('Respuesta de la venta multicódigo:', response);
    })
    .catch(error => {
        console.log('Error en la venta multicódigo:', error)
    });
}

const refundOperation = async function() {
    const operationId = await input({
        message: 'Ingresa el número de operación'
    })

    await pos.refund(operationId).then(data => {
        console.log('Devolución realizada:', data)
    }).catch(error => {
        console.log('Error en la devolución:', error)
    });
}

const optionHandlers = {
    poll: handlePoll,
    loadKey: handleLoadKey,
    getLastSale: handleGetLastSale,
    getTotals: handleGetTotals,
    sale: saleOperation,
    multicodeSale: multicodeSaleOperation,
    refund: refundOperation,
    salesDetail: handleSalesDetail,
    close: handleCloseDay,
    closePort: handleClosePort,
    exit: handleExit
}

main()
