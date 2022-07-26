import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'app-borders',
	templateUrl: 'borders.component.html',
	styleUrls: ['borders.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BordersComponent {
	codeSamples = {
		setBorderLine: `\
this.engine.getBorderModel().setBorderLine(
	10, // row
	2, // column
	{
		style: BorderStyle.DOTTED,
		size: 3,
		color: { red: 140, blue: 180, green: 160, alpha: 1.0 },
	},
	{ bottom: true, top: true }
);`,
	};
}
