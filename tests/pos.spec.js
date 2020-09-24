const Transbank = require('../index');

jest.setTimeout(10000);

describe("POS API", () => {
    describe('Port connection', () => {
        it('Se conecta al puerto', () => {
            const pos = new Transbank.POS();
            pos.connect().then(() => {
                console.log('conectado correctamente')
            })

        })
    })
})
