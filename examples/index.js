const { rawlist, input, select } = require('@inquirer/prompts')
const Transbank = require('../index')

const pos = new Transbank.POSIntegrado()
pos.setDebug(true)

pos.autoconnect().then(port => {
    if (port) {
        console.log('Conectado a', port.path)
        main()
    } else {
        console.log('No se pudo conectar a un POS. Saliendo del programa...')
        process.exit()
    }
}).catch(error => {
    console.log('Error al conectar:', error)
    console.log('No se pudo conectar a un POS. Saliendo del programa...')
    process.exit()
});

async function main() {
    let exit = false

    while(!exit) {
        let option = await showMenu()
        exit = await executeOption(option)
    }
    process.exit()
}

async function showMenu() {
    const answer = await rawlist({
        message: 'Seleccione una opción:',
        choices: [
            {name: 'Carga de llaves', value: 'loadKey'},
            {name: 'Realizar una venta', value: 'sale'},
            {name: 'Realizar una devolución', value: 'refund'},
            {name: 'Ver detalle de ventas', value: 'salesDetail'},
            {name: 'Cerrar sesión POS', value: 'close'},
            {name: 'Salir', value: 'exit'},
        ]
    })

    return answer
}

async function executeOption(option) {
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

        case 'exit':
            console.log('Saliendo...')
            return true;

        default:
            console.log('Opción no válida. Inténtalo de nuevo.')
            break;
    }
}

async function saleOperation() {
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
            description: 'Se recibirán mensajes intermedios durante la venta.',
        },
        {
            name: 'No',
            value: false,
            description: 'Solo se recibe la respuesta de la venta.',
        },
        ],
    });

    await pos.sale(amount, ticket, intermediateMessages, (intermediateResponse) => console.log(intermediateResponse))
    .then(response => {
        console.log('Respuesta de la venta:', response);
    })
    .catch(error => {
        console.log('Error en la venta:', error)
    });

}

async function refundOperation() {
    const operationId = await editor({
        message: 'Ingresa el número de operación'
    })

    pos.refund(operationId).then(data => {
        console.log('Devolución realizada:', data)
    }).catch(error => {
        console.log('Error en la devolución:', error)
    });
}
