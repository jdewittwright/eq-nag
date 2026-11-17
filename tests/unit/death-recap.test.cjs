// Tests for loading the death recap from made-up logs. Electron is replaced with a small stub.
const Module = require( 'module' );
const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );

const { check, finish, abort } = require( '../lib/report.cjs' );

const appDir = path.resolve( __dirname, '../..' );
const tmp = fs.mkdtempSync( path.join( os.tmpdir(), 'nag-recap-' ) );
const electronStub = {
    ipcRenderer: { on() {}, send() {}, invoke: () => new Promise( () => {} ) },
};
// The parser times encounters with window's timers.
global.window = { setTimeout, clearTimeout, setInterval, clearInterval };
const load = Module._load;
Module._load = function ( r, ...a ) {
    if ( r === 'electron' ) return electronStub;
    return load.call( this, r, ...a );
};
// The combat parser logs to the console when it starts.
console.log = ( log => ( ...a ) => typeof a[ 0 ] === 'object' && a[ 0 ]?.label === 'Combat Parser' ? null : log( ...a ) )( console.log );

// Windows may still hold a log open for a moment after it's read.
const removeTmp = () => { try { fs.rmSync( tmp, { recursive: true, force: true, maxRetries: 5 } ); } catch {} };

const { CombatParser } = require( path.join( appDir, 'src/electron/utilities/combat-parser.js' ) );

/** Writes a log with one line per entry, each stamped one second after the last. */
const writeLog = ( name, entries, ending = '\n' ) => {
    const file = path.join( tmp, name );
    const start = new Date( 2026, 10, 13, 20, 0, 0 );
    const stamp = n => new Date( start.getTime() + n * 1000 ).toString().slice( 0, 24 );
    fs.writeFileSync( file, entries.map( ( e, i ) => `[${stamp( i )}] ${e}` ).join( '\n' ) + ending );
    return file;
};

/** Writes a log from [ seconds after the start, text ] pairs. */
const writeTimedLog = ( name, entries, start = new Date( 2026, 10, 13, 20, 0, 0 ) ) => {
    const file = path.join( tmp, name );
    const stamp = n => new Date( start.getTime() + n * 1000 ).toString().slice( 0, 24 );
    fs.writeFileSync( file, entries.map( ( [ n, e ] ) => `[${stamp( n )}] ${e}` ).join( '\n' ) + '\n' );
    return file;
};
const damages = r => JSON.stringify( r.data?.myDeathLog?.map( e => e.damage ) );

/** Loads the death recap, failing if it doesn't finish in time. */
const recap = ( file, lineNo = null, parser = new CombatParser( 'Testchar', 'testserver' ) ) => new Promise( ( resolve, reject ) => {
    const timer = setTimeout( () => reject( new Error( `The death recap for ${path.basename( file )} never finished` ) ), 5000 );
    parser.loadDeathRecap( file, lineNo, 'Testchar', ( data, failure, error ) => {
        clearTimeout( timer );
        resolve( { data, failure, error } );
    } );
} );

const fight = [
    'You have entered The Plane of Testing.',
    'A test golem hits YOU for 120 points of damage.',
    'You slash a test golem for 80 points of damage.',
    'A test golem hits YOU for 140 points of damage.',
    'A test golem crushes YOU for 300 points of damage.',
];

( async () => {

    // --== A death in the first chunk ==--
    let file = writeLog( 'first-chunk.txt', [ ...fight, 'You have been slain by a test golem!' ] );
    let r = await recap( file );
    check( 'A death in the first chunk of the log gives a recap', r.data != null && r.failure == null, r.error?.stack ?? r.failure );
    check( 'The recap lists the damage taken', r.data?.myDeathLog?.some( e => e.damage === 300 && e.actor === 'A test golem' ) );
    check( 'The recap lists the damage sources', r.data?.damageSources?.some( e => e.source === 'A test golem' ) );

    // --== A death on the last line, with no line break after it ==--
    file = writeLog( 'no-final-break.txt', [ ...fight, 'You have been slain by a test golem!' ], '' );
    r = await recap( file );
    check( 'A death on the last line with no line break after it gives a recap', r.data?.myDeathLog?.some( e => e.damage === 300 ), r.error?.stack ?? r.failure );

    // --== A self DoT before the death ==--
    file = writeLog( 'self-dot.txt', [ ...fight, 'You have taken 250 damage from Venom of the Tester.', 'You have been slain by a test golem!' ] );
    r = await recap( file );
    check( 'A self DoT before the death gives a recap', r.data != null && r.failure == null, r.error?.stack ?? r.failure );
    check( 'The recap still lists the other damage', r.data?.myDeathLog?.some( e => e.damage === 300 ) );

    // --== The latest of several deaths, across chunks ==--
    const several = [];
    for ( let i = 0; i < 300; i++ ) several.push( ...fight, 'You have been slain by a test golem!' );
    several.push( 'An older golem hits YOU for 777 points of damage.', 'You have been slain by an older golem!' );
    file = writeLog( 'several.txt', several );
    let small = new CombatParser( 'Testchar', 'testserver' );
    small.chunkSize = 16384; small.chunks = 1;
    r = await recap( file, null, small );
    check( 'The latest death is used when the log is read in several chunks', r.data?.myDeathLog?.some( e => e.damage === 777 ), r.error?.stack ?? r.failure );

    small = new CombatParser( 'Testchar', 'testserver' );
    small.chunkSize = 16384; small.chunks = 1;
    r = await recap( file, 6, small );
    check( 'A given line number in the first chunk gives a recap', r.data?.myDeathLog?.some( e => e.damage === 300 ), r.error?.stack ?? r.failure );

    let found = await new Promise( resolve => small.findAllDeaths( file, f => resolve( f ) ) );
    check( 'Every death is found, with the right line numbers', found.length === 301 && found[ 0 ].lineNo === 6 && found[ 300 ].lineNo === several.length, `${found.length} found` );

    file = writeLog( 'quiet-death.txt', [ 'You have entered The Plane of Testing.', 'You have been slain by a test golem!' ] );
    r = await recap( file );
    check( 'A death with no combat before it gives an empty recap', r.data != null && r.data.myDeathLog.length === 0 && r.data.damageSources.length === 0, r.error?.stack ?? r.failure );

    // --== Where the fight starts ==--
    // Like a real log: an old session's fight, months before the one that killed you.
    file = writeTimedLog( 'months-apart.txt', [
        [ 0, 'An old guard punches YOU for 111 points of damage.' ],
        [ 1, 'You have entered East Freeport.' ],
        [ 86400 * 77, 'You have entered West Freeport.' ],
        [ 86400 * 77 + 20, 'A new guard punches YOU for 175 points of damage.' ],
        [ 86400 * 77 + 20, 'You have been slain by a new guard!' ],
    ] );
    r = await recap( file );
    check( 'A fight long before the death is left out', damages( r ) === '[175]', damages( r ) );

    file = writeTimedLog( 'previous-death.txt', [
        [ 0, 'A guard punches YOU for 111 points of damage.' ],
        [ 1, 'You have been slain by a guard!' ],
        [ 20, 'A guard punches YOU for 175 points of damage.' ],
        [ 21, 'You have been slain by a guard!' ],
    ] );
    r = await recap( file );
    check( 'The fight starts after your previous death', damages( r ) === '[175]', damages( r ) );

    file = writeTimedLog( 'fell.txt', [
        [ 0, 'A guard punches YOU for 111 points of damage.' ],
        [ 1, 'You have fallen to your death!' ],
        [ 20, 'A guard punches YOU for 175 points of damage.' ],
        [ 21, 'You have been slain by a guard!' ],
    ] );
    r = await recap( file );
    check( 'Falling to your death also counts as a previous death', damages( r ) === '[175]', damages( r ) );

    // Hits 50 seconds apart for five minutes, with chat in between.
    const longFight = [];
    for ( let t = 0; t <= 300; t += 50 ) {
        longFight.push( [ t, `A slow golem hits YOU for ${100 + t} points of damage.` ] );
        longFight.push( [ t + 10, "Someone tells General1:2, 'LFG'" ] );
    }
    longFight.push( [ 301, 'You have been slain by a slow golem!' ] );
    r = await recap( writeTimedLog( 'long-fight.txt', longFight ) );
    check( 'A long fight with no minute-long lull is kept whole', r.data?.myDeathLog?.length === 7, damages( r ) );

    // Two minutes of chat between the fights doesn't join them.
    const chatty = [ [ 0, 'A golem hits YOU for 111 points of damage.' ] ];
    for ( let t = 5; t <= 120; t += 5 ) chatty.push( [ t, "Someone tells General1:2, 'WTS stuff'" ] );
    chatty.push( [ 125, 'A golem hits YOU for 175 points of damage.' ], [ 126, 'You have been slain by a golem!' ] );
    r = await recap( writeTimedLog( 'chatty.txt', chatty ) );
    check( 'Chat between two fights does not join them', damages( r ) === '[175]', damages( r ) );

    file = writeTimedLog( 'others.txt', [
        [ 0, 'A golem hits YOU for 111 points of damage.' ],
        [ 30, 'A golem hits Someone for 50 points of damage.' ],
        [ 70, 'A golem hits Someone for 50 points of damage.' ],
        [ 90, 'A golem hits YOU for 175 points of damage.' ],
        [ 91, 'You have been slain by a golem!' ],
    ] );
    r = await recap( file );
    check( 'Only combat to or from you keeps the fight going', damages( r ) === '[175]', damages( r ) );

    // From Sunday into Monday, which sort the wrong way as text.
    file = writeTimedLog( 'midnight.txt', [
        [ 0, 'A golem hits YOU for 111 points of damage.' ],
        [ 20, 'A golem hits YOU for 222 points of damage.' ],
        [ 21, 'You have been slain by a golem!' ],
    ], new Date( 2026, 10, 15, 23, 59, 50 ) );
    r = await recap( file );
    check( 'A fight past midnight stays in order', damages( r ) === '[111,222]', damages( r ) );

    // --== No deaths ==--
    file = writeLog( 'no-deaths.txt', fight );
    r = await recap( file );
    check( 'A log with no deaths says so', r.data == null && r.failure === 'no-deaths', r.failure );

    file = path.join( tmp, 'empty.txt' );
    fs.writeFileSync( file, '' );
    r = await recap( file );
    check( 'An empty log says there are no deaths', r.data == null && r.failure === 'no-deaths', r.failure );

    // --== Problems ==--
    r = await recap( path.join( tmp, 'missing.txt' ) );
    check( 'A missing log says it could not be read', r.data == null && r.failure === 'read-error' && r.error != null, r.failure );

    r = await recap( path.join( tmp, 'missing.txt' ), 5 );
    check( 'A missing log with a line number says it could not be read', r.data == null && r.failure === 'read-error', r.failure );

    found = await new Promise( resolve => new CombatParser( 'Testchar', 'testserver' ).findAllDeaths( path.join( tmp, 'missing.txt' ), ( f, e ) => resolve( { f, e } ) ) );
    check( 'Searching a missing log for deaths finishes with an error', found.f.length === 0 && found.e != null );

    r = await recap( writeLog( 'short.txt', fight ), 500 );
    check( 'A line number past the end of the log says the death was not found', r.data == null && r.failure === 'not-found', r.failure );

    const broken = new CombatParser( 'Testchar', 'testserver' );
    broken._getDeathRecapModel = () => { throw new Error( 'test failure' ); };
    r = await recap( writeLog( 'broken.txt', [ ...fight, 'You have been slain by a test golem!' ] ), null, broken );
    check( 'An error while parsing finishes with the error', r.data == null && r.failure === 'error' && r.error?.message === 'test failure', r.failure );

    const parser = new CombatParser( 'Testchar', 'testserver' );
    let model = null, error = null;
    try { model = parser._processDeathRecapLines( [ null, undefined, ...fight.map( l => `[Fri Nov 13 20:00:00 2026] ${l}` ) ] ); } catch ( e ) { error = e; }
    check( 'Missing lines are skipped when parsing', model != null && error == null, error?.stack );

    removeTmp();
    finish();
} )().catch( error => {
    removeTmp();
    abort( error );
} );
