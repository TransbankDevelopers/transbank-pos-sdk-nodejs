const { POSAutoservicio, POSIntegrado } = require('../index')

const pos = new POSIntegrado();

    pos.setDebug(true);
    pos.autoconnect().then(port => {
        if (port) {
            console.log('Connected to', port.path)
        };
        pos.loadKeys().then(response => console.log(response))
        pos.sale(1000, "ABC123", true).then(response => console.log(response)).catch(error => console.log(error))
        pos.sale(1000, "ABC123", true, true).then(response => console.log(response)).catch(error => console.log(error))
        pos.refund().then(data => console.log(data)).catch(error => console.log(error))
        pos.salesDetail(false).then(result => console.log(result))
        pos.closeDay()
        pos.loadKeys().then(response => {
            console.log(response)
            pos.closeDay().then(response => console.log(response))
        })
    }).catch(error => console.log(error));
