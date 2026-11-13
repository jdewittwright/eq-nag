const { BrowserWindow, ipcMain, screen, webContents } = require( 'electron' );

// What the windows used to do themselves through @electron/remote.  Each
// handler only acts on the window that sent the message, so a window can't
// move, close or read anything about another window.

/**
 * The parts of the primary display the windows use.
 *
 * @returns {{bounds: Electron.Rectangle, workArea: Electron.Rectangle, size: Electron.Size, workAreaSize: Electron.Size}}
 */
function primaryDisplayInfo() {
    const display = screen.getPrimaryDisplay();
    return {
        bounds: display.bounds,
        workArea: display.workArea,
        size: display.size,
        workAreaSize: display.workAreaSize,
    };
}

/**
 * Registers the window handlers.  Call once the app is ready, because the
 * screen module isn't available before then.
 */
function registerWindowIpc() {

    ipcMain.on( 'window:self:close', event => {
        BrowserWindow.fromWebContents( event.sender )?.close();
    } );

    ipcMain.on( 'window:self:ignore-mouse-events',
        /**
         * @param {Electron.IpcMainEvent} event
         * @param {boolean} ignore If true, mouse events pass through the window.
         */
        ( event, ignore ) => {
            const window = BrowserWindow.fromWebContents( event.sender );
            if ( ignore === true ) {
                window?.setIgnoreMouseEvents( true, { forward: false } );
            } else {
                window?.setIgnoreMouseEvents( false );
            }
        } );

    ipcMain.handle( 'window:cursor-point', () => {
        const { x, y } = screen.getCursorScreenPoint();
        return { x, y };
    } );

    ipcMain.handle( 'window:primary-display', () => primaryDisplayInfo() );

    // For code that has to have the answer right away.  Prefer the handler above.
    ipcMain.on( 'window:primary-display:sync', event => {
        event.returnValue = primaryDisplayInfo();
    } );

    // Windows that keep a copy of the primary display hear about changes.
    const sendDisplayChanged = () => {
        const info = primaryDisplayInfo();
        for ( const contents of webContents.getAllWebContents() ) {
            if ( !contents.isDestroyed() ) {
                contents.send( 'window:primary-display:changed', info );
            }
        }
    };
    screen.on( 'display-added', sendDisplayChanged );
    screen.on( 'display-removed', sendDisplayChanged );
    screen.on( 'display-metrics-changed', sendDisplayChanged );
}

module.exports = { registerWindowIpc };
