import { ICell } from '../../../../cell';
import { ProgressCellRendererStyle } from './progress-cell-renderer-style';
import { Colors, IColor } from '../../../../util';

const DEFAULT_EDITABLE: boolean = false;
const DEFAULT_INDETERMINATE: boolean = false;
const DEFAULT_STYLE: ProgressCellRendererStyle =
	ProgressCellRendererStyle.RADIAL;
const DEFAULT_PADDING: number = 4;
const DEFAULT_LINEAR_THICKNESS: number = 3;
const DEFAULT_RADIAL_BACKGROUND_THICKNESS: number = 3;
const DEFAULT_RADIAL_FOREGROUND_THICKNESS: number = 4;
const DEFAULT_BACKGROUND_COLOR: IColor = {
	red: 220,
	green: 220,
	blue: 220,
	alpha: 1.0,
};
const DEFAULT_COLOR: IColor = Colors.CORAL;
const DEFAULT_INDETERMINATE_PERIOD_DURATION: number = 1000;
const DEFAULT_SHOW_LABEL: boolean = true;
const DEFAULT_LABEL_FONT_SIZE: number = 10;
const DEFAULT_LABEL_FONT_FAMILY: string = 'sans-serif';
const DEFAULT_LABEL_COLOR: IColor = Colors.DARKGRAY;

export interface IProgressCellRendererOptions {
	onChanged?: (cell: ICell) => void;
	editable?: boolean;
	indeterminate?: boolean;
	style?: ProgressCellRendererStyle;
	padding?: number;
	color?: IColor;
	backgroundColor?: IColor;

	/**
	 * Duration of a period in indeterminate mode (in milliseconds).
	 */
	indeterminatePeriodDuration?: number;

	/**
	 * Whether to show the progress label.
	 */
	showLabel?: boolean;

	labelFontSize?: number;
	labelFontFamily?: string;
	labelColor?: IColor;

	radial?: IRadialProgressStyle;
	linear?: ILinearProgressStyle;
}

export interface IRadialProgressStyle {
	foregroundThickness?: number;
	backgroundThickness?: number;
}

export interface ILinearProgressStyle {
	thickness?: number;
}

export const fillOptions = (options?: IProgressCellRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (options.editable === undefined || options.editable === null) {
		options.editable = DEFAULT_EDITABLE;
	}

	if (options.indeterminate === undefined || options.indeterminate === null) {
		options.indeterminate = DEFAULT_INDETERMINATE;
	}

	if (!options.style) {
		options.style = DEFAULT_STYLE;
	}

	if (options.padding === undefined || options.padding === null) {
		options.padding = DEFAULT_PADDING;
	}

	if (!options.color) {
		options.color = DEFAULT_COLOR;
	}

	if (!options.backgroundColor) {
		options.backgroundColor = DEFAULT_BACKGROUND_COLOR;
	}

	if (
		options.indeterminatePeriodDuration === undefined ||
		options.indeterminatePeriodDuration === null
	) {
		options.indeterminatePeriodDuration =
			DEFAULT_INDETERMINATE_PERIOD_DURATION;
	}

	if (options.showLabel === undefined || options.showLabel === null) {
		options.showLabel = DEFAULT_SHOW_LABEL;
	}

	if (options.labelFontSize === undefined || options.labelFontSize === null) {
		options.labelFontSize = DEFAULT_LABEL_FONT_SIZE;
	}

	if (!options.labelFontFamily) {
		options.labelFontFamily = DEFAULT_LABEL_FONT_FAMILY;
	}

	if (!options.labelColor) {
		options.labelColor = DEFAULT_LABEL_COLOR;
	}

	options.radial = fillRadialOptions(options.radial);
	options.linear = fillLinearOptions(options.linear);

	return options;
};

const fillLinearOptions = (options?: ILinearProgressStyle) => {
	if (!options) {
		options = {};
	}

	if (options.thickness === undefined || options.thickness === null) {
		options.thickness = DEFAULT_LINEAR_THICKNESS;
	}

	return options;
};

const fillRadialOptions = (options?: IRadialProgressStyle) => {
	if (!options) {
		options = {};
	}

	if (
		options.backgroundThickness === undefined ||
		options.backgroundThickness === null
	) {
		options.backgroundThickness = DEFAULT_RADIAL_BACKGROUND_THICKNESS;
	}

	if (
		options.foregroundThickness === undefined ||
		options.foregroundThickness === null
	) {
		options.foregroundThickness = DEFAULT_RADIAL_FOREGROUND_THICKNESS;
	}

	return options;
};
