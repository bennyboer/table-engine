/**
 * Default speed factor for touch scrolling.
 */
const DEFAULT_TOUCH_SCROLLING_SPEED_FACTOR: number = 100;

/**
 * Default touch scrolling acceleration.
 * Negative means slowing, positive means accelerating.
 * So this value should be negative to slow when the user
 * touch swipes on the phone to scroll the table.
 */
const DEFAULT_TOUCH_SCROLLING_ACCELERATION: number = -600;

/**
 * Options regarding scrolling.
 */
export interface IScrollingOptions {
	/**
	 * Speed factor for touch scrolling.
	 * The higher, the more impact a scroll when swiping fast.
	 */
	touchScrollingSpeedFactor?: number;

	/**
	 * Negative means slowing, positive means accelerating.
	 * So this value should be negative to slow when the user
	 * touch swipes on the phone to scroll the table.
	 */
	touchScrollingAcceleration?: number;
}

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: IScrollingOptions) => {
	if (!options) {
		options = {};
	}

	if (
		options.touchScrollingSpeedFactor === undefined ||
		options.touchScrollingSpeedFactor === null
	) {
		options.touchScrollingSpeedFactor =
			DEFAULT_TOUCH_SCROLLING_SPEED_FACTOR;
	}

	if (
		options.touchScrollingAcceleration === undefined ||
		options.touchScrollingAcceleration === null
	) {
		options.touchScrollingAcceleration =
			DEFAULT_TOUCH_SCROLLING_ACCELERATION;
	}

	return options;
};
