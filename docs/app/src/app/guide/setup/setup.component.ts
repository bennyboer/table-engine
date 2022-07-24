import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'app-setup',
	templateUrl: 'setup.component.html',
	styleUrls: ['setup.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupComponent {}
