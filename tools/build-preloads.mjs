// Bundles the preloads of the sandboxed windows.
//
// A sandboxed window's preload can only load a few built-in modules
// (electron, events, timers and url), so each one is bundled with the Nag
// modules it uses into src/electron/preloaders/build, which the windows load.
//
// Run with `npm run build:preloads`.  `npm start` and the build scripts run it.
// Release builds remove perf-taps.js before running this, so it isn't bundled.
import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const preloaders = path.join( root, 'src', 'electron', 'preloaders' );

// The preloads of the sandboxed windows.  The log watchers, combat watcher,
// log backup and death recap need Node, so they load their preloads as they are.
const sandboxed = [ 'main', 'renderer', 'scraper-eqsr' ];

const result = await esbuild.build( {
    entryPoints: sandboxed.map( name => path.join( preloaders, `${name}.js` ) ),
    outdir: path.join( preloaders, 'build' ),
    bundle: true,
    platform: 'browser',
    format: 'cjs',
    target: 'chrome140',
    // Provided by Electron in the sandbox.
    // fs, path and perf_hooks are only loaded by the main process's half of
    // perf-taps.js, which never runs in a window.
    external: [ 'electron', 'fs', 'path', 'perf_hooks' ],
    // Handlebars uses Node's `global`, which windows don't have.
    define: { global: 'globalThis' },
    logLevel: 'warning',
    // Kept readable, since these are what show in the windows' dev tools.
    minify: false,
    sourcemap: false,
    legalComments: 'inline',
    banner: { js: '// Built by tools/build-preloads.mjs from src/electron/preloaders.  Don\'t edit; edit the source and run npm run build:preloads.' },
    metafile: true,
} );

// A preload that loads a module the sandbox doesn't have fails when its
// window opens, so fail here instead.  Only the modules above are allowed, and
// perf.js's optional files, which it loads in a try block (they're missing
// from most builds, so esbuild leaves them unbundled).
const allowed = new Set( [ 'electron', 'fs', 'path', 'perf_hooks', './perf-always-on.json', './perf-taps' ] );
const unexpected = new Set();
for ( const input of Object.values( result.metafile.inputs ) ) {
    for ( const imported of input.imports ) {
        if ( imported.external && !allowed.has( imported.path ) ) {
            unexpected.add( imported.path );
        }
    }
}
if ( unexpected.size > 0 ) {
    console.error( `The sandboxed preloads load modules the sandbox doesn't have: ${[ ...unexpected ].join( ', ' )}` );
    process.exit( 1 );
}

console.log( `Bundled the preloads: ${sandboxed.join( ', ' )}` );
