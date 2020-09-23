/// <reference types="node" />

declare module 'proxy' {
  import { Server } from 'http';

  export default function getProxy(server?: Server): Server; 
}
