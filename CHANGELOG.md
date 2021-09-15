## [2.1.1] - 15-09-2021
- Se añade parámetro para configurar _baudrate_ para el método `autoconnect()`

## [2.1.0] - 02-08-2021

Se añade mensaje intermedio para el código de respuesta 80.

## [2.0.0] - 25-05-2021

Se solucionan diferentes errores detectados en el SDK y se añaden nuevas características.

### Fixed

- Se soluciona problema detectado al ejecutar autoconnect reiteradamente, que no permitía ejecutar el comando nuevamente al terminar la ejecución previa de autoconnect.

### Added

- Se añade eventos para indicar cuando el puerto se abre o se cierra.
- Se añade un tiempo de espera máximo para la respuesta del POS, configurado en 150 segundos.
- Se agrega protección para el parámetro printOnPos del comando saleDetail, en caso de no ser de tipo booleano o string retornara un error. En caso de ser de tipo string y no ser true o 1, se retornara el detalle de las transacciones como un objeto.

### Changed
- Los mensajes intermedios ahora son enviados como un objeto que contiene el código de respuesta y el mensaje de respuesta.

## [1.1.0]

### Fixed
- Añade soporte para multi código y vuelto [PR #1](https://github.com/TransbankDevelopers/transbank-pos-sdk-nodejs/pull/1)

## [1.0.2]

### Fixed
- Se mejora el manejo de errores y excepciones en el proceso de conexión al puerto serial y se soluciona error en función `autoconnect()`

## [1.0.0]

### Added
- Primer release, en reemplazo de cliente java. 
