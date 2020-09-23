import https, { Server as HttpsServer } from "https";
import http, { Server as HttpServer } from "http";
import { AddressInfo } from "net";
import { ProxyServer } from './proxy';
import fs from 'fs';
import { getProxyHttpAgent }  from '../src/index';
import url from 'url';
import fetch from 'node-fetch';

// util.inspect.defaultOptions.depth = null; //enable full object reporting in console.log

// jest.setTimeout(30000);

let localApiServer: HttpServer;
let localApiServerPort: number;

let localApiHttpsServer: HttpsServer;
let localApiHttpsServerPort: number;

let proxy: ProxyServer;
let proxyPort: number = 8123;


beforeAll((done) => {
    // _____________ setup the local api http server
    let closeCounter: number = 0;

    function handleDone() {
        closeCounter++;
        console.log('handle done ::::: ')
        console.log('counter: ' + closeCounter);
        if (closeCounter === 3) {
            console.log('DONE DONE DONE DONE');
            done();
        }
    }

    localApiServer = http.createServer();

    localApiServer.listen(() => {
        localApiServerPort = (localApiServer.address() as AddressInfo).port;
        console.log('localApiServerPort')
        console.log(localApiServerPort)
        handleDone();
    });

    localApiServer.on('data', (data: any) => {
        console.log('on data ::::')
        console.log(data.toString())
    });

    localApiServer.on('connection', (socket: any) => {
        socket.on('data', (data: any) => {
            console.log('on connection ::::')
            console.log(data.toString())
        })
    });


    // ____________ setup local api HTTPS server

    const options = {
        key: fs.readFileSync(`${__dirname}/server.key`),
        cert: fs.readFileSync(`${__dirname}/server.cert`)
    };
    localApiHttpsServer = https.createServer(options);

    localApiHttpsServer.listen(() => {
        localApiHttpsServerPort = (localApiHttpsServer.address() as AddressInfo).port;
        console.log('localApiHttpsServerPort')
        console.log(localApiHttpsServerPort)
        handleDone();
    });

    // ____________ setup proxy
    proxy = new ProxyServer({
        port: proxyPort
    });

    proxy.awaitStartedListening()
        .then(() => {
            handleDone();
        })
        .catch(() => {
            handleDone();
        });
});

// exit after test finish and release resources

afterAll((done) => {
    setTimeout(() => {
        process.exit(0);
    }, 100);
    done();
});


// ______________ starting testing

describe('API checks', () => {
    test('Proxy option obligatory', () => {
        try {
            let agent = getProxyHttpAgent({} as any);
            fail('No error thrown');
        } catch(err) {
            expect(err.message).toBe('Proxy not provided');
        }
    });

    test('End server protocol Default to https', () => {
        let proxyUrl =
            process.env.HTTP_PROXY ||
            process.env.http_proxy ||
            `http://localhost:${proxyPort}`;

        let agent = getProxyHttpAgent({
            proxy: proxyUrl
        });

        // @ts-ignore
        expect(agent.test_endServerProtocol).toBe('https:');
    });
});

// _______ http local test server
describe('Node fetch', () => {
    describe('http local test server', () => {
        test('Test if it works with http (consuming a local server api)', (done) => {
            console.log('test ::::>')
            localApiServer.once('request', function(req, res) {
                console.log('once hola !!!!!')
                res.end(JSON.stringify(req.headers));
            });

            let proxyUrl =
                process.env.HTTP_PROXY ||
                process.env.http_proxy ||
                `http://localhost:${proxyPort}`;
            
            let agent = getProxyHttpAgent({
                proxy: proxyUrl,
                endServerProtocol: 'http:'
            });
            const opts: any = url.parse(`http://localhost:${localApiServerPort}`);
    
            opts.agent = agent;
    
            let req = http.get(opts, function(res) {
                let data: any = '';
                res.setEncoding('utf8');
                res.on('data', function(b) {
                    data += b;
                    console.log('::::::::::::::::::::::::::::::::::::://///>')
                    console.log('data :::')
                    console.log(data)
                });
                res.on('end', function() {
                    console.log('RESPONSE END ::::::::::::::://>')
                    data = JSON.parse(data);
                    expect(`localhost:${localApiServerPort}`).toEqual(data.host);
                    done();
                });
            });
            req.once('error', done);
        });
        
        test('Test if it works with node fetch (consuming a local server api)', async () => {
            localApiServer.once('request', function(req, res) {
                res.end(JSON.stringify(req.headers));
            });
    
            let proxyUrl =
                process.env.HTTP_PROXY ||
                process.env.http_proxy ||
                `http://localhost:${proxyPort}`;
            
            let agent = getProxyHttpAgent({
                proxy: proxyUrl,
                endServerProtocol: 'http:'
            });
    
            try {
                console.log("Fetch ::::>")
                const response = await fetch(`http://localhost:${localApiServerPort}`, {
                    method: 'GET',
                    agent
                });
                
                console.log('response :::::::::////>')

                if (response.status === 200) {
                    const data = await response.json();
    
                    if (data) {
                        expect(data.host).toEqual(`localhost:${localApiServerPort}`);
                    } else {
                        fail(new Error('No data from local server!'));
                    }
                }
            } catch(err) {
                fail(err);
            }
        });
    });

    // ______ Https local test server

    describe('Https local test server', () => {
        test('Test if it works with http (consuming a local https server api)', (done) => {
            localApiHttpsServer.once('request', function(req, res) {
                res.end(JSON.stringify(req.headers));
            });
    
            let proxyUrl =
                process.env.HTTP_PROXY ||
                process.env.http_proxy ||
                `http://localhost:${proxyPort}`;
            
            let agent = getProxyHttpAgent({
                proxy: proxyUrl,
                rejectUnauthorized: false
            });

            const opts: any = url.parse(`https://localhost:${localApiHttpsServerPort}`);
            // opts.rejectUnauthorized = false;
            opts.agent = agent;
    
            console.log('get ::::')

            let req = https.get(opts, function(res) {
                let data: any = '';
                res.setEncoding('utf8');
                res.on('data', function(b) {
                    data += b;
                    console.log('::::::::::::::::::::::::::::::::::::://///>')
                    console.log('data :::')
                    console.log(data)
                });
                res.on('end', function() {
                    console.log('RESPONSE END :::::::::::///////////////>')
                    data = JSON.parse(data);
                    console.log('END:::')
                    console.log(data)
                    expect(data.host).toEqual(`localhost:${localApiHttpsServerPort}`);
                    done();
                });
            });
            req.once('error', done);
        });
        
        test('Test if it works with node fetch (consuming a local https server api)', async () => {
            localApiHttpsServer.once('request', function(req, res) {
                console.log('ONCE::::')
                res.end(JSON.stringify(req.headers));
            });
    
            let proxyUrl =
                process.env.HTTP_PROXY ||
                process.env.http_proxy ||
                `http://localhost:${proxyPort}`;
            
            let agent = getProxyHttpAgent({
                proxy: proxyUrl,
                rejectUnauthorized: false
            });

            try {
                console.log(('fetch :::: :: :: :: :'))
                const response = await fetch(`https://localhost:${localApiHttpsServerPort}`, {
                    method: 'GET',
                    agent
                });
                
                console.log('"response !!!!!!!!!!!!"')

                if (response.status === 200) {
                    const data = await response.json();
    
                    console.log(data)

                    if (data) {
                        expect(data.host).toEqual(`localhost:${localApiHttpsServerPort}`);
                    } else {
                        fail(new Error('No data from local server!'));
                    }
                }
            } catch(err) {
                fail(err);
            }
        });    
    });

    describe('Binance api (https)', () => {
        test('Test if it works with http.request (Binance api)', (done) => {    
            let proxyUrl =
                process.env.HTTP_PROXY ||
                process.env.http_proxy ||
                `http://localhost:${proxyPort}`;
            
            let agent = getProxyHttpAgent({
                proxy: proxyUrl
            });

            const opts: any = url.parse(`https://api.binance.com/api/v3/ping`);
            delete opts.port;
            opts.agent = agent;
    
            let req = https.get(opts, function(res) {
                let data: any = '';
                res.setEncoding('utf8');
                res.on('data', function(b) {
                    console.log('::::::::::::::::::::::::::::::::::::://///>')
                    console.log('DATA ::::')
                    data += b;
                });
                res.on('end', function() {
                    console.log('RESPONSE END :::::::::::////>')
                    data = JSON.parse(data);

                    console.log(data)

                    expect(data).toEqual({});
                    done();
                });
            });
            req.once('error', done);
        });

        test('Test if it works with node fetch (testing against binance api)', async () => {
            let proxyUrl =
            process.env.HTTP_PROXY ||
            process.env.http_proxy ||
            `http://localhost:${proxyPort}`;
        
            let agent = getProxyHttpAgent({
                proxy: proxyUrl
            });
    
            console.log('FETCH :::/>')

            try {
                const response = await fetch(`https://api.binance.com/api/v3/ping`, {
                    method: 'GET',
                    agent
                });

                console.log('response :::::/>')

                if (response.status === 200) {
                    const data = await response.json();
                
                    console.log(data)

                    if (data) {
                        expect(data).toEqual({});
                        console.log('EXPECT OK')
                    } else {
                        fail(new Error('No data from binance server!'));
                    }
                }
            } catch(err) {
                fail(err);
            }
        });
    });
});

// TODO: add test for an https proxy too
