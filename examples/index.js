// const { POS } = require('../index');

// const pos = new POS();
// pos.setDebug(true);
// pos.autoconnect().then((port) => {
//     if (port) {
//         console.log('Connected to ', port.path)
//     }


    // pos.changeToNormalMode().then((data) => {
    //     console.log('RESPONSE', data);
    // })
    // pos.sale(1000, '1212', false, (data) => {
    //     console.log('MIDDLE', data)
    // }).then((data) => {
    //         console.log('RESPONSE', data);
    // });


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

// });

const { POSAutoservicio, POSIntegrado } = require('../index')

// const pos = new POSAutoservicio();
const pos = new POSIntegrado();

    pos.setDebug(true);
    pos.autoconnect().then(port => {
        if (port) {
            console.log('Connected to', port.path)
        };
        // pos.loadKeys().then(response => console.log(response))
        // pos.sale(1000, Math.floor(Math.random() * 10000) + 1, true).then(response => console.log(response)).catch(error => console.log(error))
        // pos.salesDetail(false).then(result => console.log(result))
        // pos.closeDay()
        // pos.loadKeys().then(response => {
        //     console.log(response)
        //     pos.closeDay().then(response => console.log(response))
        // })
    }).catch(error => console.log(error));