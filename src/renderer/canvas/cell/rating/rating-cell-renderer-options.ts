import {IColor} from "../../../../util/color";
import {Colors} from "../../../../util/colors";
import {ICell} from "../../../../cell/cell";

export const DEFAULT_STAR_COUNT: number = 5;
export const DEFAULT_STAR_SPIKE_COUNT: number = 5;
export const DEFAULT_COLOR: IColor = Colors.ORANGE;
export const DEFAULT_INACTIVE_COLOR: IColor = Colors.LIGHTGRAY;
export const DEFAULT_HOVER_BORDER_COLOR: IColor = Colors.ORANGE;
export const DEFAULT_HOVER_BORDER_THICKNESS: number = 1;
export const DEFAULT_SPACING: number = 2;
export const DEFAULT_PADDING: number = 2;

/**
 * Options for the rating cell renderer.
 */
export interface IRatingCellRendererOptions {

	/**
	 * Callback to inform about a change of the rating value.
	 * @param cell that contains the changed value
	 */
	onChanged?: (cell: ICell) => void;

	/**
	 * Whether the rating is editable.
	 */
	editable?: boolean;

	/**
	 * Count of stars to be rendered (default = 5).
	 */
	starCount?: number;

	/**
	 * Number of spikes each star should have (default = 5).
	 */
	spikeCount?: number;

	/**
	 * The maximum rating value which is equal to 100% = all stars!
	 * For example you might want the number 1.0 to be 5 stars instead
	 * of 5 being 5 stars.
	 * By default this value is equal to starCount.
	 */
	maxValue?: number;

	/**
	 * Color of the stars.
	 */
	color?: IColor;

	/**
	 * Color of non-active stars.
	 */
	inactiveColor?: IColor;

	/**
	 * Color of the border of a hovered star.
	 */
	hoverBorderColor?: IColor;

	/**
	 * Thickness of the hover border.
	 */
	hoverBorderThickness?: number;

	/**
	 * Spacing between the stars.
	 */
	spacing?: number;

	/**
	 * Padding from the cells borders.
	 */
	padding?: number;

}

/**
 * Function used to fill the rating cell renderer options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: IRatingCellRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (options.editable === undefined || options.editable === null) {
		options.editable = false;
	}

	if (options.starCount === undefined || options.starCount === null) {
		options.starCount = DEFAULT_STAR_COUNT;
	}

	if (options.spikeCount === undefined || options.spikeCount === null) {
		options.spikeCount = DEFAULT_STAR_SPIKE_COUNT;
	}

	if (options.maxValue === undefined || options.maxValue === null) {
		options.maxValue = options.starCount;
	}

	if (!options.color) {
		options.color = DEFAULT_COLOR;
	}

	if (!options.inactiveColor) {
		options.inactiveColor = DEFAULT_INACTIVE_COLOR;
	}

	if (!options.hoverBorderColor) {
		options.hoverBorderColor = DEFAULT_HOVER_BORDER_COLOR;
	}

	if (options.hoverBorderThickness === undefined || options.hoverBorderThickness === null) {
		options.hoverBorderThickness = DEFAULT_HOVER_BORDER_THICKNESS;
	}

	if (options.spacing === undefined || options.spacing === null) {
		options.spacing = DEFAULT_SPACING;
	}

	if (options.padding === undefined || options.padding === null) {
		options.padding = DEFAULT_PADDING;
	}

	return options;
}
