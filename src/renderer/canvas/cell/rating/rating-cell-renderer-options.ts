import {IColor} from "../../../../util/color";
import {Colors} from "../../../../util/colors";

export const DEFAULT_STAR_COUNT: number = 5;
export const DEFAULT_COLOR: IColor = Colors.ORANGE;
export const DEFAULT_SPACING: number = 2;
export const DEFAULT_PADDING: number = 2;

/**
 * Options for the rating cell renderer.
 */
export interface IRatingCellRendererOptions {

	/**
	 * Whether the rating is editable.
	 */
	editable?: boolean;

	/**
	 * Count of stars to be rendered.
	 */
	starCount?: number;

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

	if (options.maxValue === undefined || options.maxValue === null) {
		options.maxValue = options.starCount;
	}

	if (!options.color) {
		options.color = DEFAULT_COLOR;
	}

	if (options.spacing === undefined || options.spacing === null) {
		options.spacing = DEFAULT_SPACING;
	}

	if (options.padding === undefined || options.padding === null) {
		options.padding = DEFAULT_PADDING;
	}

	return options;
}
