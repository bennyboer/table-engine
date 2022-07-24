import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'app-cell-renderer',
	templateUrl: 'cell-renderer.component.html',
	styleUrls: ['cell-renderer.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CellRendererComponent {}
