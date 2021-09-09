import {IColor} from "../../util/color";

/**
 * Default primary selection border color.
 */
const DEFAULT_PRIMARY_SELECTION_BORDER_COLOR: IColor = {red: 255, green: 51, blue: 102, alpha: 1.0};

/**
 * Default primary selection background color.
 */
const DEFAULT_PRIMARY_SELECTION_BACKGROUND_COLOR: IColor = {red: 204, green: 0, blue: 51, alpha: 0.1};

/**
 * Default primary selection border color when table is not focused.
 */
const DEFAULT_PRIMARY_SELECTION_BORDER_COLOR_UNFOCUSED: IColor = {red: 255, green: 102, blue: 140, alpha: 0.5};

/**
 * Default primary selection background color when table is not focused.
 */
const DEFAULT_PRIMARY_SELECTION_BACKGROUND_COLOR_UNFOCUSED: IColor = {red: 150, green: 150, blue: 150, alpha: 0.1};

/**
 * Default secondary selection border color.
 */
const DEFAULT_SECONDARY_SELECTION_BORDER_COLOR: IColor = {red: 150, green: 150, blue: 150, alpha: 0.75};

/**
 * Default secondary selection background color.
 */
const DEFAULT_SECONDARY_SELECTION_BACKGROUND_COLOR: IColor = {red: 50, green: 50, blue: 50, alpha: 0.1};

/**
 * Default secondary selection border color when table is not focused.
 */
const DEFAULT_SECONDARY_SELECTION_BORDER_COLOR_UNFOCUSED: IColor = {red: 200, green: 200, blue: 200, alpha: 0.75};

/**
 * Default secondary selection background color when table is not focused.
 */
const DEFAULT_SECONDARY_SELECTION_BACKGROUND_COLOR_UNFOCUSED: IColor = {red: 150, green: 150, blue: 150, alpha: 0.1};

/**
 * Default selection border size.
 */
const DEFAULT_SELECTION_BORDER_SIZE: number = 1;

/**
 * The default automatic scrolling speed.
 */
const DEFAULT_AUTO_SCROLL_SPEED: number = 3;

/**
 * Default offset of the selection rectangle.
 */
const DEFAULT_SELECTION_OFFSET: number = 1;

/**
 * Default copy-handle size (width and height).
 */
const DEFAULT_COPY_HANDLE_SIZE: number = 5;

/**
 * Default padding of the copy-handle from the selection border.
 */
const DEFAULT_COPY_HANDLE_PADDING: number = 2;

/**
 * Options regarding the selection to display.
 */
export interface ISelectionRenderingOptions {

	/**
	 * Size of the selection border.
	 */
	borderSize?: number;

	/**
	 * Offset of the selection rectangle.
	 * A value of 0 means to be on the very edge of the cell,
	 * 1 means to be inset by 1 pixel,
	 * -1 means to be outset by 1 pixel.
	 */
	offset?: number;

	/**
	 * Colors for the primary selection.
	 */
	primary?: ISelectionColors;

	/**
	 * Colors for the secondary selection.
	 */
	secondary?: ISelectionColors;

	/**
	 * Speed for automatic scrolling (when selection is in progress and mouse is moving outside viewport bounds).
	 */
	autoScrollingSpeed?: number;

	/**
	 * Rendering options for the copy-handle (if enabled).
	 */
	copyHandle?: ICopyHandleRenderingOptions;

}

/**
 * Rendering options for the copy-handle.
 */
export interface ICopyHandleRenderingOptions {

	/**
	 * Size of the copy-handle (width and height).
	 */
	size?: number;

	/**
	 * Padding from the selection rectangle border.
	 */
	padding?: number;

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

	/**
	 * Background color of the selection rectangle when the table is not focused.
	 */
	backgroundColorUnfocused?: IColor;

	/**
	 * Color of the border when the table is not focused.
	 */
	borderColorUnfocused?: IColor;

}

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: ISelectionRenderingOptions) => {
	if (!options) {
		options = {};
	}

	if (options.borderSize === undefined || options.borderSize === null) {
		options.borderSize = DEFAULT_SELECTION_BORDER_SIZE;
	}

	if (options.offset === undefined || options.offset === null) {
		options.offset = DEFAULT_SELECTION_OFFSET;
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

	if (!options.primary.backgroundColorUnfocused) {
		options.primary.backgroundColorUnfocused = DEFAULT_PRIMARY_SELECTION_BACKGROUND_COLOR_UNFOCUSED;
	}

	if (!options.primary.borderColorUnfocused) {
		options.primary.borderColorUnfocused = DEFAULT_PRIMARY_SELECTION_BORDER_COLOR_UNFOCUSED;
	}

	if (!options.secondary.backgroundColor) {
		options.secondary.backgroundColor = DEFAULT_SECONDARY_SELECTION_BACKGROUND_COLOR;
	}

	if (!options.secondary.borderColor) {
		options.secondary.borderColor = DEFAULT_SECONDARY_SELECTION_BORDER_COLOR;
	}

	if (!options.secondary.backgroundColorUnfocused) {
		options.secondary.backgroundColorUnfocused = DEFAULT_SECONDARY_SELECTION_BACKGROUND_COLOR_UNFOCUSED;
	}

	if (!options.secondary.borderColorUnfocused) {
		options.secondary.borderColorUnfocused = DEFAULT_SECONDARY_SELECTION_BORDER_COLOR_UNFOCUSED;
	}

	if (options.autoScrollingSpeed === undefined || options.autoScrollingSpeed === null) {
		options.autoScrollingSpeed = DEFAULT_AUTO_SCROLL_SPEED;
	}

	if (!options.copyHandle) {
		options.copyHandle = {};
	}

	if (options.copyHandle.size === null || options.copyHandle.size === undefined) {
		options.copyHandle.size = DEFAULT_COPY_HANDLE_SIZE;
	}

	if (options.copyHandle.padding === null || options.copyHandle.padding === undefined) {
		options.copyHandle.padding = DEFAULT_COPY_HANDLE_PADDING;
	}

	return options;
};

