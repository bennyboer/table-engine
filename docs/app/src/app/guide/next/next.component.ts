import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'app-next',
	templateUrl: 'next.component.html',
	styleUrls: ['next.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextComponent {}
