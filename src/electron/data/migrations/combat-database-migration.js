const path = require( 'path' );
const { CombatDb } = require( '../models/combat-parser' );
const { backupDatafile } = require( './backup-data-file' );
const { normalizeServerName } = require( '../../utilities/server-names' );
const fs = require( 'fs' );
const fsp = fs.promises;
const electron = require( 'electron' );

const combatDbVersion = 3;

/**
 * Merges server records whose names differ only in how they were written
 * (e.g. "FROSTREAVER" and "frostreaver"), and stores every server name in its
 * normal form.  Characters picked from the log file list were saved with their
 * server in upper case, so their combat data went to a separate record.
 * Where both records have an entry for the same player or pet, the record that
 * already used the normal name wins.
 *
 * @param {CombatDb} data The combat database.
 */
function mergeServersByNormalName( data ) {
    /** @type {Record<string, any>} */
    const merged = {};

    // Records already using the normal name go first, so their entries win.
    const servers = ( data.servers ?? [] ).filter( s => s != null );
    const ordered = [
        ...servers.filter( s => s.server === normalizeServerName( s.server ) ),
        ...servers.filter( s => s.server !== normalizeServerName( s.server ) ),
    ];

    for ( const server of ordered ) {
        const name = normalizeServerName( server.server );
        const target = merged[ name ];
        if ( !target ) {
            server.server = name;
            merged[ name ] = server;
            continue;
        }
        target.verifiedPlayers = { ...( server.verifiedPlayers ?? {} ), ...( target.verifiedPlayers ?? {} ) };
        target.petOwners = { ...( server.petOwners ?? {} ), ...( target.petOwners ?? {} ) };
        target.verifiedNpcs = [ ...new Set( [ ...( target.verifiedNpcs ?? [] ), ...( server.verifiedNpcs ?? [] ) ] ) ];
        target.verifiedPets = [ ...new Set( [ ...( target.verifiedPets ?? [] ), ...( server.verifiedPets ?? [] ) ] ) ];
    }

    // Keep the records in their original order.
    data.servers = servers.filter( s => merged[ s.server ] === s );

    data.encounters?.forEach( encounter => {
        if ( encounter ) {
            encounter.serverName = normalizeServerName( encounter.serverName );
        }
    } );
}

/**
 * 
 * @param {CombatDb} data 
 * @param {string} configName
 * @param {(data: CombatDb) => void} migrationComplete Callback executed when data migration succeeds.
 */
function migrateCombatData( data, configName, migrationComplete ) {
    
    if ( !data.version || data.version < combatDbVersion ) {
        backupDatafile( configName, () => {
            executeDataMigration( data ).then( migrationsPerformed => {
                if ( migrationsPerformed ) {
                    migrationComplete( data );
                }
            } );
        } );
    }

}

/**
 * Performs the data migration.
 * 
 * @returns {Promise<boolean>} Returns true if any migration was performed.
 * 
 * @param {CombatDb} data 
 */
async function executeDataMigration( data ) {
    let startVersion = data.version ?? 0;

    if ( !data.version || data.version < 2 ) {
        
        // We are changing the combat data storage.  If there is any data in
        // the store folder, we need to delete the files.
        
        const userDataPath = electron.app.getPath( 'userData' );
        const encountersPath = path.join( userDataPath, 'encounters' );
        const pathExists = fs.existsSync( encountersPath );

        if ( pathExists ) {

            // Grab all of the .json files in the encounters folder and delete them.
            const files = await fsp.readdir( encountersPath );

            for ( const file of files ) {
                if ( file.endsWith( '.json' ) ) {

                    const jsonFullPath = path.join( encountersPath, file );

                    // Remove the encounter from the combat db.
                    let i = data.encounters.findIndex( f => f.filePath === jsonFullPath );

                    if ( i >= 0 ) {
                        data.encounters.splice( i, 1 );
                    }

                    // Delete the file.
                    await fsp.unlink( jsonFullPath );
                }
            }

            // Remove any encounters that are no longer valid.
            for ( let i = data.encounters.length - 1; i >= 0; i-- ) {
                if ( !fs.existsSync( data.encounters[ i ].filePath ) ) {
                    data.encounters.splice( i, 1 );
                }
            }
        }
        
        data.version = 2;
    }
    if ( !data.version || data.version < 3 ) {
        mergeServersByNormalName( data );
        data.version = 3;
    }

    return data.version !== startVersion;
}

module.exports = { migrateCombatData, combatDbVersion };
