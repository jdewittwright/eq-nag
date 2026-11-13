# Changelog

Each version's section is written to be pasted into its GitHub release
description, which Nag shows in the Update Notes window.

## v0.4.0 (unreleased)

### Security
- **Log lines from other players can no longer reach code with full access to your computer.** The hidden windows that read your logs, track combat and back up logs could run anything with Nag's full access to your files, and had the browser's usual protections turned off. Nothing in them was known to be exploitable, but they handle chat that anyone in game can type, so one small mistake could have let a message run code. Their work now happens apart from the page, with the protections back on, and the pages are blocked from running any script.
- **Nag's windows now run in Chromium's sandbox.** The main window, settings, editors, dialogs and the overlay window are now restricted like web pages in a browser, so a problem in one of them can't reach your files. The death recap still runs outside the sandbox for now, because it reads your log file itself.
- **Removed the outdated "remote" module.** It let Nag's windows control the app directly, which Electron advises against. The few things it was used for (closing a window, letting clicks pass through overlays, finding the mouse and the screen size) now go through Nag's main process, which only acts on the window that asked.
- **The overlay window and death recap only get what they need.** Their pages could call every function behind them. The overlay page can now only open the combat settings and turn encounter recording on or off, and the death recap page can't call anything.
- **Windows can only change real settings.** A window could change any part of Nag's settings storage by name, including parts that aren't settings. Nag now only accepts the settings its windows actually use, and ignores anything else.

## v0.3.6 (unreleased)

### Fixes
- **Characters added from the log file list now share their server with your other characters.** Since v0.3.0, a character picked from the list was saved with its server in capitals (such as "FROSTREAVER"), which Nag treated as a different server from "frostreaver". That character's combat data was kept separately, and it didn't recognize your other characters or their pets on the same server. The Heroes Journey had the same problem. Nag now saves server names one way, and fixes existing characters and combat data automatically the first time it starts, keeping a backup of each file first.
- **The text cursor is easy to see.** It was dark purple and barely showed on Nag's dark text boxes. It's now white, like the text.
- **The + and − buttons on durations are lined up again.** In timer and other duration settings, they were shifted down and to the right, overlapping the edges of the boxes.

## v0.3.5

### Fixes
- **The update prompt no longer comes back every 10 minutes.** Nag kept checking for updates after one had downloaded, and could ask you to install the same update again.
- **Nag opens where you left it on a second monitor.** It moved back to the main monitor on every start if you had more than one, especially when the other monitor is to the left of or above the main one.
- **Nag's windows no longer load the wrong data.** When several things loaded at once, a window could be given the answer meant for another request, such as the wrong trigger or overlay.
- **Windows recover if they crash.** A window whose page stopped was left blank, and Nag's dialogs have no frame to close them with. Nag now reloads it, and closes a dialog that keeps crashing.
- **The overlay editor works for overlays from older packages and shares.** Their text overflow settings were missing, which caused errors and broke those controls. Cancel now also undoes changes to text overflow.
- **EQ Spell Resources imports no longer hang.** If the site was slow, unreachable or returned an error, the DoT and Buff generators could wait forever. They now give up after 20 seconds and show what went wrong, so you can try again.
- **Folders with &, #, + or % in their names work.** If your EverQuest folder or log files were in such a folder (for example "D:\Games & Mods\EverQuest"), that character's triggers didn't run, and log backups and the death recap could get the wrong path.
- **The death recap recognizes your characters and pets.** It wasn't given the character's server, so it couldn't look them up.
- **GINA sounds with the same file name are imported separately.** Two different sounds called "alert.wav" in different folders both became the first one. Missing files, and files that aren't sounds, are now skipped instead of leaving a trigger with a sound that doesn't exist.

## v0.3.4

### Changes
- **Nag's windows are built on a current version of Angular.** Angular is the framework behind everything you see in Nag, and the version it used (14) stopped getting security fixes in late 2023. Nag now uses Angular 22. Your triggers, overlays and settings are unchanged, and nothing needs to be set up again.
- **Buttons, tabs, dropdowns, sliders and checkboxes have been updated.** They now use the current Angular Material design, adjusted to keep Nag's compact layout and colors. Most screens look the same as before, but you may notice small differences in spacing and animations. If anything looks out of place or doesn't work as it used to, please report it.

## v0.3.3

### Changes
- **Closing Nag's window now sends it to the system tray.** Nag keeps running your triggers and overlays, like other tray apps on Windows. To quit, right-click the tray icon and choose Exit. The separate minimize-to-tray button is gone, since the close button now does the same thing. If a log archive is in progress when you choose Exit, Nag asks whether to wait for it first.

## v0.3.2

### Fixes
- **The Update Notes title is fixed.** It showed the version with two v's, such as "vv0.3.1".

### Security
- **Updated Electron from version 36 to 45.** Electron is the browser engine Nag runs on, and version 36 no longer gets security fixes.

## v0.3.1

### Security
- **Fixed a way for a shared trigger to run code.** A specially made `.nagshare` file could run script in the overlay window through a timer's duration. Durations are now always treated as numbers, Nag rejects share files with invalid trigger fields, and the overlay window no longer allows script from inside its page. Update before importing share files from people you don't know.
- **Slow regular expressions no longer freeze your triggers for good.** Patterns that would hang now switch to a slower-to-start but safe matching engine where possible. If triggers still stop responding, Nag restarts them, and turns them off with a warning if it keeps happening. Share files with a pattern that could hang are rejected.
- **Stored variable names can no longer damage Nag.** Names such as `__proto__` are now ignored.
- **Removed the old Allakhazam code.** The generators were removed in v0.3.0, but the code behind them was still in the app. It put web pages into Nag without cleaning them, so it's now gone completely. Triggers made from Allakhazam keep working, and DoT and Buff timers can still be re-imported from EQ Spell Resources.

### Fixes
- **Your settings and triggers are protected from crashes.** Saves can no longer leave a half-written file, and Nag keeps a backup copy of each one. If a file is damaged, Nag restores the backup, keeps the damaged file and tells you, instead of silently starting over.
- **Log backups no longer lose logs.** Original log files are only removed after the archive has been written and checked. If a backup fails, your logs and your existing archive are left as they were.
- **Importing no longer drops the wrong folder.** The import window could remove a folder containing triggers and keep an empty one instead.
- **Overlays are no longer rewritten on every launch.** Nag was resetting each overlay's timer background color every time it started.
- **The GINA importer tells you when GINA isn't found,** instead of waiting forever.

### Performance
- **Less disk activity at startup.** Nag no longer searches your whole home folder for GINA on every launch. It only looks when you open the GINA importer, and checks the usual places first.
- **Less work while Nag runs.** Moving or resizing the window saves once it stops instead of on every movement, importing triggers saves character data once instead of once per trigger, and long sessions keep less history in memory.

### Other changes
- **Removed leftover settings** for quick share codes and author profiles, including any saved author name. These features were removed in v0.3.0. A copy of your settings is kept before they're removed.

## v0.3.0

### Fixes
- **Setup wizard no longer gets stuck.** On a new install, or after Nag's settings files were lost or damaged (for example after a crash), the setup wizard's buttons could stop working, leaving the wizard covering the app. This affected every version since 0.2.23. Nag now correctly upgrades its settings on startup, and anyone already stuck should be fixed automatically after updating. The wizard also moves on if a step fails instead of waiting forever, and **Cancel Setup Wizard** now stops it from opening on every launch (you can still run it from the Settings tab).
- **Clear All works again on live servers.** EverQuest's October 2026 patch puts `~ ` in front of the player's name on `/emote` messages, which stopped the built-in Clear All trigger (`/em clears their mind`) from firing. It now accepts both the new and old formats, so it keeps working on emulator servers. (Thanks, Maxx!)
- **Death Recap's hotkey works again on live servers.** The `/em wonders how they died.` hotkey had the same problem. Existing Death Recap triggers are updated automatically, unless you've edited the phrase yourself.
- **If you have your own emote-based triggers** (for example timers started with `/em`), make the new `~ ` optional so they work on both live and emulator servers. For a regular-expression phrase, add `(?:~ )?` right after the `^` at the start.
- **The Heroes Journey:** fixed THJ character and server detection when adding characters, and fixed direct-damage spell parsing for THJ.
- **Timer durations (`{TS}`) are read correctly.** Durations with words were misread: "10 minutes" became a 10-second timer and "90:00" became 9 hours, and ordinary words like "soon" could start a broken timer. `{TS}` now understands "5m", "10 min", "2.5 hours", "1h30m", "1 hour 30 minutes", "28 minute(s) 1 seconds", "1:30" and "1:02:03". (Thanks, Maxx!)
- **`{N}` captures the whole number**, not just its first digits.
- **"Your resolution has changed!"** no longer appears on a new profile, and if your monitors turn off and come back (for example overnight), the warning now closes by itself once the screens are back to normal. Starting Nag while a monitor is off no longer replaces your normal layout, so it doesn't trigger a false warning on the next launch.
- **Overlays no longer jump out of place.** If Windows moved Nag's overlay layer by itself, for example when a monitor turned off or on, all of your overlays could shift by the same amount until Nag was restarted. Nag now notices the move and puts them back.
- **Timers end when an NPC or pet dies on live servers.** Live now reports these deaths as "… was slain by …" instead of "… has been slain by …", so auto-generated DoT, buff and raid timers kept running after the target died. New triggers handle both, and existing ones are updated automatically (End Early phrases that check for "has been slain by"). Emulator servers are unaffected.
- **SVG timer icons now show** in the Timer, DoT Timer and Stopwatch editors. (Thanks, Maxx!)

### Security
- **Safer shared triggers.** HTML in trigger text, overlay names and log text is now cleaned before it is shown, so formatting and styles still work but nothing in it can run. Overlays no longer load images, sounds or fonts from other websites, and sound files from shared packages and quick-shares are checked before they are saved.

### New
- **Share triggers and FCT settings with a file.** Right-click a trigger or folder and choose **Export to File**, send the `.nagshare` file to someone, and they choose **Import from File** in the Triggers tab's menu. FCT settings have Export and Import buttons on their own tab. Files include any sounds the triggers use.
- **Pets in Combat Statistics.** Pets can now be added and assigned to their owner from the Combat Statistics screen, and Nag detects pet ownership from the log, so pet damage is credited to the right player.
- **Better player identification** in the combat parser, including class abbreviations.
- **More sound formats.** Sounds can now be `.ogg`, `.m4a`, `.opus`, `.webm` or `.aac` as well as `.mp3`. (Thanks, Maxx!)
- **Easier to read and use:** a three-column action type picker with icons, phrase boxes that grow as you type, reorderable End Early phrases, a Regex Visualizer for capture phrases, a better color picker (system picker, manual input, more palettes), alphabetically sorted variable and sound lists, shorter console timestamps, and title bar text that brightens on hover. (Thanks, Maxx!)

### Removed
Nag no longer needs an online service. These features depended on it and have been removed:
- **Quick share codes,** including pasting a `{NAG:...}` code in game to share it.
- **The Trigger Library** and automatic package updates. Triggers you already installed are kept, but they no longer update, and you can no longer uninstall a whole package at once.
- **Log sync** and author profiles. Your own combat statistics still work.

### Other changes
- **Nag is now open source** at https://github.com/guildantix/eq-nag.
- **Nag's settings folder is now `%APPDATA%\EQNag`.** Your settings are copied there automatically the first time you start this version. The old `electron-angular-eq-parse` folder is left in place, so you can delete it once you're happy with this version.
- **Updates now come from https://github.com/jdewittwright/eq-nag.** Builds from this version check that repository for updates and update notes.
- **The installer is no longer code-signed.** Windows SmartScreen may show an "unknown publisher" warning the first time you install. Click "More info", then "Run anyway". Updates install as usual.
- Removed the Patreon banner from the Update Notes window.
- **Allakhazam trigger generators removed.** Allakhazam doesn't allow automated access to its pages, so the Allakhazam DoT, Buff and Raid Ability generators are gone. The EQ Spell Resources generators are unchanged, and triggers made earlier keep working. DoT and Buff timers made from Allakhazam can be re-imported from EQ Spell Resources: open the trigger, click "Re-import from EQ Spell Resources" and paste the spell's EQ Spell Resources address.

<!-- Maintainer notes, not part of the release description:
- Store migrations now use app.whenReady() instead of app.on('ready'); the ESM main
  process could emit 'ready' before the stores were constructed (b132df56).
- Releases are built by .github/workflows/release.yml on a v* tag and published to
  guildantix/eq-nag as a draft; SSL.com eSigner signing was removed (80223e43).
- package.json repository/publish target is now guildantix/eq-nag; builds from this
  version check eq-nag directly for updates instead of the eq-parse redirect.
- The leading "~ " on /emote lines is NOT stripped (the strip was reverted at Maxx's request).
  Only the predefined Clear All trigger needed changing (Albin's commits). It is replaced from
  clear-all.json on every load, so existing users get it without a migration.
-->
