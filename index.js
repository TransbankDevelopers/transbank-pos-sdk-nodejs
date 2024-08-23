const PosIntegrado = require('./src/PosIntegrado');
const PosAutoservicio = require('./src/PosAutoservicio')

const Transbank = {};
Transbank.POSIntegrado = PosIntegrado;
Transbank.POSAutoservicio = PosAutoservicio;

module.exports = Transbank;
