/**
 * Default size of the scrollbar.
 */
const DEFAULT_SCROLLBAR_SIZE: number = 10;

/**
 * Default offset of the scrollbar from the edges of the table.
 */
const DEFAULT_SCROLLBAR_OFFSET: number = 1;

/**
 * Default minimum scrollbar length.
 */
const DEFAULT_MIN_SCROLLBAR_LENGTH: number = 30;

/**
 * Default scrollbar rounded corner radius.
 */
const DEFAULT_SCROLLBAR_RADIUS: number = 5;

/**
 * Options regarding the scrollbar to display.
 */
export interface IScrollBarOptions {

	/**
	 * RGBA color of the scrollbar using floating point
	 * numbers.
	 * For example [0.0, 0.0, 0.0, 1.0].
	 */
	color?: [number, number, number, number];

	/**
	 * Size of the scrollbar.
	 */
	size?: number;

	/**
	 * Minimum length of the scrollbar.
	 */
	minLength?: number;

	/**
	 * Offset of the scrollbar from the edges of the viewport.
	 */
	offset?: number;

	/**
	 * Radius of the scrollbars rounded corners.
	 */
	cornerRadius?: number;

}

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: IScrollBarOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.color) {
		options.color = [0.2, 0.2, 0.2, 0.5];
	}

	if (options.size === undefined || options.size === null) {
		options.size = DEFAULT_SCROLLBAR_SIZE;
	}

	if (options.offset === undefined || options.offset === null) {
		options.offset = DEFAULT_SCROLLBAR_OFFSET;
	}

	if (options.minLength === undefined || options.minLength === null) {
		options.minLength = DEFAULT_MIN_SCROLLBAR_LENGTH;
	}

	if (options.cornerRadius === undefined || options.cornerRadius === null) {
		options.cornerRadius = DEFAULT_SCROLLBAR_RADIUS;
	}


	return options;
};

