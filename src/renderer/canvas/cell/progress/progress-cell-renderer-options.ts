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

export interface IProgressCellRendererOptions {
	onChanged?: (cell: ICell) => void;
	editable?: boolean;
	indeterminate?: boolean;
	style?: ProgressCellRendererStyle;
	padding?: number;
	color?: IColor;
	backgroundColor?: IColor;
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
