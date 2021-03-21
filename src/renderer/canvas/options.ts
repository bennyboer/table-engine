import {fillOptions as fillScrollBarOptions, IScrollBarOptions} from "../options/scrollbar";

/**
 * Duration in milliseconds used to throttle high-rate events
 * such as scrolling that need re-rendering afterwards.
 */
const DEFAULT_LAZY_RENDERING_THROTTLE_DURATION: number = 10;

/**
 * Options for the HTML5 canvas renderer.
 */
export interface ICanvasRendererOptions {

	/**
	 * Lazy rendering throttle duration in milliseconds.
	 * This is used to throttle events that occur in high-rate, such as scrolling
	 * that require a re-render cycle afterwards.
	 * For example specifying 50 will limit re-rendering to only one call per 50 milliseconds
	 * no matter how many events are received in that time-interval.
	 */
	lazyRenderingThrottleDuration?: number;

	/**
	 * Options regarding the scrollbar appearance.
	 */
	scrollBar?: IScrollBarOptions;

}

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: ICanvasRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (options.lazyRenderingThrottleDuration === undefined || options.lazyRenderingThrottleDuration === null) {
		options.lazyRenderingThrottleDuration = DEFAULT_LAZY_RENDERING_THROTTLE_DURATION;
	}

	if (!options.scrollBar) {
		options.scrollBar = {};
	}

	fillScrollBarOptions(options.scrollBar);

	return options;
};
