// The log backup runs here, in the preload, instead of in the page.
//
// The page has no Node access and loads no scripts (see log-backup.html).
// This preload still has Node access, because the backup reads and zips log files.
const params = new URLSearchParams( window.location.search );
const LogBackup = require( '../threads/log-backup' );

// URLSearchParams has already decoded the values; decoding them again would change any % in them.
LogBackup( JSON.parse( params.get( 'logFiles' ) ), params.get( 'eqFolder' ), JSON.parse( params.get( 'daysOfWeek' ) ), params.get( 'i' ) );
