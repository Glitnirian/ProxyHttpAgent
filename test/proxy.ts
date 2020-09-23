import net, { Server, Socket } from 'net';

interface IPromiseFiber {
    promise: Promise<any>, resolve: Function, reject: Function
}

interface IOptions {
    port: number
}

if (!process.env.ACTIVATE_LOGGING) {
    console.log = () => {};
}

// ____________________ Class constructor
export class ProxyServer {
    public port: number;
    public serverListeningPromiseFiber: IPromiseFiber;
    public server: Server

    constructor({
        port
    }: IOptions) {
        this.port = port;
    
        this.serverListeningPromiseFiber = {} as any;
        this.serverListeningPromiseFiber.promise = new Promise((resolve, reject) => {
            this.serverListeningPromiseFiber.resolve = resolve;
            this.serverListeningPromiseFiber.reject = reject;
        });
    
        this.server = createProxyServer.call(this, { port });
    }

    public awaitStartedListening() {
        return this.serverListeningPromiseFiber.promise;
    } 
}

function createProxyServer(this: ProxyServer, {
    port = 8000
}: IOptions): Server {
    try {
        const server = net.createServer();
        
        server.on ('connection', onConnection.bind(this));
    
        server.on('error', (err) => {
            console.log('SERVER ERROR');
            console.log(err);
        });
        
        server.on('close', () => {
            console.log('Client Disconnected');
        });
        
        server.listen(port, () => {
            if (this.serverListeningPromiseFiber) {
                this.serverListeningPromiseFiber.resolve();
            }
            console.log(`Server runnig at http://localhost:${port}`);
        });
        return server;
    } catch(err) {
        console.log('ERROR ON CREATE: ::::: CATCH');
        console.log(err)
        throw err;
    }
}

function onConnection(clientToProxySocket: Socket) {
    console.log('Client Connected To Proxy');
    // We need only the data once, the starting packet
    clientToProxySocket.once ('data', (data) => {
        console.log('data ::::>');
        console.log(data.toString());
        const isConnectMethod = data.toString().indexOf('CONNECT') !== -1;
    
        // Considering Port as 80 by default 
        let serverPort = 80;
        let serverAddress;

        if (isConnectMethod) {
            console.log('CONNECT METHOD :::>');
            // Port changed to 443, parsing the host from CONNECT 
    
            const d = data.toString()
                .split('CONNECT ')[1]
                .split(' ')[0]
                .split(':');

            serverAddress = d[0];
            serverPort = parseInt(d[1]) || 443;

            console.log({
                serverPort,
                serverAddress
            });
        } else {
            console.log("http !!!!>");

            try {
                // Parsing HOST from HTTP
                serverAddress = data.toString().toLowerCase()
                    .split('host: ')[1]
                
                console.log(serverAddress);
                serverAddress = serverAddress    
                    .split('\r\n')[0];
    
                console.log(serverAddress);
    
                const serverAddressSplit = serverAddress.split(':');
    
                serverAddress = serverAddressSplit[0];
    
                serverPort = parseInt(serverAddressSplit[1] || '80');
    
                console.log({
                    serverAddress,
                    serverPort
                });
            } catch(err) {
                console.log(err);
            }
        }

        console.log('Create proxy to server connection ...');
        const proxyToServerSocket = net.createConnection (
            {
                host: serverAddress,
                port: serverPort || 80
            },
            () => {
                console.log('PROXY TO SERVER SET UP');
            

                if (isConnectMethod) {
                    // Send Back OK to HTTPS CONNECT Request
                    console.log("ok >>>>")
                    clientToProxySocket.write('HTTP/1.1 200 OK\r\n\n');
                } else {
                    console.log("data :::>")
                    console.log(data.toString())
                    proxyToServerSocket.write(data);
                }

                // Piping the sockets
                clientToProxySocket.pipe(proxyToServerSocket);  
                proxyToServerSocket.pipe(clientToProxySocket);
            }
        )
        .on('error', (err) => {
            console.log('PROXY TO SERVER ERROR');
            console.log(err);
        });
            
        clientToProxySocket.on('error', (err) => {
            console.log("clientToProxy socket error: :::::::");
            console.log(err);
        });
        
        // _____________ logging
        clientToProxySocket.on('data', (data) => {
            console.log('Data ;;CTPS;;>');
            console.log(data.toString());
        });

        proxyToServerSocket.on('data', (data) => {
            console.log('Data ::PTSS::>');
            console.log(data.toString());
        });
    });
}
