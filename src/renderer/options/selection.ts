import {IColor} from "../../util/color";

/**
 * Default primary selection border color.
 */
const DEFAULT_PRIMARY_SELECTION_BORDER_COLOR: IColor = {red: 41, green: 180, blue: 255, alpha: 1.0};

/**
 * Default primary selection background color.
 */
const DEFAULT_PRIMARY_SELECTION_BACKGROUND_COLOR: IColor = {red: 30, green: 120, blue: 180, alpha: 0.2};

/**
 * Default secondary selection border color.
 */
const DEFAULT_SECONDARY_SELECTION_BORDER_COLOR: IColor = {red: 50, green: 50, blue: 50, alpha: 0.4};

/**
 * Default secondary selection background color.
 */
const DEFAULT_SECONDARY_SELECTION_BACKGROUND_COLOR: IColor = {red: 50, green: 50, blue: 50, alpha: 0.2};

/**
 * Default selection border size.
 */
const DEFAULT_SELECTION_BORDER_SIZE: number = 2;

/**
 * Options regarding the selection to display.
 */
export interface ISelectionOptions {

	/**
	 * Size of the selection border.
	 */
	borderSize?: number;

	/**
	 * Colors for the primary selection.
	 */
	primary?: ISelectionColors;

	/**
	 * Colors for the secondary selection.
	 */
	secondary?: ISelectionColors;

}

/**
 * Colors of a selection.
 */
export interface ISelectionColors {

	/**
	 * Background color of the selection rectangle.
	 */
	backgroundColor?: IColor;

	/**
	 * Color of the border.
	 */
	borderColor?: IColor;

}

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: ISelectionOptions) => {
	if (!options) {
		options = {};
	}

	if (options.borderSize === undefined || options.borderSize === null) {
		options.borderSize = DEFAULT_SELECTION_BORDER_SIZE;
	}

	if (!options.primary) {
		options.primary = {};
	}

	if (!options.secondary) {
		options.secondary = {};
	}

	if (!options.primary.backgroundColor) {
		options.primary.backgroundColor = DEFAULT_PRIMARY_SELECTION_BACKGROUND_COLOR;
	}

	if (!options.primary.borderColor) {
		options.primary.borderColor = DEFAULT_PRIMARY_SELECTION_BORDER_COLOR;
	}

	if (!options.secondary.backgroundColor) {
		options.secondary.backgroundColor = DEFAULT_SECONDARY_SELECTION_BACKGROUND_COLOR;
	}

	if (!options.secondary.borderColor) {
		options.secondary.borderColor = DEFAULT_SECONDARY_SELECTION_BORDER_COLOR;
	}

	return options;
};

