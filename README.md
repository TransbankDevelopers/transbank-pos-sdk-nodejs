# Transbank POS SDK Node.js

SDK Oficial de Transbank para comunicarse con POS Verifone vx520, vx520c, Ingenico 3500 y POS Autoservicio

## Requisitos
- Node.js 10+
- NPM
- Yarn (recomendable) 

## Instalación
Para instalar este SDK en tu proyecto, solo debes incluirlo usando npm/yarn. 
```bash
npm install transbank-pos-sdk
```

### ¿Cómo se usa?
Como se explica más abajo, la documentación oficial está en [Transbank developers](https://www.transbankdevelopers.cl/producto/posintegrado), pero como una breve introducción: 

```javascript
//Dependiendo del modelo de POS
const { POSAutoservicio } = require('transbank-pos-sdk');
const { POSIntegrado } = require('transbank-pos-sdk');

const pos = new POSIntegrado();
pos.setDebug(true);

pos.autoconnect() // Esta línea permite busca en todos los puertos si existe uno que tenga conectado un equipo POS y se intenta conectar con el primero que encuentra. 
    .then((port) => {
        if (port === false) {
            console.log('No se encontró ningún POS conectado')
        }  

        console.log('Connected to PORT: ', port.path)
        pos.loadKeys() // Cargar llaves
    })
    .catch((err) => { console.log('Ocurrió un error inesperado', err) })

```


### Métodos
La mayoría de los métodos devuelve un `Promise` que al resolverse devuelve la respuesta del POS o el resultado de la operación

#### `setDebug(true/false)`
Habilita/Deshabilita el que se imprima información de debug en la consola. 
```javascript
pos.setDebug(true);
```

#### `autoconnect()`
Este método permite en un solo comando buscar un POS dentro de los puertos disponibles y conectarse automáticamente al primer POS que encuentre (en caso de haber más de uno)
```javascript
pos.autoconnect().then( (response) => {
    console.log(response);
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});
```

#### `listPorts()`
Devuelve una lista de los puertos del computador disponibles para conectarse. 
```javascript
pos.listPorts().then( (ports) => {
    console.log(ports);
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});
```

#### `connect(portName)`
Este método permite en un solo comando buscar un POS dentro de los puertos disponibles y conectarse automáticamente al primer POS que encuentre (en caso de haber más de uno). 
```javascript
let portName = '/dev/tty.usb2412412'; //Ejemplo En caso de mac
let portName = 'COM4'; //Ejempo en caso de windows
pos.connect(portName).then( (response) => {
    console.log('Conectado correctamente');
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});
```

#### `disconnect()`
Desconectar (cerrar conexión serial) con el POS actualmente conectado.  
```javascript
pos.disconnect().then( (response) => {
    console.log('Puerto descontactado correctamente');
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});
```

#### `isConnected()`
Devuelve `true` en caso de que exista una conexión activa con el POS y `false` en caso contrario
```javascript
let connected = pos.isConnected();
```

#### `getConnectedPort()`
Devuelve el puerto al que se está conectado en caso de que exista una conexión activa con el POS y `false` en caso contrario. 
```javascript
let connectedToPort = pos.getConnectedPort();
```

#### `send(payload, waitResponse = true, callback = null)`
Este comando, si bien es de uso interno, es posible usarlo públicamente y permite enviar un payload al POS. Este es el 
método que ocupan todos los siguientes helpers para comunicarse con el POS.

Este método devuelve una promesa. Si `waitResponse` es `false` esta promese se resuelve cuando el comando es recibido 
correctamente por el POS (se recibe ack). Si `waitResponse`  es `true` la promesa se resuelve cuando llega un mensaje de 
respuesta del POS (ejemplo, cuando la venta termina y el POS envía el resultado de esta venta).   

`payload` es el mensaje a enviar. Puede ser un string (`"0200"`) o un Array de bytes en hexadecimal (`[0x20, 0x32, 0x10]`). 
 
 Si `callback` es una función, esta se ejecutará cada vez que el POS envíe algo. Se usa para obtener los status intermedios de una venta que se envían antes de que llegue la respuesta final.  
   
```javascript
pos.send('0500||', false) // Cerrar día  con waitResponse false
    .then( (response) => {
        console.log('Comando enviado correctamente (se recibió ack del POS)', response);
    }).catch( (err) => {
        console.log('Ocurrió un error inesperado', err);
    });

pos.send('0500||', true) // Cerrar día con waitResponse true
    .then( (response) => {
        console.log('Respuesta recibida por el POS', response);
    }).catch( (err) => {
        console.log('Ocurrió un error inesperado', err);
    });
```

#### `poll()`
Ejecuta un comando `poll` en el POS. 
```javascript
pos.poll().then( (response) => {
    console.log('poll ejecutado. Respuesta: ', response);
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});
```

#### `loadKeys()`
Ejecuta un comando `loadKeys` en el POS. 
```javascript
pos.loadKeys().then( (response) => {
    console.log('loadKeys ejecutado. Respuesta: ', response);
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});
```


#### `closeDay()`
Ejecuta un comando `closeDay` en el POS. 
```javascript
pos.closeDay().then( (response) => {
    console.log('closeDay ejecutado. Respuesta: ', response);
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});
```


#### `getLastSale()`
Ejecuta un comando `getLastSale` en el POS. 
```javascript
pos.getLastSale().then( (response) => {
    console.log('getLastSale ejecutado. Respuesta: ', response);
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});
```

#### `getTotals()`
Ejecuta un comando `getTotals` en el POS. 
```javascript
pos.getTotals().then( (response) => {
    console.log('getTotals ejecutado. Respuesta: ', response);
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});
```

#### `salesDetail(printOnPos = false)`
Obtiene detalle de las ventas del POS. `printOnPos` indica si se desea imprimir en papel el detalle de ventas en el POS. 
Si `printOnPos` es true, el POS no enviará respuesta al computador y solo lo imprimirá, por lo que la promesa de 
respuesta se ejecutará cuando llegue el ack de que el POS recibió el comando. En caso contrario, la promesa se resuelve 
cuando llega la lista con todas las ventas. 
```javascript
pos.salesDetail().then( (response) => {
    console.log('salesDetail ejecutado. Respuesta: ', response);
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});
```

#### `refund(operationId)`
Ejecuta un comando `refund` en el POS. `operationId` es el ID de la operación que se desea anular.  
```javascript
pos.refund('102').then( (response) => {
    console.log('refund ejecutado. Respuesta: ', response);
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});
```

#### `changeToNormalMode()`
Ejecuta un comando `changeToNormalMode` en el POS. 
```javascript
pos.changeToNormalMode().then( (response) => {
    console.log('changeToNormalMode ejecutado. Respuesta: ', response);
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});
```

#### `sale(amount, ticket, sendStatus = false, callback = null)`
Ejecuta un comando `sale` en el POS.
`amount` es el integer que representa el monto a pagar. `ticket` es un número de ticket  que te permita 
referenciar la venta internamente. 

Si `sendStatus` es `false` el POS solo enviará un mensaje cuando se termine el proceso de venta. Si `sendStatus` es 
`false` el POS enviará mensajes a medida que se va avanzando en el proceso  (se selecciona método de pago, 
el usuario pasa la tarjeta, se ingresa la clave, etc). Estos mensajes de estados intermedios se pueden capturar 
definiendo una función en el parámetro `callback`
 
```javascript
// Venta simple sin estados intermedios
pos.sale(1500, '12423').then( (response) => {
    console.log('sale finalizado. Respuesta: ', response);
}).catch( (err) => {
    console.log('Ocurrió un error inesperado', err);
});

// Venta con estados intermedios
let callback = function (data) {
    console.log('Mensaje intermedio recibido:  ', data)
}
pos.sale(1500, '12423', true, callback)
    .then( (response) => {
        console.log('sale finalizado. Respuesta: ', response);
    }).catch( (err) => {
        console.log('Ocurrió un error inesperado', err);
}); 

```

### Proyecto de ejemplo
El SDK Web de POS integrado está construido en Node.js, usando este SDK por debajo. [Puedes revisar el código acá](https://github.com/TransbankDevelopers/transbank-pos-sdk-web-agent). 

## Documentación 

Puedes encontrar toda la documentación de cómo usar este SDK en el sitio https://www.transbankdevelopers.cl.

La documentación relevante para usar este SDK es:

- Documentación general sobre los productos y sus diferencias:
  [POSIntegrado](https://www.transbankdevelopers.cl/producto/posintegrado)
- Primeros pasos con [POSIntegrado](https://www.transbankdevelopers.cl/documentacion/posintegrado).
- Referencia detallada sobre [POSIntegrado](https://www.transbankdevelopers.cl/referencia/posintegrado).

## Información para contribuir y desarrollar este SDK

### Estándares

- Para los commits respetamos las siguientes normas: https://chris.beams.io/posts/git-commit/
- Usamos ingles, para los mensajes de commit.
- Se pueden usar tokens como WIP, en el subject de un commit, separando el token con `:`, por ejemplo:
`WIP: This is a useful commit message`
- Para los nombres de ramas también usamos ingles.
- Se asume, que una rama de feature no mezclada, es un feature no terminado.
- El nombre de las ramas va en minúsculas.
- Las palabras se separan con `-`.
- Las ramas comienzan con alguno de los short lead tokens definidos, por ejemplo: `feat/tokens-configuration`

#### Short lead tokens
##### Commits
- WIP = Trabajo en progreso.
##### Ramas
- feat = Nuevos features
- chore = Tareas, que no son visibles al usuario.
- bug = Resolución de bugs.

### Todas las mezclas a master se hacen mediante Pull Request.

## Generar una nueva versión (con deploy automático a NPM)

Para generar una nueva versión, se debe crear un PR (con un título "Prepare release X.Y.Z" con los valores que correspondan para `X`, `Y` y `Z`). Se debe seguir el estándar semver para determinar si se incrementa el valor de `X` (si hay cambios no retrocompatibles), `Y` (para mejoras retrocompatibles) o `Z` (si sólo hubo correcciones a bugs).

En ese PR deben incluirse los siguientes cambios:

1. Modificar el archivo `CHANGELOG.md` para incluir una nueva entrada (al comienzo) para `X.Y.Z` que explique en español los cambios **de cara al usuario del SDK**.
2. Modificar el archivo `package.json` y modificar la versión

Luego de obtener aprobación del pull request, debe mezclarse a master e inmediatamente generar un release en GitHub con el tag `vX.Y.Z`. En la descripción del release debes poner lo mismo que agregaste al changelog.

Posteriormente, se debe hacer el release en npm. Esto se hace de forma manual usando `npm publish`. Se debe estar logeado `npm login` con la cuenta de TransbankDevelopers
