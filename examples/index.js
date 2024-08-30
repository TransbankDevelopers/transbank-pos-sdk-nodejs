const { POSAutoservicio, POSIntegrado } = require('../index')
const readline = require('readline-sync');

let isPortOpen = false;
let POS;

async function handleKeyInSelect(optionsList, question) {
    const cancelIndex = -1;
    const indexResponse = readline.keyInSelect(optionsList, question, { cancel: 'Salir', guide: false });
    if (indexResponse == cancelIndex) {
        console.log('Saliendo del programa...');
        if (isPortOpen) {
            console.log('Cerrando puerto...');
            await POS.disconnect();
        }
        process.exit();
    }
    return optionsList[indexResponse];
}

async function posMiddleware(func) {
    try {
        const response = await func();
        console.log('\nrespuesta recibida: ', response);
        return;
    } catch (error) {
        console.error('Hubo un error al ejecutar el comando...');
        console.error(error);
        if (isPortOpen) {
            console.log('Cerrando puerto...');
            await POS.disconnect();
        }
        process.exit();
    }
}

async function main() {

    const commonMethods = ['Poll', 'Carga de llaves', 'Cierre', 'Ultima venta', 'Venta'];
    const integradoMethods = ['Reembolso', 'Total de ventas', 'Detalle de ventas', 'Modo normal'];
    const autoServicioMethods = ['Inicializacion', 'Respuesta Inicializacion'];

    console.log('\n\nConsola de pruebas para POS Integrado y Autoservicio');
    const posTypeList = ['POS Integrado', 'POS Autoservicio'];
    const posType = await handleKeyInSelect(posTypeList, '¿Que equipo quieres probar?: ');
    console.log(`\nConfigurando ${posType}`);

    const isSelfService = posType == posTypeList[1];
    POS = isSelfService ? new POSAutoservicio() : new POSIntegrado();
    POS.setDebug(true);

    const availablePorts = await POS.listPorts();
    let portList = [];
    availablePorts.map(port => {
        portList.push(port.path);
    })
    const port = await handleKeyInSelect(portList, `Selecciona el puerto de tu ${posType}: `);
    const portBaudRate = [115200, 19200];
    console.log('\nIndica el baudrate a utilizar')
    const baudRate = await handleKeyInSelect(portBaudRate, 'Opción: ');

    console.log(`\nAbriendo puerto: ${port} con Baud Rate ${baudRate}`);
    await posMiddleware(async () => { return await POS.connect(port, baudRate) })
    isPortOpen = true;

    const methodsList = commonMethods.concat(isSelfService ? autoServicioMethods : integradoMethods);

    while (true) {
        console.log(`\nComandos disponibles para ${posType}`);
        const selectedOption = await handleKeyInSelect(methodsList, 'Opción: ');

        console.log('\n');
        switch (selectedOption) {
            case 'Poll':
                {
                    console.log('Realizando Poll...');
                    await posMiddleware(async () => await POS.poll());
                    break;
                }
            case 'Carga de llaves':
                {
                    console.log('Realizando Carga de llaves...');
                    await posMiddleware(async () => await POS.loadKeys());
                    break;
                }
            case 'Cierre':
                {
                    console.log('Realizando Cierre...');
                    if (isSelfService) {
                        const sendVoucher = readline.keyInYN('¿Enviar voucher a la caja? ');
                        await posMiddleware(async () => await POS.closeDay(sendVoucher));
                    }
                    else {
                        await posMiddleware(async () => await POS.closeDay());
                    }
                    break;
                }
            case 'Ultima venta':
                {
                    console.log('Obteniendo última venta...')
                    if (isSelfService) {
                        const sendVoucher = readline.keyInYN('¿Enviar voucher a la caja? ');
                        await posMiddleware(async () => await POS.getLastSale(sendVoucher));
                    }
                    else {
                        await posMiddleware(async () => await POS.getLastSale());
                    }
                    break;
                }
            case 'Venta':
                console.log('Realizando Venta...');
                {
                    const amount = readline.questionInt('Ingrese el monto de la venta: $');
                    const sendStat = readline.keyInYN('¿Enviar Mensajes intermedios? ');
                    await posMiddleware(async () => await POS.sale(amount, "ticket", sendStat));
                    break;
                }
            case 'Reembolso':
                {
                    console.log('Realizando Reembolso...');
                    const operationId = readline.questionInt('Ingrese el ID de operación: ');
                    await posMiddleware(async () => await POS.refund(operationId));
                    break;
                }
            case 'Total de ventas':
                {
                    console.log('Obteniendo total de ventas');
                    await posMiddleware(async () => await POS.getTotals());
                    break;
                }
            case 'Detalle de ventas':
                console.log('Obteniendo detalles de ventas');
                {
                    const sendToPos = readline.keyInYN('¿Imprimir en el POS? ');
                    await posMiddleware(async () => await POS.salesDetail(sendToPos));
                    break;
                }
            case 'Modo normal':
                {
                    console.log('Cambiando a modo normal...');
                    await posMiddleware(async () => await POS.changeToNormalMode());
                    break;
                }

            case 'Inicializacion':
                {
                    console.log('Inicializando...');
                    await posMiddleware(async () => await POS.initialization());
                    break;
                }
            case 'Respuesta Inicializacion':
                {
                    console.log('Obteniendo respuesta de inicialización...')
                    await posMiddleware(async () => await POS.initializationResponse());
                    break;
                }
        }
    }
}

main();
