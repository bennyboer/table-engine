import {ICell} from "../../../../cell/cell";
import {IColor} from "../../../../util/color";
import {Colors} from "../../../../util/colors";

export const DEFAULT_PLACEHOLDER_TEXT: string = "Select...";
export const DEFAULT_LABEL_COLOR: IColor = Colors.BLACK;
export const DEFAULT_LABEL_COLOR_HOVERED: IColor = Colors.CORAL;
export const DEFAULT_LABEL_COLOR_DISABLED: IColor = Colors.GRAY;
export const DEFAULT_LABEL_FONT_SIZE: number = 12;
export const DEFAULT_LABEL_FONT_FAMILY: string = "sans-serif";
export const DEFAULT_PLACEHOLDER_COLOR: IColor = Colors.GRAY;
export const DEFAULT_PADDING: number = 8;
export const DEFAULT_SELECT_ARROW_COLOR: IColor = Colors.GRAY;
export const DEFAULT_SELECT_ARROW_COLOR_DISABLED: IColor = Colors.LIGHTGRAY;
export const DEFAULT_SELECT_ARROW_HOVER_COLOR: IColor = Colors.CORAL;
export const DEFAULT_SELECT_ARROW_SIZE: number = 10;
export const DEFAULT_SELECT_ARROW_THICKNESS: number = 2;
export const DEFAULT_SELECT_ARROW_LINE_JOIN: "bevel" | "miter" | "round" = "round";
export const DEFAULT_SELECT_ARROW_LINE_CAP: "butt" | "round" | "square" = "round";
export const DEFAULT_DROPDOWN_OVERLAY_CLASS_NAME = "table-engine-combobox-dropdown-list";
export const DEFAULT_DROPDOWN_MAX_HEIGHT = 200;

export interface IComboBoxCellRendererOptions {
	onChanged?: (cell: ICell) => void;
	editable?: boolean;
	padding?: number;
	label?: ILabelOptions;
	placeholder?: IPlaceholderOptions,
	selectArrow?: ISelectArrowOptions,
	dropdown?: IDropdownOptions
}

export interface ILabelOptions {
	color?: IColor;
	hoveredColor?: IColor;
	disabledColor?: IColor;
	fontSize?: number;
	fontFamily?: string;
}

export interface IPlaceholderOptions {
	text?: string;
	color?: IColor;
}

export interface ISelectArrowOptions {
	color?: IColor;
	hoverColor?: IColor;
	disabledColor?: IColor;
	size?: number;
	thickness?: number;
	lineJoin?: "bevel" | "miter" | "round";
	lineCap?: "butt" | "round" | "square";
}

export interface IDropdownOptions {
	overlayClassName?: string;
	maxHeight?: number;
}

export const fillOptions = (options?: IComboBoxCellRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (options.editable === undefined || options.editable === null) {
		options.editable = true;
	}

	if (options.padding === undefined || options.padding === null) {
		options.padding = DEFAULT_PADDING;
	}

	options.label = fillLabelOptions(options.label);
	options.placeholder = fillPlaceholderOptions(options.placeholder);
	options.selectArrow = fillSelectArrowOptions(options.selectArrow);
	options.dropdown = fillDropdownOptions(options.dropdown);

	return options;
}

const fillLabelOptions = (options?: ILabelOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.color) {
		options.color = DEFAULT_LABEL_COLOR;
	}

	if (!options.hoveredColor) {
		options.hoveredColor = DEFAULT_LABEL_COLOR_HOVERED;
	}

	if (!options.disabledColor) {
		options.disabledColor = DEFAULT_LABEL_COLOR_DISABLED;
	}

	if (options.fontSize === undefined || options.fontSize === null) {
		options.fontSize = DEFAULT_LABEL_FONT_SIZE;
	}

	if (!options.fontFamily) {
		options.fontFamily = DEFAULT_LABEL_FONT_FAMILY;
	}

	return options;
}

const fillPlaceholderOptions = (options?: IPlaceholderOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.color) {
		options.color = DEFAULT_PLACEHOLDER_COLOR;
	}

	if (!options.text) {
		options.text = DEFAULT_PLACEHOLDER_TEXT;
	}

	return options;
}

const fillSelectArrowOptions = (options?: ISelectArrowOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.color) {
		options.color = DEFAULT_SELECT_ARROW_COLOR;
	}

	if (!options.hoverColor) {
		options.hoverColor = DEFAULT_SELECT_ARROW_HOVER_COLOR;
	}

	if (!options.disabledColor) {
		options.disabledColor = DEFAULT_SELECT_ARROW_COLOR_DISABLED;
	}

	if (options.size === undefined || options.size === null) {
		options.size = DEFAULT_SELECT_ARROW_SIZE;
	}

	if (options.thickness === undefined || options.thickness === null) {
		options.thickness = DEFAULT_SELECT_ARROW_THICKNESS;
	}

	if (!options.lineCap) {
		options.lineCap = DEFAULT_SELECT_ARROW_LINE_CAP;
	}

	if (!options.lineJoin) {
		options.lineJoin = DEFAULT_SELECT_ARROW_LINE_JOIN;
	}

	return options;
}

const fillDropdownOptions = (options?: IDropdownOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.overlayClassName) {
		options.overlayClassName = DEFAULT_DROPDOWN_OVERLAY_CLASS_NAME;
	}

	if (options.maxHeight === undefined || options.maxHeight === null) {
		options.maxHeight = DEFAULT_DROPDOWN_MAX_HEIGHT;
	}

	return options;
}
