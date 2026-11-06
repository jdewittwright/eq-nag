import { Component, ViewChild, ElementRef, NgZone } from '@angular/core';
import * as _ from 'lodash-es';
import { MatLegacySnackBar as MatSnackBar, MatLegacySnackBarRef as MatSnackBarRef, LegacySimpleSnackBar as SimpleSnackBar } from '@angular/material/legacy-snack-bar';

@Component( {
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: [ './app.component.scss' ],
} )
export class AppComponent {

    constructor() {}

    title = 'electron-angular-eq-parse';
}
