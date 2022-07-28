import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'app-theming',
	templateUrl: 'theming.component.html',
	styleUrls: ['theming.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemingComponent {
	sampleCode = {
		themingExample: `\
// Theming
const canvasOptions = engine.getOptions().renderer.canvas;

const cyanColor = {
  red: 0,
  blue: 200,
  green: 200,
  alpha: 1.0,
};

// Theming selection
{
  const selectionOptions = canvasOptions.selection;

  selectionOptions.borderSize = 3;
  selectionOptions.offset = -2;
  selectionOptions.primary.borderColor = cyanColor;
  selectionOptions.primary.backgroundColor = {
    ...cyanColor,
    alpha: 0.2,
  };
}

// Theming scrollbar
{
  const scrollBarOptions = canvasOptions.scrollBar;

  scrollBarOptions.color = {
    red: 80,
    blue: 80,
    green: 80,
    alpha: 1.0,
  };
  scrollBarOptions.cornerRadius = 1;
  scrollBarOptions.size = 3;
}
`,
		cellRendererThemingExample: `\
engine.registerCellRenderer(
	new TextCellRenderer({
		horizontalAlignment: HorizontalAlignment.CENTER,
		color: Colors.BRIGHT_ORANGE
	})
);
`,
	};
}
