const { ipcRenderer } = require( 'electron' );

// The primary display, for windows.  The main process sends changes, so this
// only has to ask once.

/** @type {{bounds: Electron.Rectangle, workArea: Electron.Rectangle, size: Electron.Size, workAreaSize: Electron.Size} | null} */
let primaryDisplay = null;

ipcRenderer.on( 'window:primary-display:changed', ( e, info ) => {
    primaryDisplay = info;
} );

/**
 * Returns the primary display's bounds, work area and size.
 *
 * @returns {{bounds: Electron.Rectangle, workArea: Electron.Rectangle, size: Electron.Size, workAreaSize: Electron.Size}}
 */
function getPrimaryDisplay() {
    // Only the first call waits on the main process.
    return primaryDisplay ?? ( primaryDisplay = ipcRenderer.sendSync( 'window:primary-display:sync' ) );
}

module.exports = { getPrimaryDisplay };
