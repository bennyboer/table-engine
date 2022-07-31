import { Colors, IColor } from '../../../../util';

const DEFAULT_BACKGROUND_COLOR: IColor = Colors.WHITE;
const DEFAULT_BORDER_COLOR: IColor = Colors.LIGHTGRAY;
const DEFAULT_BORDER_SIZE: number = 1;
const DEFAULT_BORDER_RADIUS: number = 2;
const DEFAULT_LABEL_COLOR: IColor = Colors.DARKGRAY;
const DEFAULT_LABEL_FONT_SIZE: number = 12;
const DEFAULT_LABEL_FONT_FAMILY: string = 'sans-serif';
const DEFAULT_MARGIN: number = 4;
const DEFAULT_PADDING: number = 4;

export interface IButtonCellRendererOptions {
	margin?: number;
	padding?: number;
	background?: IButtonBackgroundOptions;
	border?: IButtonBorderOptions;
	label?: IButtonLabelOptions;
}

export interface IButtonBackgroundOptions {
	color?: IColor;
}

export interface IButtonBorderOptions {
	color?: IColor;
	size?: number;
	radius?: number;
}

export interface IButtonLabelOptions {
	color?: IColor;
	fontSize?: number;
	fontFamily?: string;
}

export const fillOptions = (options?: IButtonCellRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (options.margin === undefined || options.margin === null) {
		options.margin = DEFAULT_MARGIN;
	}

	if (options.padding === undefined || options.padding === null) {
		options.padding = DEFAULT_PADDING;
	}

	options.background = fillBackgroundOptions(options.background);
	options.border = fillBorderOptions(options.border);
	options.label = fillLabelOptions(options.label);

	return options;
};

const fillBackgroundOptions = (options?: IButtonBackgroundOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.color) {
		options.color = DEFAULT_BACKGROUND_COLOR;
	}

	return options;
};

const fillBorderOptions = (options?: IButtonBorderOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.color) {
		options.color = DEFAULT_BORDER_COLOR;
	}

	if (options.size === undefined || options.size === null) {
		options.size = DEFAULT_BORDER_SIZE;
	}

	if (options.radius === undefined || options.radius === null) {
		options.radius = DEFAULT_BORDER_RADIUS;
	}

	return options;
};

const fillLabelOptions = (options?: IButtonLabelOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.color) {
		options.color = DEFAULT_LABEL_COLOR;
	}

	if (options.fontSize === undefined || options.fontSize === null) {
		options.fontSize = DEFAULT_LABEL_FONT_SIZE;
	}

	if (!options.fontFamily) {
		options.fontFamily = DEFAULT_LABEL_FONT_FAMILY;
	}

	return options;
};
