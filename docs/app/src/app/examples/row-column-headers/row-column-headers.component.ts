import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-row-column-headers-example',
    templateUrl: 'row-column-headers.component.html',
    styleUrls: ['row-column-headers.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RowColumnHeadersComponent {}
