import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'app-borders',
	templateUrl: 'borders.component.html',
	styleUrls: ['borders.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BordersComponent {}
