const { ipcRenderer } = require( 'electron' );
const { mouseZIndex } = require( './constants' );

var mouseEnabled = false;
var dynamicMouseIntervalId = null;
var origin = { x: 0, y: 0 };
const _domRefreshMs = 5000;
const _intervalMs = 33;
var _intervalCount = 0;
/** @type {NodeListOf<Element> | undefined} */
var mouseEnabledDoms = undefined;
/** The last cursor position the main process sent. */
var cursor = { x: 0, y: 0 };
var cursorRequested = false;









/**
 * Disables mouse events.
 */
function setIgnoreMouseEvents() {
    if ( mouseEnabled ) {
        mouseEnabled = false;
        ipcRenderer.send( 'window:self:ignore-mouse-events', true );
        if ( dynamicMouseIntervalId == null ) {
            dynamicMouseIntervalId = window.setInterval( trackDynamicMouse, 33 );
        }
    }
}










/**
 * Enables mouse events.
 * 
 * @param {boolean | undefined} keepEnabled If true, mouse events will not be disabled dynamically.
 */
function setHandleMouseEvents( keepEnabled ) {
    if ( !mouseEnabled ) {
        mouseEnabled = true;
        ipcRenderer.send( 'window:self:ignore-mouse-events', false );
        if ( keepEnabled ) {
            window.clearInterval( dynamicMouseIntervalId );
            dynamicMouseIntervalId = null;
        }
    }
}










/**
 * Returns the mouse screen coordinates.
 *
 * The main process has the cursor position, so this returns the last position
 * it sent and asks for a new one.  Called every 33ms while tracking, so the
 * answer is at most one call behind.
 * 
 * @returns {{x: number, y: number}} The mouse coordinates.
 */
function getMouseUpdate() {
    if ( !cursorRequested ) {
        cursorRequested = true;
        ipcRenderer.invoke( 'window:cursor-point' )
            .then( point => cursor = point, () => { } )
            .finally( () => cursorRequested = false );
    }
    return cursor;
}










/**
 * Dynamically tracks the mouse, and enables/disables mouse events based on the mouse's position.
 */
function trackDynamicMouse() {
    mouseEnabledDoms = mouseEnabledDoms ?? document.querySelectorAll( '.dynamic-mouse' );
    mouseEnabledDoms.forEach( dom => dom.style.zIndex = dom.classList.contains('overlay-container') ? dom.style.zIndex : undefined );
    let mouseCoords = getMouseUpdate();

    // If the mouse is over a dynamic-mouse element, then we want to set the mouse events to be handled.
    let mouseEnabled = false;
    
    for ( let i = 0; i < mouseEnabledDoms.length; i++ ) {
        const dom = mouseEnabledDoms[i];
        // If the dom is a child of .no-mouse, then we want to ignore it.
        if ( dom.closest( '.no-mouse' ) ) {
            continue;
        }
        let rect = dom.getBoundingClientRect();
        if ( (rect.x - origin.x) <= mouseCoords.x && (rect.x - origin.x) + rect.width >= mouseCoords.x && (rect.y - origin.y) <= mouseCoords.y && (rect.y - origin.y) + rect.height >= mouseCoords.y ) {
            setHandleMouseEvents();
            mouseEnabled = true;
            dom.style.zIndex = dom.classList.contains('overlay-container') ? dom.style.zIndex : mouseZIndex;
            break;
        }
    }

    // Otherwise, we want to ignore mouse events.
    if ( mouseEnabled === false ) {
        setIgnoreMouseEvents();
    }

    _intervalCount++;
    if ( _intervalCount > (_domRefreshMs / _intervalMs) ) {
        mouseEnabledDoms = undefined;
        _intervalCount = 0;
    }
}










const MouseUtilities = {
    mouseEnabled: mouseEnabled,
    dynamicMouseIntervalId: dynamicMouseIntervalId,
    /**
     * Enables dynamic mouse tracking.
     * @param {{x: number, y: number}} screenOrigin The screen coordinates of the origin of the window.
     */
    trackDynamicMouse: ( screenOrigin ) => {
        origin = screenOrigin;
        mouseEnabledDoms = undefined;
        _intervalCount = 0;
        dynamicMouseIntervalId = window.setInterval( trackDynamicMouse, 33 );
    },
    /**
     * Disables dynamic mouse tracking.
     */
    stopTrackingDynamicMouse: () => {
        window.clearInterval( dynamicMouseIntervalId );
        dynamicMouseIntervalId = null;
    },
    getMouseUpdate: getMouseUpdate,
    setHandleMouseEvents: setHandleMouseEvents,
    setIgnoreMouseEvents: setIgnoreMouseEvents,
    /**
     * Refreshes the dom elements that are being tracked for mouse events, immediately enabling/disabling mouse events.
     */
    refreshDom: () => {
        mouseEnabledDoms = undefined;
        _intervalCount = 0;
    }
};

module.exports = MouseUtilities;
