const { contextBridge, ipcRenderer } = require( 'electron' );
const { sanitizeHtml } = require( '../utilities/html' );
// This window is sandboxed, so this file is bundled with the modules it uses
// (see tools/build-preloads.mjs) and the window loads preloaders/build/scraper-eqsr.js.

const channelPrefixes = [
    'app',
    'overlay',
    'clipboard',
    'log',
    'audio-file',
    'cache',
    'combat-database',
    'show-settings',
];
let i = 0;

contextBridge.exposeInMainWorld( 'api', {
    ipc: {
        sendModel: ( data ) => {
            ipcRenderer.send( 'scraper:done[' + i + ']', data );
        },
        sendError: ( error ) => {
            // Only plain data can be sent over IPC (sending a DOM event
            // throws, so the error would never arrive), so send just the message.
            const message = typeof error === 'string' ? error : error?.message ?? String( error );
            ipcRenderer.send( 'scraper:error[' + i + ']', { message: message } );
        },
    },
    sanitizeHtml: ( html ) => sanitizeHtml( html ),
    setIndex: ( index ) => {
        i = +index;
    },
    close: () => {
        ipcRenderer.send( 'window:self:close' );
    },
} );
