// This window is sandboxed, so this file is bundled with the modules it uses
// (see tools/build-preloads.mjs) and the window loads preloaders/build/main.js.
const { contextBridge, ipcRenderer, webUtils } = require( 'electron' );
const { DateUtilities } = require( '../utilities/dates' );
const StyleSheetUtil = require( '../utilities/style-sheet' );
const NumberUtilities = require( '../utilities/numbers' );
const { pSBCr, pSBC, RGB_Linear_Blend, RGB_Linear_Shade, RGB_Log_Blend, RGB_Log_Shade } = require( '../utilities/colors' );

const channelPrefixes = [
    'app',
    'settings',
    'dkp',
    'log',
    'voice',
    'clipboard',
    'trigger',
    'window',
    'main',
    'death-recap',
    'gina',
    'folders',
    'overlay',
    'renderer',
    'overlays',
    'character',
    'game-resources',
    'audio-file',
    'file',
    'pkg',
    'quickShare',
    'tags',
    'zones',
    'color',
    'orphaned_trigger_warning',
    'update_downloaded',
    'ask_combat_group_migration',
    'dialog',
    'tick',
    'console',
    'context',
    'archive',
    'scraper',
    'simulation',
    'cache',
    'combat-database',
    'combat',
    'show-settings',
];

const styleSheetUtil = new StyleSheetUtil();

function validChannel( channel ) {
    return channelPrefixes.indexOf( channel.split( /:/gi )[ 0 ] ) > -1;
}

contextBridge.exposeInMainWorld( 'api', {
    ipc: {
        send: ( channel, data ) => {
            if ( validChannel( channel ) ) {
                ipcRenderer.send( channel, data );
            } else {
                console.error( 'Invalid comm channel!', channel );
            }
        },
        once: ( channel, handler ) => {
            if ( validChannel( channel ) ) {
                ipcRenderer.once( channel, handler );
            } else {
                console.error( 'Invalid comm channel!', channel );
            }
        },
        on: ( channel, handler ) => {
            if ( validChannel( channel ) ) {
                ipcRenderer.on( channel, handler );
            } else {
                console.error( 'Invalid comm channel!', channel );
            }
        },
        invoke: ( channel, ...args ) => {
            if ( validChannel( channel ) ) {
                return ipcRenderer.invoke( channel, ...args );
            } else {
                console.error( 'Invalid comm channel!', channel );
            }
            return null;
        }
    },
    close: () => {
        ipcRenderer.send( 'window:self:close' );
    },
    setVersionNumberViewed: ( value ) => {
        ipcRenderer.send( 'settings:set:lastViewedUpdateNotes', value );
    },
    utils: {
        dates: {
            getDurationLabel: DateUtilities.getDurationLabel,
        },
        styles: {
            textOutline: styleSheetUtil.templates.textOutline,
            textGlow: styleSheetUtil.templates.textGlow,
        },
        numbers: {
            hasFlag: NumberUtilities.hasFlag,
            addFlag: NumberUtilities.addFlag,
            removeFlag: NumberUtilities.removeFlag,
            toggleFlag: NumberUtilities.toggleFlag,
        },
        screens: {
            // Synchronous because the callers need the answer right away; it's only called when sharing overlays.
            primaryDisplaySize: () => ipcRenderer.sendSync( 'window:primary-display:sync' ).size,
        },
        colors: {
            pSBCr: pSBCr,
            pSBC: pSBC,
            RGB_Linear_Blend: RGB_Linear_Blend,
            RGB_Linear_Shade: RGB_Linear_Shade,
            RGB_Log_Blend: RGB_Log_Blend,
            RGB_Log_Shade: RGB_Log_Shade,
        }
    },
    logger: {
        info: ( ...params ) => ipcRenderer.send( 'app:log:info', params.map( p => typeof p === 'string' ? p : JSON.stringify( p ) ).join( ' ' ) ),
    },
    getPathForFile: ( file ) => {
        return webUtils.getPathForFile( file );
    },
} );
