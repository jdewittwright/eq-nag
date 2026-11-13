// The log watcher runs here, in the preload, instead of in the page.
//
// The page has no Node access and loads no scripts (see log-watcher.html), so
// nothing that reaches its DOM from a log line can run code with Node access.
// This preload still has Node access, because the log watcher reads log files.
// It runs in a window, not a utility process, because it speaks and plays
// sounds, which need speechSynthesis and Audio.
const params = new URLSearchParams( window.location.search );
const LogWatcher = require( '../threads/log-watcher' );

// URLSearchParams has already decoded the values; decoding them again would change any % in them.
LogWatcher( JSON.parse( params.get( 'character' ) ), +params.get( 'logPosition' ) );
