## [4.0.0] - 19-12-2024

### Actualiza

- Se actualiza dependencias del SDK.
- Se actualiza la versión mínima de Node a >= 20.
- Se refina el flujo de desconexión del puerto serial.

## [3.0.2] - 23-10-2023
- Se corrige bug detectado en la reconexión del puerto serie
- Se mejoran los logs de debug

## [3.0.1] - 16-08-2022
- Se corrige problema detectado al ejecutar connect con _baudrate_ por defecto.
  
## [3.0.0] - 13-06-2022
- Se agrega soporte para POS Autoservicio
- Se renombra clase POS a POS Integrado
- Se agrega clase BasePOS que contiene código compartido por POS Integrado y POS Autoservicio
- Se arregla bug en mensajes intermedios cuando callback es nulo
- Se arregla número de funcion en detalle de refund, estaba llegando un caracter hexadicemal extra que ahora es ignorado.

## [2.1.2] - 23-09-2021
- Se mejora el proceso de deployment de cada versión pasando ahora por travis.

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
