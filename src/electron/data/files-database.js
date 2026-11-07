const electron = require( 'electron' );
const { app, BrowserWindow, ipcMain } = require( "electron" );
const path = require( 'path' );
const fs = require( 'fs' );
const Store = require( './store' );
const _ = require( 'lodash' );
const ForwardRef = require( '../forward-ref' );
const customAlphabet = require( 'nanoid' ).customAlphabet;
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const idLen = 16;
const nanoid = customAlphabet( alphabet, 16 );
const ArrayUtilities = require( '../utilities/arrays' );
const StringUtilities = require( "../utilities/string" );
const Fuse = require( 'fuse.js' );
const { MediaTypes, FileModel, PackageFileModel } = require( './models/trigger' );
const log = require( 'electron-log' );
const { createHash } = require( 'crypto' );

const eqSpellPages = 63;
const eqIconPageSize = 256;
const eqIconSize = 40;
const filesFolder = 'resource-files';

// Audio types that can be installed from a shared package.  WAV is accepted
// here so packages made from GINA imports still install; it can't be uploaded
// from Nag (see storeFile).
const packageFileExtensions = new Set( [ '.mp3', '.ogg', '.m4a', '.opus', '.webm', '.aac', '.wav' ] );
const fileIdRegex = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Returns the given path in a form that can be compared: absolute, and
 * ignoring case on Windows, where paths aren't case sensitive.
 *
 * @param {string} filePath The path.
 */
function comparablePath( filePath ) {
    const resolved = path.resolve( filePath );
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

/**
 * Returns true if the two files have the same contents.  Returns false if
 * either can't be read.
 *
 * @param {string} fileA The first file.
 * @param {string} fileB The second file.
 */
function sameContents( fileA, fileB ) {
    try {
        if ( fs.statSync( fileA ).size !== fs.statSync( fileB ).size ) {
            return false;
        }
        const hash = file => createHash( 'sha256' ).update( fs.readFileSync( file ) ).digest( 'hex' );
        return hash( fileA ) === hash( fileB );
    } catch {
        return false;
    }
}

class FilesDatabaseStore extends Store {

    /** 
     * The data store for this object.
     * @type {{files: FileModel[]}}
     * */
    #data;

    #filePath;

    constructor() {
        super( {
            configName: "files-database",
            defaults: { files: [] },
        } );
        
        this.#data = this.parseDataFile();

        let userDataPath = ( electron.app || electron.remote.app ).getPath( 'userData' );
        this.#filePath = path.join( userDataPath, filesFolder );

        if ( !fs.existsSync( this.#filePath ) ) {
            fs.mkdir( this.#filePath, () => { } );
        }
    }
    








    
    /**
     * Attaches store events to ipc main and dispatches react events to the main window.
     * 
     * @param {ForwardRef} mainWindowRef The main window of the application.
     */
    attachIpcEvents( mainWindowRef ) {

        ipcMain.on( 'audio-file:save',
            /**
             * Saves the posted file to the store and returns the id of the file.
             * 
             * @param {import('electron').IpcMainEvent} event 
             * @param {{name: string, arrayBuffer: ArrayBuffer}} file 
             */
            ( event, file ) => {
                var buffer = Buffer.from( file.arrayBuffer );
                let fileId = this.storeFile( buffer, file.name );
                event.sender.send( 'audio-file:save', fileId );
            } );

        ipcMain.on( 'audio-file:import', ( event, filename ) => {
            let fileId = this.storeFileByName( filename );
            event.sender.send( 'audio-file:import', fileId );
        } );

        ipcMain.on( 'audio-file:get:url', ( event, fileId ) => {
            let url = this.getAudioFileUrl( fileId );
            event.sender.send( 'audio-file:get:url', url );
        } );

        ipcMain.on( 'audio-file:get', ( event ) => {
            event.sender.send( 'audio-file:get', this.getAudioFiles() );
        } );

        ipcMain.on( 'audio-file:getData', ( event ) => {
            event.sender.send( 'audio-file:getData', this.getAudioFileData() );
        } );

        ipcMain.on( 'file:importFromPackage', ( event, packageFile ) => {
            event.sender.send( 'file:importFromPackage', this.importPackageFile( packageFile ) );
        } );

    }









    
    /**
     * Returns a file URL for the specified file.
     * 
     * @param {string} fileId The id of the desired file.
     */
    getAudioFileUrl( fileId ) {
        let file = _.find( this.#data.files, f => f.fileId === fileId );
        if ( file ) {
            return `file://${file.physicalName}`;
        }
    }









    
    /**
     * Saves the posted file to the store.
     * 
     * @returns {string|null} Returns the id of the file.
     * 
     * @param {Buffer} buffer The file data.
     * @param {string} name The name of the file.
     */
    storeFile( buffer, name ) {

        const allowedExtensions = new Set( [
            // Only formats that are mp3 or better (smaller size vs quality)
            '.mp3', '.ogg', '.m4a', '.opus', '.webm', '.aac'
        ] );

        const ext = path.extname( name ).toLowerCase();
        if ( !allowedExtensions.has( ext ) )
            return null;
        
        let id = nanoid();
        let model = new FileModel();
        
        model.fileId = id;
        model.mediaType = MediaTypes.Audio;
        model.fileName = name;
        model.physicalName = path.join( this.#filePath, `${id}${path.extname( name )}` );

        fs.writeFile( model.physicalName, buffer, () => { } );

        this.#data.files.push( model );
        this.storeDataFile( this.#data );

        return id;
    }









    
    /**
     * Removes the specified file.
     * 
     * @param {string} fileId The id of the file to remove.
     */
    deleteFile( fileId ) {
        let file = _.remove( this.#data.files, f => f.fileId === fileId );

        if ( file?.length > 0 ) {
            if ( this.isInFilesFolder( file[ 0 ].physicalName ) ) {
                fs.unlink( file[ 0 ].physicalName, () => { } );
            }
            this.storeDataFile( this.#data );
        }
    }









    
    /**
     * Returns true if the given path is a file directly inside the files folder.
     * 
     * @param {string} physicalName The full path of the file.
     */
    isInFilesFolder( physicalName ) {
        return typeof physicalName === 'string' && path.dirname( path.resolve( physicalName ) ) === path.resolve( this.#filePath );
    }









    
    /**
     * Imports the given package file into the data store.
     * 
     * @param {PackageFileModel} file The package file to import.
     */
    importPackageFile( file ) {

        // The file id and name come from the package, so only an id made of
        // plain characters and a known audio extension may become a file name
        // in the files folder.
        const ext = path.extname( `${file?.fileName ?? ''}` ).toLowerCase();
        if ( !fileIdRegex.test( `${file?.fileId ?? ''}` ) || !packageFileExtensions.has( ext ) || typeof file.contents !== 'string' ) {
            log.warn( `[files-database:importPackageFile] Skipped package file with an invalid id or type: ${JSON.stringify( `${file?.fileName ?? ''}` )}` );
            return null;
        }

        // If the file exists, delete it and remove it from the data store.
        let existingIndex = this.#data.files.findIndex( f => f.fileId === file.fileId );
        if ( existingIndex > -1 ) {
            let existing = this.#data.files.splice( existingIndex, 1 )[ 0 ];
            if ( this.isInFilesFolder( existing.physicalName ) && fs.existsSync( existing.physicalName ) ) {
                fs.unlinkSync( existing.physicalName );
            }
        }

        let model = new FileModel();

        model.fileId = file.fileId;
        model.mediaType = +file.mediaType;
        model.fileName = file.fileName;
        model.physicalName = path.join( this.#filePath, `${file.fileId}${ext}` );

        fs.writeFile( model.physicalName, Buffer.from( file.contents, 'base64' ), () => { } );

        this.#data.files.push( model );
        this.storeDataFile( this.#data );

        return file.fileId;
    }









    
    /**
     * Stores the specified filename in the data store, copying the file that
     * exists on the computer into the files path.  A file that was already
     * copied is reused, so many triggers that play the same sound share one
     * copy of it.
     *
     * @param {string} filename The full path and name of the desired file.
     * @returns {string|undefined} Returns the id of the stored file, or undefined if it couldn't be stored.
     */
    storeFileByName( filename ) {

        if ( !filename ) {
            log.error( `[files-database:storeFileByName] Invalid filename: ${filename === undefined ? 'undefined' : filename === null ? 'null' : filename}` );
            return undefined;
        }

        const sourcePath = path.resolve( filename );
        const name = path.basename( sourcePath );
        const ext = path.extname( name ).toLowerCase();

        if ( !packageFileExtensions.has( ext ) ) {
            log.warn( `[files-database:storeFileByName] Skipped a file that isn't a supported sound type: ${sourcePath}` );
            return undefined;
        }

        // Reuse the copy of this exact file, if there is one.  Matching on the
        // name alone isn't enough: different sounds can share a name.
        const sourceKey = comparablePath( sourcePath );
        let existing = this.#data.files.find( f => f.sourcePath != null && comparablePath( f.sourcePath ) === sourceKey );

        // Files stored before source paths were recorded only have their name,
        // so one with the same name is reused only if its contents match too.
        if ( !existing ) {
            existing = this.#data.files.find( f => f.sourcePath == null && f.fileName === name && this.isInFilesFolder( f.physicalName ) && sameContents( f.physicalName, sourcePath ) );
            if ( existing ) {
                existing.sourcePath = sourcePath;
                this.storeDataFile( this.#data );
            }
        }

        if ( existing ) {
            return existing.fileId;
        }

        let id = nanoid();
        let model = new FileModel();

        model.fileId = id;
        model.mediaType = MediaTypes.Audio;
        model.fileName = name;
        model.physicalName = path.join( this.#filePath, `${id}${ext}` );
        model.sourcePath = sourcePath;

        // Copy before saving the entry, so a file that's missing or can't be
        // read doesn't leave an entry pointing at nothing.
        try {
            fs.copyFileSync( sourcePath, model.physicalName );
        } catch ( error ) {
            log.error( `[files-database:storeFileByName] Could not copy ${sourcePath}.`, error );
            return undefined;
        }

        this.#data.files.push( model );
        this.storeDataFile( this.#data );

        return id;
    }









    
    /**
     * Returns a list of all audio files int he store.
     */
    getAudioFiles() {
        return _.filter( this.#data.files, f => f.mediaType === MediaTypes.Audio );
    }










    /**
     * Returns all file with data, in base64 format, for all audio files.
     */
    getAudioFileData() {
        /** @type {PackageFileModel[]} */
        let files = _.filter( this.#data.files, f => f.mediaType === MediaTypes.Audio )
            .filter( f => fs.existsSync( f.physicalName ) )
            .map( f => {
                let m = new PackageFileModel();

                m.fileId = f.fileId;
                m.mediaType = f.mediaType;
                m.fileName = f.fileName;
                m.contents = fs.readFileSync( f.physicalName ).toString( 'base64' );

                return m;
            } );

        return files;
    }

}

module.exports = FilesDatabaseStore;