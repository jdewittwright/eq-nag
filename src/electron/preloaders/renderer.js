const { contextBridge, ipcRenderer } = require( 'electron' );

// The overlay renderer runs here, in the preload's world, and the page only
// gets the two calls below.  The renderer module itself isn't handed to the
// page, so the page can't call anything else in it.
window.addEventListener( 'DOMContentLoaded', () => {
    // Loaded once the page exists, because the renderer adds styles and
    // elements to it as soon as it loads.
    const Renderer = require( '../threads/renderer' );
    const params = new URLSearchParams( window.location.search );
    Renderer( +params.get( 'originX' ), +params.get( 'originY' ), params.get( 'glowOnStart' ) === 'true' );
} );

contextBridge.exposeInMainWorld( 'api', {
    /**
     * Opens the settings window at the given page.
     *
     * @param {string} name The settings page.
     */
    showSettings: ( name ) => {
        ipcRenderer.send( 'show-settings', `${name}` );
    },
    /**
     * Turns encounter recording on or off.
     *
     * @param {boolean} record
     */
    recordEncounters: ( record ) => {
        ipcRenderer.send( 'combat:record-encounters', { recordEncounters: record === true } );
    },
} );
