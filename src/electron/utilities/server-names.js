/**
 * The server name stored for The Heroes Journey characters.  The version 13
 * character migration set this name, so it's the one existing characters use.
 */
const thjServerName = 'The Heroes Journey';

/** Matches the names THJ has been stored under, and its log file suffix. */
const thjNameRegex = /^(thj|the hero'?e?'?s journey)$/i;

/**
 * Returns the name a server is stored and compared by.  Server names are
 * compared exactly (combat data, pets, "my characters"), so the same server
 * must always be stored the same way.  Log files name the server in lower
 * case (eqlog_Name_frostreaver.txt), so other servers are stored in lower
 * case; the character list capitalizes them for display.
 *
 * @param {string|null|undefined} serverName The server name, as entered or read from a log file name.
 * @returns {string|null|undefined} Returns the stored form of the name.  Empty names are returned as they are.
 */
function normalizeServerName( serverName ) {
    if ( typeof serverName !== 'string' ) {
        return serverName;
    }
    const trimmed = serverName.trim();
    if ( thjNameRegex.test( trimmed ) ) {
        return thjServerName;
    }
    return trimmed.toLowerCase();
}

module.exports = { normalizeServerName, thjServerName };
