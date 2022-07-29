import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'app-fixed-rows-columns-example',
	templateUrl: 'fixed-rows-columns.component.html',
	styleUrls: ['fixed-rows-columns.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FixedRowsColumnsComponent {}
