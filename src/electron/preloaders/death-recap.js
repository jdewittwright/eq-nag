// The death recap runs here, in the preload's world, and the page gets nothing.
// The death recap module isn't handed to the page, so the page can't call it.
//
// This window isn't sandboxed yet: the death recap reads the log file itself,
// which needs Node.
window.addEventListener( 'DOMContentLoaded', () => {
    const DeathRecap = require( '../windows/death-recap' );
    const params = new URLSearchParams( window.location.search );
    const lineNo = params.get( 'lineNo' ) === 'last' ? null : +params.get( 'lineNo' );
    // URLSearchParams has already decoded the values; decoding them again would change any % in them.
    DeathRecap( params.get( 'logFilePath' ), lineNo > 0 || lineNo === null ? lineNo : -1, params.get( 'messageId' ), params.get( 'characterName' ), params.get( 'serverName' ), params.get( 'takp' ) === '1' );
} );
