// Checks the windows' security settings by reading the source, so that a
// change can't quietly give a window Node access or turn its protections off.
// Nothing is run or loaded.
const fs = require( 'fs' );
const path = require( 'path' );

const { check, finish, abort } = require( '../lib/report.cjs' );

const appDir = path.resolve( __dirname, '../..' );
const read = file => fs.readFileSync( path.join( appDir, file ), 'utf-8' );

/** Every .js file under the folder, as paths relative to the app folder. */
function jsFiles( folder ) {
    const found = [];
    for ( const entry of fs.readdirSync( path.join( appDir, folder ), { withFileTypes: true } ) ) {
        const relative = path.posix.join( folder, entry.name );
        if ( entry.isDirectory() ) {
            if ( entry.name !== 'build' ) found.push( ...jsFiles( relative ) );
        } else if ( entry.name.endsWith( '.js' ) ) {
            found.push( relative );
        }
    }
    return found;
}

/**
 * The webPreferences blocks in the source, with the line each starts on.
 *
 * @returns {{file: string, line: number, text: string}[]}
 */
function webPreferenceBlocks( file ) {
    const source = read( file );
    const blocks = [];
    const start = /webPreferences\s*:\s*\{/g;
    let match;
    while ( ( match = start.exec( source ) ) ) {
        let depth = 1, i = match.index + match[ 0 ].length;
        while ( depth > 0 && i < source.length ) {
            if ( source[ i ] === '{' ) depth++;
            else if ( source[ i ] === '}' ) depth--;
            i++;
        }
        blocks.push( { file, line: source.slice( 0, match.index ).split( '\n' ).length, text: source.slice( match.index, i ) } );
    }
    return blocks;
}

try {
    const sources = [ 'main.js', ...jsFiles( 'src/electron' ) ];

    // --== Windows ==--
    const blocks = sources.flatMap( webPreferenceBlocks );
    check( 'Found the windows', blocks.length >= 14, blocks.length );

    // The worker windows share one function, which these checks also cover.
    const workerPrefs = read( 'src/electron/log-bootstrap.js' ).match( /function workerWebPreferences[\s\S]*?\n\}/ )?.[ 0 ] ?? '';
    const where = b => `${b.file}:${b.line}`;
    const all = [ ...blocks.map( b => ( { where: where( b ), text: b.text } ) ), { where: 'workerWebPreferences', text: workerPrefs } ]
        .filter( b => !/^webPreferences\s*:\s*\{\s*workerWebPreferences\(/.test( b.text ) );

    for ( const b of all ) {
        check( `No Node in the page (${b.where})`, /nodeIntegration\s*:\s*false/.test( b.text ) );
        check( `Context isolation (${b.where})`, /contextIsolation\s*:\s*true/.test( b.text ) );
        check( `Web security stays on (${b.where})`, !/webSecurity\s*:\s*false/.test( b.text ) );
    }

    // Only these preloads need Node, so only their windows may skip the sandbox.
    const unsandboxedPreloads = [ 'death-recap', '${worker}' ];
    for ( const b of all ) {
        const preload = b.text.match( /preloaders['`\/,\s]+(?:build\/)?([\w${}-]+)\.js/ )?.[ 1 ];
        if ( /sandbox\s*:\s*false/.test( b.text ) ) {
            check( `Only windows whose preload needs Node skip the sandbox (${b.where})`, unsandboxedPreloads.includes( preload ), preload );
        } else {
            check( `Sandboxed (${b.where})`, /sandbox\s*:\s*true/.test( b.text ) );
            check( `A sandboxed window loads a bundled preload (${b.where})`, /preloaders\/build\//.test( b.text ) );
        }
    }

    // --== @electron/remote ==--
    const remoteUsers = sources.filter( f => /@electron\/remote|electron\.remote\b/.test( read( f ).replace( /^\s*\/\/.*$/gm, '' ) ) );
    check( 'Nothing uses @electron/remote', remoteUsers.length === 0, remoteUsers.join( ', ' ) );
    const pkg = JSON.parse( read( 'package.json' ) );
    check( '@electron/remote isn\'t a dependency', !pkg.dependencies[ '@electron/remote' ] );

    // --== Worker pages ==--
    for ( const page of [ 'log-watcher', 'combat-watcher', 'log-backup' ] ) {
        const html = read( `src/electron/threads/${page}.html` );
        check( `The ${page} page runs no scripts`, !/<script/i.test( html ) );
        check( `The ${page} page blocks scripts`, /Content-Security-Policy[^>]*default-src 'none'/.test( html ) && !/script-src/.test( html ) );
        check( `The ${page} preload exists`, fs.existsSync( path.join( appDir, `src/electron/preloaders/${page}.js` ) ) );
    }

    // --== Preloads ==--
    for ( const file of jsFiles( 'src/electron/preloaders' ) ) {
        const source = read( file );
        const exposed = source.match( /exposeInMainWorld\([\s\S]*$/ )?.[ 0 ] ?? '';
        check( `${file} hands the page no modules`, !/require\s*\(/.test( exposed ) );
    }

    // --== Settings ==--
    const prefs = read( 'src/electron/data/user-preferences.js' );
    const list = prefs.match( /const genericSettingKeys = Object\.freeze\( \[([\s\S]*?)\] \);/ )?.[ 1 ] ?? '';
    const keys = [ ...list.matchAll( /'(\w+)'/g ) ].map( m => m[ 1 ] );
    check( 'Found the setting keys windows can use', keys.length > 0 );
    for ( const key of keys ) {
        check( `Setting ${key} has a getter and a setter`, new RegExp( `\\bget ${key}\\(\\)` ).test( prefs ) && new RegExp( `\\bset ${key}\\(` ).test( prefs ) );
    }

    const enumSource = read( 'src/app/core.model.ts' ).match( /export enum SettingsKeys \{([\s\S]*?)\}/ )?.[ 1 ] ?? '';
    const enumKeys = [ ...enumSource.matchAll( /=\s*'(\w+)'/g ) ].map( m => m[ 1 ] );
    const missing = enumKeys.filter( k => !keys.includes( k ) );
    check( 'Every SettingsKeys value is allowed', enumKeys.length > 0 && missing.length === 0, missing.join( ', ' ) );

    for ( const handler of [ /ipcMain\.on\( 'settings:set',[\s\S]*?this\[ arg\.key \] = arg\.value/, /ipcMain\.handle\( 'settings:get',[\s\S]*?return this\[ arg\.key \]/, /ipcMain\.on\( 'settings:get',[\s\S]*?this\[ arg\.key \] \)/ ] ) {
        const body = prefs.match( handler )?.[ 0 ] ?? '';
        check( `${handler.source.slice( 0, 40 ).replace( /\\/g, '' )}... checks the key first`, /isGenericSettingKey\( arg\?\.key \)/.test( body ) );
    }
} catch ( error ) {
    abort( error );
}

finish();
