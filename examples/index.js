const { rawlist, input, select } = require('@inquirer/prompts')
const Transbank = require('../index')

const CLOSE_APP = 0
const CLOSE_PORT = 1
const PORT_OPEN = 2

const pos = new Transbank.POSIntegrado()
pos.setDebug(true)

main()

const main = async function() {
    let exit = false
    let isConnected = false

    while(!exit) {
        let connectOption = await showConnectionMenu()
        let connectionOperationResult = await executeConnectionOption(connectOption)

        if(connectionOperationResult == PORT_OPEN) {
            isConnected = true
        }
        
        if(connectionOperationResult == CLOSE_APP) {
            exit = true
        }

        while(!exit && isConnected) {
            let option = await showMenu()
            let operationResult = await executeOption(option)

            if(operationResult == CLOSE_PORT) {
                isConnected = false
            }

            if(operationResult == CLOSE_APP) {
                exit = true
            }
        }
    }
}

const showMenu = async function() {
    const answer = await rawlist({
        message: 'Seleccione una opción:',
        choices: [
            {name: 'Carga de llaves', value: 'loadKey'},
            {name: 'Realizar una venta', value: 'sale'},
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

const executeOption = async function(option) {
    switch (option) {
        case 'loadKey':
            await pos.loadKeys().then(response => console.log('Respuesta Carga de llaves:', response));
            break;
            
        case 'sale':
            await saleOperation()
            break;

        case 'refund':
            await refundOperation()
            break;

        case 'salesDetail':
            await pos.salesDetail(false).then(result => {
                console.log('Detalle de ventas:', result);
            }).catch(error => {
                console.log('Error al obtener detalle de ventas:', error)
            });
            break;

        case 'close':
            await pos.closeDay().then(response => {
                console.log('Cierre del día realizado:', response)
            }).catch(error => {
                console.log('Error al cerrar el día:', error)
            });
            break;
        
        case 'closePort': {
            const result = await pos.disconnect()

            if(result) {
                console.log('Puerto desconectado')
                return CLOSE_PORT;
            }

            console.log('No se logro cerrar el puerto')
            break;
        }

        case 'exit':
            console.log('Saliendo...')
            return CLOSE_APP;

        default:
            console.log('Opción no válida. Inténtalo de nuevo.')
            break;
    }
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
            return CLOSE_APP;

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
    message: 'Recibir mensajes intermedios?',
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

    await pos.sale(amount, ticket, intermediateMessages, (intermediateResponse) => console.log(intermediateResponse))
    .then(response => {
        console.log('Respuesta de la venta:', response);
    })
    .catch(error => {
        console.log('Error en la venta:', error)
    });

}

const refundOperation = async function() {
    const operationId = await editor({
        message: 'Ingresa el número de operación'
    })

    pos.refund(operationId).then(data => {
        console.log('Devolución realizada:', data)
    }).catch(error => {
        console.log('Error en la devolución:', error)
    });
}
