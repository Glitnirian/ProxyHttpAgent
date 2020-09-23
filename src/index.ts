import https, { Agent as HttpsAgent } from 'https';
import http, { Agent as HttpAgent } from 'http';
import url, { UrlObject } from 'url';
import tunnel, { ProxyOptions, HttpsProxyOptions } from 'tunnel';
import { Spread } from './types/utils';

export type IAgentOptions = tunnel.HttpOptions | tunnel.HttpOverHttpsOptions | tunnel.HttpsOverHttpOptions | tunnel.HttpsOverHttpsOptions;

export type IProxyOptions = ProxyOptions & { protocol: 'http:' | 'https:' };

export type IProxyHttpsOptions = HttpsProxyOptions & { protocol: 'http:' | 'https:' };

export type IOptions = Spread<
        Partial<https.AgentOptions> &
        IAgentOptions
        , {
            proxy: IProxyOptions | IProxyHttpsOptions | string,
            endServerProtocol?: 'http:' | 'https:'
        }
    >;

export function getProxyHttpAgent(options: IOptions): http.Agent | https.Agent  {
    if (!options.proxy) {
        throw new Error('Proxy not provided');
    }

    if (typeof options.proxy === 'string') {
        const parsedUrl: UrlObject = url.parse(options.proxy);
        options.proxy = {
            ...parsedUrl,
            port: Number(parsedUrl.port)
        } as any;
    }
    
    const proxy: IProxyOptions | IProxyHttpsOptions = options.proxy as any; 

    if (!options.endServerProtocol) {
        options.endServerProtocol = 'https:';
    }

    let agent: http.Agent | https.Agent;

    if (proxy.protocol === 'http:') {
        if (options.endServerProtocol === 'http:') {
            agent = tunnel.httpOverHttp(options as any);
        } else {
            /**
             * https
             */
            agent = tunnel.httpsOverHttp(options as any);
        }
    } else {
        /**
         * https
         */
        if (options.endServerProtocol === 'http:') {
            agent = tunnel.httpOverHttps(options as any);
        } else {
            /**
             * https
             */
            agent = tunnel.httpsOverHttps(options as any);
        }
    }

    if (process.env.NODE_ENV === 'test') {
        // @ts-ignore
        agent.test_endServerProtocol = options.endServerProtocol;
    }

    return agent;
}

export { HttpsAgent, HttpAgent };
