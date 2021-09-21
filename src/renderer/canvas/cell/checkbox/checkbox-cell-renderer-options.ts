import {IColor} from "../../../../util/color";
import {Colors} from "../../../../util/colors";
import {ICell} from "../../../../cell/cell";

export const DEFAULT_LABEL_FONT_FAMILY: string = "sans-serif";
export const DEFAULT_LABEL_FONT_SIZE: number = 12;
export const DEFAULT_LABEL_TEXT_COLOR: IColor = Colors.BLACK;
export const DEFAULT_CHECKBOX_SIZE: number = 14;
export const DEFAULT_BORDER_SIZE: number = 1;
export const DEFAULT_BORDER_RADIUS: number = 2;
export const DEFAULT_BORDER_COLOR: IColor = Colors.GRAY;
export const DEFAULT_HOVER_BORDER_COLOR: IColor = Colors.DARKGRAY;
export const DEFAULT_UNCHECKED_BACKGROUND_COLOR: IColor = Colors.WHITE;
export const DEFAULT_CHECKED_BACKGROUND_COLOR: IColor = Colors.CORAL;
export const DEFAULT_CHECKED_HOVER_BACKGROUND_COLOR: IColor = Colors.DARKCORAL;
export const DEFAULT_TICK_COLOR: IColor = Colors.WHITE;
export const DEFAULT_DISABLED_OPACITY: number = 0.4;
export const DEFAULT_LABEL_CHECKBOX_SPACING: number = 4;
export const DEFAULT_CHECKBOX_CELL_SPACING: number = 4;
export const DEFAULT_TICK_THICKNESS: number = 2;

/**
 * Options for the checkbox cell renderer.
 */
export interface ICheckboxCellRendererOptions {

	/**
	 * Callback to inform about a change of the checked status of the passed cells value.
	 * @param cell that contains the changed value
	 */
	onCheckedChanged?: (cell: ICell) => void;

	/**
	 * Whether the checkbox is disabled.
	 */
	disabled?: boolean;

	/**
	 * Label text font family name.
	 */
	labelFontFamily?: string;

	/**
	 * Label text font size (in pixel).
	 */
	labelFontSize?: number;

	/**
	 * Label text color.
	 */
	labelTextColor?: IColor;

	/**
	 * Default size of the checkbox (width and height).
	 */
	size?: number;

	/**
	 * Size of the checkbox border.
	 */
	borderSize?: number;

	/**
	 * Radius of the border.
	 */
	borderRadius?: number;

	/**
	 * Color of the checkbox border.
	 */
	borderColor?: IColor;

	/**
	 * Color of the hovered checkbox border.
	 */
	hoverBorderColor?: IColor;

	/**
	 * Background color of the unchecked checkbox.
	 */
	uncheckedBackgroundColor?: IColor;

	/**
	 * Background color of the checked checkbox.
	 */
	checkedBackgroundColor?: IColor;

	/**
	 * Background color of the checked checkbox when hovered.
	 */
	checkedHoverBackgroundColor?: IColor;

	/**
	 * Color of the checkbox tick.
	 */
	tickColor?: IColor;

	/**
	 * Thickness of the tick (when checked).
	 */
	tickThickness?: number;

	/**
	 * Opacity of the background/border color when the checkbox is disabled.
	 */
	disabledOpacity?: number;

	/**
	 * Distance from the checkbox to the label.
	 */
	labelCheckboxSpacing?: number;

	/**
	 * Minimum distance of the checkbox to the left border of the cell.
	 */
	cellSpacing?: number;

}

/**
 * Function used to fill the checkbox cell renderer options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: ICheckboxCellRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (options.disabled === undefined || options.disabled === null) {
		options.disabled = false;
	}

	if (!options.labelFontFamily) {
		options.labelFontFamily = DEFAULT_LABEL_FONT_FAMILY;
	}

	if (options.labelFontSize === undefined || options.labelFontSize === null) {
		options.labelFontSize = DEFAULT_LABEL_FONT_SIZE;
	}

	if (!options.labelTextColor) {
		options.labelTextColor = DEFAULT_LABEL_TEXT_COLOR;
	}

	if (options.size === undefined || options.size === null) {
		options.size = DEFAULT_CHECKBOX_SIZE;
	}

	if (options.borderSize === undefined || options.borderSize === null) {
		options.borderSize = DEFAULT_BORDER_SIZE;
	}

	if (options.borderRadius === undefined || options.borderRadius === null) {
		options.borderRadius = DEFAULT_BORDER_RADIUS;
	}

	if (!options.borderColor) {
		options.borderColor = DEFAULT_BORDER_COLOR;
	}

	if (!options.hoverBorderColor) {
		options.hoverBorderColor = DEFAULT_HOVER_BORDER_COLOR;
	}

	if (!options.uncheckedBackgroundColor) {
		options.uncheckedBackgroundColor = DEFAULT_UNCHECKED_BACKGROUND_COLOR;
	}

	if (!options.checkedBackgroundColor) {
		options.checkedBackgroundColor = DEFAULT_CHECKED_BACKGROUND_COLOR;
	}

	if (!options.checkedHoverBackgroundColor) {
		options.checkedHoverBackgroundColor = DEFAULT_CHECKED_HOVER_BACKGROUND_COLOR;
	}

	if (options.disabledOpacity === undefined || options.disabledOpacity === null) {
		options.disabledOpacity = DEFAULT_DISABLED_OPACITY;
	}

	if (!options.tickColor) {
		options.tickColor = DEFAULT_TICK_COLOR;
	}

	if (options.tickThickness === undefined || options.tickThickness === null) {
		options.tickThickness = DEFAULT_TICK_THICKNESS;
	}

	if (options.labelCheckboxSpacing === undefined || options.labelCheckboxSpacing === null) {
		options.labelCheckboxSpacing = DEFAULT_LABEL_CHECKBOX_SPACING;
	}

	if (options.cellSpacing === undefined || options.cellSpacing === null) {
		options.cellSpacing = DEFAULT_CHECKBOX_CELL_SPACING;
	}

	return options;
}
