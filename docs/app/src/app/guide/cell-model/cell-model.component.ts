import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'app-cell-model',
	templateUrl: 'cell-model.component.html',
	styleUrls: ['cell-model.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CellModelComponent {}
