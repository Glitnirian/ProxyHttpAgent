# ProxyHttpAgent
A factory to create http proxy agent! Based on the tunnel module! To use a proxy through modules like http and https or node-fetch!

It support https => (http, https) and http => (http, https). (proxy => server) ! Either the proxy is http and either it will go as a tunnel for http! Or a tunnel for https through the CONNECT method!
Or the proxy will be https! And direct forwarding will go!

## Install

```sh
npm install proxy-http-agent --save
```

The name start with proxy and make the accent on https agent to highlight that it's https.Agent

## Creating the agent
```ts
let agent = getProxyHttpAgent(options);
```

```js
const { getProxyHttpAgent } =  require('proxy-http-agent');

let proxyUrl =
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    `http://localhost:${proxyPort}`;

let agent = getProxyHttpAgent({
    proxy: proxyUrl,
    rejectUnauthorized: false
});
```

Also the module is build by typescript! It support typescript too out of the box!

```ts
import { getProxyHttpAgent } = from 'proxy-http-agent';
import https from 'https';

let proxyUrl =
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    `http://localhost:${proxyPort}`;

let agent: https.Agent = getProxyHttpAgent({
    proxy: proxyUrl,
    rejectUnauthorized: false
});
```
## Options

In the core the options are the direct options of `http.Agent` and `https.Agent` and `tunnel module factories options`

Check the node-tunnel repo here

https://github.com/koichik/node-tunnel/

Plus our extra options:

### proxy (IProxyOptions | IProxyHttpsOptions | string)
(Obligatory)
```ts
interface IProxyOptions {
    host: string;
    port: number;
    protocol?: 'http:' | 'https:';
    localAddress?: string;
    proxyAuth?: string;
    headers?: { [key: string]: any };
}
```

```ts
interface IHttpsProxyOptions extends IProxyOptions {
    ca?: Buffer[];
    servername?: string;
    key?: Buffer;
    cert?: Buffer;
}
```

string: the proxy url

### endServerProtocol ('http:' | 'https:')
(optional) default: 'https:'


## Typescript HttpsAgent, HttpAgent types

For typescript you can also get directly https.Agent type from this module as follow

```ts
import { getProxyHttpAgent, HttpsAgent, HttpAgent } = from 'proxy-http-agent';

let proxyUrl =
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    `http://localhost:${proxyPort}`;

let agent: HttpsAgent = getProxyHttpAgent({
    proxy: proxyUrl,
    rejectUnauthorized: false
});
```

We do expose and export it too.

## Using with node-fetch and http.get

From the test files here some nice examples

### https end server
(default is https)

#### Fetch 

```ts
let proxyUrl =
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    `http://localhost:${proxyPort}`;

let agent = getProxyHttpAgent({
    proxy: proxyUrl, // proxy as url string! We can use an object (as tunnel module require too)
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
```

#### http.get

```ts
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
```

### end server http

```ts
let proxyUrl =
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    `http://localhost:${proxyPort}`;

let agent = getProxyHttpAgent({
    proxy: proxyUrl,
    endServerProtocol: 'http:' // <<==== here (we precise that we need an agent to communicate with an end server that work with http)
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
```
