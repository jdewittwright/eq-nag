import { Component, ElementRef, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component( {
    selector: 'app-accordion',
    templateUrl: 'accordion.component.html',
    styleUrls: ['accordion.component.scss'],
    host: { 'class': 'accordion' },
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
} )
export class AccordionComponent implements OnInit {

    constructor() { }

    ngOnInit() { }

}
