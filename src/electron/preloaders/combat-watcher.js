// The combat watcher runs here, in the preload, instead of in the page.
//
// The page has no Node access and loads no scripts (see combat-watcher.html),
// so nothing that reaches its DOM from a log line can run code with Node access.
// This preload still has Node access, because the combat watcher reads log files.
const CombatWatcher = require( '../threads/combat-watcher' );

CombatWatcher();

// The end-to-end tests send messages from this window over the DevTools
// protocol, in this preload's world (the page can't reach it).
if ( process.env.NAG_E2E === '1' ) {
    globalThis.require = require;
}
