import getProxy from 'proxy';
import http, { Server } from 'http';

const proxy: Server = getProxy(http.createServer());
proxy.listen('8123', () => {
    console.log('Proxy listening at port ' + 8123 + ' ...');
});

proxy.on('data', (data) => {
    console.log(data.toString());
});

