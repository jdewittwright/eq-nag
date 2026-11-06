import { Component, ViewChild, ElementRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import * as _ from 'lodash-es';
import { MatSnackBar, MatSnackBarRef, SimpleSnackBar } from '@angular/material/snack-bar';

@Component( {
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
} )
export class AppComponent {

    constructor() {}

    title = 'electron-angular-eq-parse';
}
