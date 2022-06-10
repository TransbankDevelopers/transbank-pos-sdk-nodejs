const PosIntegrado = require('./dist/PosIntegrado');
const PosAutoservicio = require('./dist/PosAutoservicio')

const Transbank = {};
Transbank.POSIntegrado = PosIntegrado;
Transbank.POSAutoservicio = PosAutoservicio;

module.exports = Transbank;
