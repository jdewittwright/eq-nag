import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { TriggerAction } from 'src/app/core.model';

@Component( {
    selector: 'app-trigger-action-clipboard',
    templateUrl: 'trigger-action-clipboard.component.html',
    styleUrls: ['trigger-action-clipboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
} )
export class TriggerActionClipboardComponent implements OnInit {

    @Input() public action: TriggerAction;

    constructor() { }

    ngOnInit() { }

}