import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component( {
    selector: 'app-link-button',
    templateUrl: 'link-button.component.html',
    styleUrls: ['link-button.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
} )
export class LinkButtonComponent implements OnInit {

    constructor() { }

    ngOnInit() { }

}
