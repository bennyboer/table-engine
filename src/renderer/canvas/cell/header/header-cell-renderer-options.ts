import { Colors, IColor } from '../../../../util';

const DEFAULT_FONT_SIZE: number = 12;
const DEFAULT_FONT_FAMILY: string = 'sans-serif';
const DEFAULT_BACKGROUND_COLOR: IColor = {
	red: 249,
	green: 249,
	blue: 249,
	alpha: 1.0,
};
const DEFAULT_HOVERED_BACKGROUND_COLOR: IColor = Colors.LIGHTEST_GRAY;
const DEFAULT_HIGHLIGHT_BORDER_COLOR: IColor = Colors.CORAL;
const DEFAULT_HIGHLIGHT_BORDER_SIZE: number = 3;

export interface IRowColumnHeaderCellRendererOptions {
	fontSize?: number;
	fontFamily?: string;
	backgroundColor?: IColor;
	hoveredBackgroundColor?: IColor;
	highlightBorderColor?: IColor;
	highlightBorderSize?: number;
}

export const fillOptions = (options?: IRowColumnHeaderCellRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (options.fontSize === undefined || options.fontSize === null) {
		options.fontSize = DEFAULT_FONT_SIZE;
	}

	if (!options.fontFamily) {
		options.fontFamily = DEFAULT_FONT_FAMILY;
	}

	if (!options.backgroundColor) {
		options.backgroundColor = DEFAULT_BACKGROUND_COLOR;
	}

	if (!options.hoveredBackgroundColor) {
		options.hoveredBackgroundColor = DEFAULT_HOVERED_BACKGROUND_COLOR;
	}

	if (!options.highlightBorderColor) {
		options.highlightBorderColor = DEFAULT_HIGHLIGHT_BORDER_COLOR;
	}

	if (
		options.highlightBorderSize === undefined ||
		options.highlightBorderSize === null
	) {
		options.highlightBorderSize = DEFAULT_HIGHLIGHT_BORDER_SIZE;
	}

	return options;
};
