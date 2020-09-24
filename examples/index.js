const Transbank = require('../index');

const pos = new Transbank.POS();
pos.setDebug(true);
pos.autoconnect().then((port) => {
    if (port) {
        console.log('Connected to ', port.path)
    }
    pos.sale(1000, '1212', true, (data) => {
        console.log('MIDDLE', data)
    });


    // pos.getResponsesAsString();
    //
    // pos.loadKeys().then((data) => {
    //     console.log('response', data);
    //
    // }).catch(e => console.log(e))
    //
    // pos.loadKeys().then((data) => {
    //     console.log('response 2', data);
    // }).catch(e => console.log(e))

});


