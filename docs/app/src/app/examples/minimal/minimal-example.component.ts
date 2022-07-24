import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-minimal-example',
    templateUrl: 'minimal-example.component.html',
    styleUrls: ['minimal-example.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinimalExampleComponent {}
