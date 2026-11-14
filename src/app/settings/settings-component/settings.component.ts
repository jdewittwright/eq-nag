import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { DialogService } from 'src/app/dialogs/dialog.service';
import { IpcService } from 'src/app/ipc.service';
import { MatTable } from '@angular/material/table';
import { customAlphabet } from 'nanoid';
import { ActionTypes, CapturePhrase, DeathRecapPreferences, LogMaintenanceRules, LogMaintenancePlanTypes, OverlayWindowModel, TriggerAction, TriggerModel, ScheduledTask, Range, SettingsKeys, SharedTriggerPermissions, DpsMeterSettings } from 'src/app/core.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SetupService } from 'src/app/setup/setup.service';
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet( alphabet, 16 );
import * as _ from 'lodash-es';
import { CharactersListComponent } from 'src/app/characters-list/characters-list.component';
import { nagId } from 'src/app/core/nag-id.util';
import { DateUtilities } from 'src/app/utilities/date.utilities';
import { MathUtilities } from 'src/app/utilities/math.utilities';

interface IPhoneticTransform {
    id: string;
    originalText?: string;
    phoneticText?: string;
}

@Component( {
    selector: 'app-settings',
    templateUrl: 'settings.component.html',
    styleUrls: ['settings.component.scss', '../../core.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
} )
export class SettingsComponent implements OnInit {
    
    public phoneticTransforms: IPhoneticTransform[] = [];
    public phoneticTransformsModified: boolean = false;
    public version: string;
    public masterVolume: number = 100;
    public speechVolume: number = 100;
    public audioVolume: number = 100;
    public voiceOptions: SpeechSynthesisVoice[] = [];
    public voiceIndex: number = null;
    public loadingGinaConfig: boolean = false;
    public detrimentalOverlayId: string = null;
    public beneficialOverlayId: string = null;
    public alertOverlayId: string = null;
    public sharedTriggerPermissions: SharedTriggerPermissions = new SharedTriggerPermissions();
    public deathRecapPreferences: DeathRecapPreferences = new DeathRecapPreferences();
    /** The death recap mode last saved, to restore when creating a trigger is cancelled. */
    private savedDeathRecapEngageMode: DeathRecapPreferences['engageMode'] = null;
    public minimizeToTrayOnLoad: boolean = false;
    public glowOnStartup: boolean = true;
    public settingsKeys: typeof SettingsKeys = SettingsKeys;
    public logMaintenancePlanTypes: typeof LogMaintenancePlanTypes = LogMaintenancePlanTypes; 
    public logMaintenanceRules: LogMaintenanceRules = new LogMaintenanceRules();
    public logTime: string|null;
    public logDays: number[] = [];
    public allowPrerelease: boolean = false;
    public enableCheckWindowPosition: boolean = true;
    // public enableGpuAcceleration: boolean = false;
    public exampleSpeech: string = 'Hello, my name is nag.';
    public baseSpeakingRate: number = 1;
    public utter: SpeechSynthesisUtterance | undefined = undefined;
    public updatedSettings: string[] = [];

    public get timerOverlays(): OverlayWindowModel[] {
        return this.overlays?.filter( m => m.overlayType === 'Timer' );
    }

    public get alertOverlays(): OverlayWindowModel[] {
        return this.overlays?.filter( m => m.overlayType === 'Alert' );
    }

    private overlays: OverlayWindowModel[] = [];

    @Input() public characterList: CharactersListComponent;
    @ViewChild( 'combatStatisticsGroup', { static: true } ) public combatStatisticsGroup: ElementRef<HTMLFieldSetElement>;

    constructor(
        private readonly ipcService: IpcService,
        private readonly dialogService: DialogService,
        private readonly snackBar: MatSnackBar,
        private readonly setupService: SetupService,
    ) {
        speechSynthesis.onvoiceschanged = () => {
            this.voiceOptions = speechSynthesis.getVoices();
        };
    }

    ngOnInit() {

        this.ipcService.getAppVersion().subscribe( version => this.version = version );
        
        this.ipcService.tickReceived().subscribe( data => {
            this.masterVolume = data.masterVolume;
            this.speechVolume = data.speechVolume;
            this.audioVolume = data.audioVolume;
            this.baseSpeakingRate = data.baseSpeakingRate;
            this.voiceIndex = data.voiceIndex;
            this.overlays = data.overlays;
            
            this.phoneticTransforms = [];
            if ( data.phoneticTransforms ) {
                for ( let key of Object.keys( data.phoneticTransforms ) ) {
                    this.phoneticTransforms.push( { id: nanoid(), originalText: key, phoneticText: data.phoneticTransforms[ key ] } );
                }
            }

        } );

        this.loadSettings();
    }









    
    /**
     * Shows the update notes window.
     */
    showUpdateNotes(): void {
        this.ipcService.getAppVersion().subscribe( currentVersion => {
            this.ipcService.showUpdateNotesWindow( `v${currentVersion}` );
        } );
    }










    /**
     * Loads the settings data.
     */
    public loadSettings() {
        
        this.ipcService.getPhoneticTransforms().subscribe( transforms => {
            this.phoneticTransforms = [];
            if ( transforms ) {
                for ( let key of Object.keys( transforms ) ) {
                    this.phoneticTransforms.push( { id: nanoid(), originalText: key, phoneticText: transforms[ key ] } );
                }
            }
        } );

        this.ipcService.getOverlayWindows().subscribe( overlays => this.overlays = overlays );
        this.ipcService.getDetrimentalOverlayId().subscribe( id => this.detrimentalOverlayId = id );
        this.ipcService.getBeneficialOverlayId().subscribe( id => this.beneficialOverlayId = id );
        this.ipcService.getAlertOverlayId().subscribe( id => this.alertOverlayId = id );
        this.ipcService.getMinimizeToTrayOnLoad().subscribe( enabled => this.minimizeToTrayOnLoad = enabled );
        this.ipcService.getDeathRecapPreferences().subscribe( recapPrefs => {
            this.deathRecapPreferences = recapPrefs ?? new DeathRecapPreferences();
            // No mode saved (or an unknown one) means the death recap is off.
            if ( this.deathRecapPreferences.engageMode !== 'hotkey' && this.deathRecapPreferences.engageMode !== 'automatic' ) {
                this.deathRecapPreferences.engageMode = null;
            }
            this.savedDeathRecapEngageMode = this.deathRecapPreferences.engageMode;
        } );
        this.ipcService.getEnableGlowOnStartup().subscribe( f => this.glowOnStartup = f );

        this.ipcService.getSetting<boolean>( SettingsKeys.allowPrerelease ).subscribe( f => this.allowPrerelease = f );
        this.ipcService.getSetting<boolean>( SettingsKeys.enableCheckWindowPosition ).subscribe( f => this.enableCheckWindowPosition = f );

        // this.ipcService.getSetting<boolean>( SettingsKeys.enableGpuAcceleration ).subscribe( f => this.enableGpuAcceleration = f );
        this.ipcService.getSetting<LogMaintenanceRules>( SettingsKeys.logMaintenanceRules ).subscribe( f => {

            this.logMaintenanceRules = f;
            this.logTime = `${f.logSchedule?.hour ?? 0}:${f.logSchedule?.minute ?? 0}`;

            if ( f.logSchedule?.dayOfWeek instanceof Array ) {
                this.logDays = f.logSchedule.dayOfWeek;
            } else if (f.logSchedule?.dayOfWeek instanceof Range || (f.logSchedule?.dayOfWeek.hasOwnProperty('start') && f.logSchedule.dayOfWeek.hasOwnProperty('end'))) {
                this.logDays = Range.toArray( f.logSchedule.dayOfWeek as Range );
            } else if ( f.logSchedule?.dayOfWeek > 0 ) {
                this.logDays.push( +f.logSchedule.dayOfWeek );
            }

        } );
        this.ipcService.getSetting<SharedTriggerPermissions>( SettingsKeys.sharedTriggerPermissions ).subscribe( f => this.sharedTriggerPermissions = f ?? new SharedTriggerPermissions() );

    }

    public saveLogMaintenance(): void {

        if ( this.logMaintenanceRules.maintenancePlan === LogMaintenancePlanTypes.BySize ) {

            if ( !this.logMaintenanceRules.maxLogFileSizeMb || +this.logMaintenanceRules.maxLogFileSizeMb < 1 ) {
                this.logMaintenanceRules.maxLogFileSizeMb = 50;
            }

        } else if ( this.logMaintenanceRules.maintenancePlan === LogMaintenancePlanTypes.BySchedule ) {
            
            if ( !this.logTime && this.logDays.length > 0 ) {
                // If the user selects a day without selecting a time, default time is midnight.
                this.logTime = '12:00 AM';
            }

            if ( this.logTime ) {
                let logMaintenanceTime = DateUtilities.parseTimeString( this.logTime );
                this.logMaintenanceRules.logSchedule = new ScheduledTask();
                this.logMaintenanceRules.logSchedule.second = logMaintenanceTime.seconds;
                this.logMaintenanceRules.logSchedule.minute = logMaintenanceTime.minute;
                this.logMaintenanceRules.logSchedule.hour = logMaintenanceTime.hour;
                this.logMaintenanceRules.logSchedule.dayOfWeek = this.logDays;
            }

        }
        
        this.updateSetting( this.settingsKeys.logMaintenanceRules, this.logMaintenanceRules, 5 * 1000 );
    }









    
    /**
     * Generic setting update function.
     * 
     * @param key The setting key.
     * @param value The setting value.
     * @param delay Wait the given milliseconds before submitting changes.  If another change for the same key comes, the timeout is restarted.
     */
    public updateSetting<T>( key: SettingsKeys, value: T, delay: number = null, onExecuted: () => void = null ) {
        this.ipcService.updateSetting( key, value, delay, onExecuted );
        this.updatedSettings.push( key );
    }

    /**
     * Saves changes to the user preference.
     */
    onGlowOnStartupChanged(): void {
        this.ipcService.updateEnableGlowOnStartup( this.glowOnStartup );
    }










    /**
     * Saves changes to the user preference.
     */
    onMinimizeToTrayOnLoadChange(): void {
        this.ipcService.updateMinimizeToTrayOnLoad( this.minimizeToTrayOnLoad );
    }










    /**
     * Saves changes to the death recap preferences.
     * 
     * Off deletes the generated trigger. Hotkey and Automatic update the
     * generated trigger, or create a new one if there isn't one (or it was
     * deleted by hand).
     */
    onDeathRecapPrefsChange(): void {

        const engageMode = this.deathRecapPreferences.engageMode;

        if ( engageMode !== 'hotkey' && engageMode !== 'automatic' ) {
            this.turnOffDeathRecap();
            return;
        }
        
        let capturePhrase = new CapturePhrase();
        capturePhrase.phraseId = nagId();
        capturePhrase.requirePreviousPhrase = false;
        capturePhrase.useRegEx = true;
        capturePhrase.duration = null;

        if ( engageMode === 'hotkey' ) {
            this.deathRecapPreferences.hotkeyPhrase = '/hot "Death Recap" /em wonders how they died.';
            // Live servers prefix /emote messages with "~ "; emulators don't.
            capturePhrase.phrase = '^(?:~ )?${Character} wonders how they died\.$';

        } else {
            capturePhrase.phrase = '^You have been slain by (?<slayer>[^!]*)!$';
            this.deathRecapPreferences.hotkeyPhrase = null;
        }

        /** Points the given trigger at the death recap for the chosen mode. */
        const buildTrigger = ( trigger: TriggerModel ): TriggerModel => {
            trigger.name = `Death Recap [${engageMode === 'hotkey' ? 'Hotkey' : 'Auto'}]`;
            trigger.capturePhrases = [ capturePhrase ];

            let action = new TriggerAction();
            action.phrases = [ capturePhrase.phraseId ];
            action.actionType = ActionTypes.DisplayDeathRecap;
            action.actionId = nagId();
            trigger.actions = [ action ];

            return trigger;
        };

        const createTrigger = () => {
            this.dialogService.showSelectTriggerFolderDialog( null, 'Select Trigger Folder', 'Select the folder that will contain the generated trigger.' ).subscribe( folderId => {
                if ( !folderId ) {
                    // Cancelled: nothing was created, so show the saved mode again.
                    this.deathRecapPreferences.engageMode = this.savedDeathRecapEngageMode;
                    this.deathRecapPreferences.hotkeyPhrase = this.savedDeathRecapEngageMode === 'hotkey' ? '/hot "Death Recap" /em wonders how they died.' : null;
                    return;
                }

                let trigger = buildTrigger( new TriggerModel() );
                trigger.folderId = folderId;

                this.ipcService.createNewTrigger( trigger ).subscribe( triggerId => {
                    this.deathRecapPreferences.triggerId = triggerId;
                    this.saveDeathRecapPreferences();
                    this.snackBar.open( 'The death recap trigger has been created!', 'Dismiss', { duration: 5000 } );
                } );
            } );
        };

        if ( this.deathRecapPreferences.triggerId == null ) {
            createTrigger();
            return;
        }

        this.ipcService.getTrigger( this.deathRecapPreferences.triggerId ).subscribe( trigger => {

            if ( !trigger ) {
                // The generated trigger was deleted by hand; make a new one.
                this.deathRecapPreferences.triggerId = null;
                createTrigger();
                return;
            }

            this.ipcService.updateTrigger( buildTrigger( trigger ) ).subscribe( success => {
                this.saveDeathRecapPreferences();
                this.snackBar.open( 'The death recap trigger has been updated!', 'Dismiss', { duration: 5000 } );
            } );
        } );

    }

    /**
     * Turns the death recap off: deletes the generated trigger, if it still
     * exists, and clears the death recap preferences.
     */
    private turnOffDeathRecap(): void {

        const triggerId = this.deathRecapPreferences.triggerId;

        const finish = () => {
            this.deathRecapPreferences.engageMode = null;
            this.deathRecapPreferences.triggerId = null;
            this.deathRecapPreferences.hotkeyPhrase = null;
            this.saveDeathRecapPreferences();
            this.snackBar.open( 'The death recap is off.', 'Dismiss', { duration: 5000 } );
        };

        if ( triggerId == null ) {
            finish();
            return;
        }

        // Only delete a trigger that exists; deleting a missing id is not safe.
        this.ipcService.getTrigger( triggerId ).subscribe( trigger => {
            if ( trigger?.triggerId === triggerId ) {
                this.ipcService.deleteTrigger( triggerId ).subscribe( () => finish() );
            } else {
                finish();
            }
        } );

    }

    /**
     * Saves the death recap preferences and remembers the saved mode.
     */
    private saveDeathRecapPreferences(): void {
        this.savedDeathRecapEngageMode = this.deathRecapPreferences.engageMode;
        this.ipcService.updateDeathRecapPreferences( this.deathRecapPreferences );
    }










    /**
     * Copies the death recap command to the user's clipboard.
     */
    onCopyDeathRecapHotkeyCommand(): void {
        this.ipcService.sendTextToClipboard( this.deathRecapPreferences.hotkeyPhrase );

        this.snackBar.open( 'The command has been copied to your clipboard!', 'Dismiss', { duration: 5000 } );
    }









    
    /**
     * Allows the user to save a copy of their current log file, in zip form.
     */
    downloadLogFile() {
        this.ipcService.downloadLogZip();
    }









    
    /**
     * Allows the user to save a copy of their current data files, in zip form.
     */
    downloadDataFiles() {
        this.ipcService.downloadDataFilesZip();
    }
    








    
    /**
     * Shows the current data folder in file explorer.
     */
    showDataFolder() {
        this.ipcService.showDataFolder();
    }









    
    /**
     * Stores the default detrimental overlay id.
     */
    saveDetrimentalOverlayId() {
        this.ipcService.saveDetrimentalOverlayId( this.detrimentalOverlayId );
    }









    
    /**
     * Stores the default beneficial overlay id.
     */
    saveBeneficialOverlayId() {
        this.ipcService.saveBeneficialOverlayId( this.beneficialOverlayId );
    }









    
    /**
     * Stores the default alert overlay id.
     */
    saveAlertOverlayId() {
        this.ipcService.saveAlertOverlayId( this.alertOverlayId );
    }









    
    /**
     * Uses TTS to speak the given phrase.
     * 
     * @param phrase The phrase to speak.
     */
    speakPhrase( phrase: string, rate: number | undefined = undefined ): void {
        
        if ( rate !== undefined ) {
            let x = Math.random();
            if ( x >= 0 && x <= 0.05 ) {
                phrase = 'I promise not to overthrow my human overlords.';
            }
        }

        rate = rate ?? 0;

        if ( this.baseSpeakingRate < 1 ) {
            rate = rate - ( 1 - this.baseSpeakingRate );
        } else if ( rate < this.baseSpeakingRate ) {
            rate = this.baseSpeakingRate;
        }

        if ( this.utter ) {
            speechSynthesis.cancel();
            this.utter = undefined;
        }

        this.utter = new SpeechSynthesisUtterance();
        this.utter.text = phrase;
        this.utter.voice = this.voiceOptions[ this.voiceIndex ];
        this.utter.onend = function ( event ) { }
        this.utter.rate = MathUtilities.clamp( rate, 0.1, 4 );
        this.utter.volume = ( this.speechVolume / 100 ) * ( this.masterVolume / 100 );
        speechSynthesis.speak( this.utter );

    }









    
    /**
     * Stores the selected voice index.
     */
    onChangeVoice(): void {
        this.ipcService.updateVoiceIndex( this.voiceIndex );
    }









    
    /**
     * Stores the new master volume setting.
     */
    onChangeMasterVolume(): void {
        this.ipcService.updateMasterVolume( this.masterVolume );
    }









    
    /**
     * Opens the GINA import dialog.
     */
    openImportGinaDialog(): void {
        this.loadingGinaConfig = true;
        this.ipcService.showGinaImportWindow().subscribe( loaded => {
            this.loadingGinaConfig = false;
            if ( !loaded ) {
                this.dialogService.showErrorDialog( 'GINA Import', 'Could not load GINA data.' );
            }
        } );
    }









    
    /**
     * Adds a new empty phonetic transform.
     * 
     * @param table A reference to the MatTable object.
     */
    addPhoneticTransform( table: MatTable<IPhoneticTransform> ): void {
        this.phoneticTransforms.push( { id: nanoid() } );
        table?.renderRows();
        this.phoneticTransformsModified = true;
    }









    
    /**
     * Deletes the desired transform, after confirmation.
     * 
     * @param index The index of the desired transform.
     * @param table A reference to the MatTable object.
     */
    deletePhoneticTransform( index: number, table: MatTable<IPhoneticTransform> ): void {
        this.dialogService.showConfirmDialog(
            `Are you sure you want to delete ${this.phoneticTransforms[ index ].originalText}?`,
            'Click "Yes" to delete this transform.', 'Click "No" to close this dialog without deleting the transform.',
            confirmed => {
                if ( confirmed === true ) {
                    this.phoneticTransforms.splice( index, 1 );
                    this.ipcService.savePhoneticTransforms( this.getPhoneticTransformsRecord() );
                    table?.renderRows();
                    this.phoneticTransformsModified = true;
                }
            } );
    }









    
    /**
     * Saves the current phonetic transforms.
     */
    savePhoneticTransforms(): void {
        this.ipcService.savePhoneticTransforms( this.getPhoneticTransformsRecord() );
        this.phoneticTransformsModified = false;
    }









    
    /**
     * Returns the currently stored phonetic transforms.
     */
    getPhoneticTransformsRecord(): Record<string, string> {
        let transforms: Record<string, string> = {};
        let duplicates: string[] = [];

        this.phoneticTransforms.forEach( t => {
            if ( !transforms.hasOwnProperty( t.originalText ) ) {
                transforms[ t.originalText ] = t.phoneticText;
            } else {
                duplicates.push( t.originalText );
            }
        } );

        if ( duplicates.length > 0 ) {
            this.dialogService.showWarningDialog( 'Phonetics removed', [ 'Some of the phonetics in the list had duplicate original texts and were not saved.  Please review the list: ' ].concat( duplicates ) );
        }

        return transforms;
    }

    /**
     * Executes the setup wizard.
     */
    runSetupWizard() {
        this.setupService.showSetupWizard().subscribe( () => {
            this.ipcService.requestTick();
            this.characterList?.loadCharacters();
        } );
    }










    /**
     * Resets all hidden modals, allowing them to appear again.
     */
    resetHiddenModals() {
        this.ipcService.resetHiddenModalIds();
        this.snackBar.open( 'All hidden modals will now appear again.', 'dismiss', { duration: 5000 } );
    }










    /**
     * Shows a dialog that explains window checking.
     */
    explainWindowChecking() {
        this.dialogService.showInfoDialog(
            'Relative Window Positioning',
            [
                'When the renderer loads an overlay, it will check to ensure that the monitor containing the overlay has moved.',
                'If the monitor has moved, the renderer will recalculate the position of the overlay relative to the containing monitor. This will ensure that the overlay appears in the same location on the monitor.',
                'However, on some systems the OS reports the monitor as having moved, even when it has not.',
                'Disabling this setting will prevent this check from happening, which may resolve the issue.',
                'However, if disabled and your monitor positions have changed, the overlay may appear in the wrong location or entirely off-screen.  When this happens, you can use the Send to Origin button on the overlay list to reset the overlay position.',
            ],
            'wide',
        );
    }










}
