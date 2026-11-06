import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { TriggerAction } from 'src/app/core.model';

@Component({
    selector: 'app-trigger-action-death-recap',
    templateUrl: 'trigger-action-death-recap.component.html',
    styleUrls: ['trigger-action-death-recap.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class TriggerActionDeathRecapComponent implements OnInit {

    @Input() public action: TriggerAction;

    constructor() { }

    ngOnInit() { }

}
