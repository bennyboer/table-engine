import {
	fillOptions as fillScrollBarOptions,
	IScrollBarOptions,
} from '../options/scrollbar';
import {
	fillOptions as fillSelectionOptions,
	ISelectionRenderingOptions,
} from '../options/selection';
import {
	fillOptions as fillScrollingOptions,
	IScrollingOptions,
} from '../options/scrolling';
import {
	fillOptions as fillRowColumnResizingOptions,
	IRowColumnResizingOptions,
} from '../options/row-column-resizing';
import { Colors, IColor } from '../../util';
import { ILineWrapper, TrivialLineWrapper } from './cell/text/line-wrap';

/**
 * Duration in milliseconds used to throttle high-rate events
 * such as scrolling that need re-rendering afterwards.
 */
const DEFAULT_LAZY_RENDERING_THROTTLE_DURATION: number = 10;

const DEFAULT_TOO_SMALL_VIEWPORT_MESSAGE: string =
	'The table cannot be displayed since there is not enough space. Try resizing the window or zooming out.';
const DEFAULT_ERROR_FONT_FAMILY: string = 'sans-serif';
const DEFAULT_ERROR_FONT_SIZE: number = 12;
const DEFAULT_ERROR_LINE_HEIGHT: number = 1.5;
const DEFAULT_ERROR_LINE_WRAPPER: ILineWrapper = new TrivialLineWrapper();
const DEFAULT_ERROR_BACKGROUND_COLOR: IColor = Colors.LIGHTEST_GRAY;
const DEFAULT_ERROR_TEXT_COLOR: IColor = Colors.DARKGRAY;
const DEFAULT_ERROR_PADDING: number = 10;

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

	/**
	 * Options regarding the selection appearance.
	 */
	selection?: ISelectionRenderingOptions;

	/**
	 * Options regarding scrolling.
	 */
	scrolling?: IScrollingOptions;

	/**
	 * Options for resizing rows and columns.
	 */
	rowColumnResizing?: IRowColumnResizingOptions;

	/**
	 * Options regarding error rendering.
	 * For example when the table viewport is too small to render the table because of fixed areas.
	 */
	error?: IErrorOptions;
}

/**
 * Rendering options that come into play when the table cannot be rendered.
 * This might happen when the canvas element is too small to display the table
 * because of fixed areas.
 */
export interface IErrorOptions {
	/**
	 * Error message that is displayed when the tables viewport (canvas element)
	 * is too small to display the table.
	 * This might happen when having fixed areas that cut a fixed width/height
	 * from the scrollable area which may lead to having no scrollable area
	 * at all.
	 */
	tooSmallViewportMessage?: string;

	/**
	 * Font family the error message is displayed with.
	 */
	fontFamily?: string;

	/**
	 * Font size the error message is displayed with.
	 */
	fontSize?: number;

	/**
	 * Line height factor based on the given font size.
	 * Give a value like for example 1.0 which will mean the line height
	 * is exactly the font size.
	 */
	lineHeight?: number;

	/**
	 * Line wrapper to use to wrap the error message to lines for rendering.
	 */
	lineWrapper?: ILineWrapper;

	/**
	 * Background color of the canvas when an error message is displayed.
	 */
	backgroundColor?: IColor;

	/**
	 * Color to draw the error messages with.
	 */
	textColor?: IColor;

	/**
	 * Padding used to separate the error message from the boundaries
	 * of the canvas.
	 */
	padding?: number;
}

const fillErrorOptions = (options?: IErrorOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.tooSmallViewportMessage) {
		options.tooSmallViewportMessage = DEFAULT_TOO_SMALL_VIEWPORT_MESSAGE;
	}

	if (options.fontSize === undefined || options.fontSize === null) {
		options.fontSize = DEFAULT_ERROR_FONT_SIZE;
	}

	if (options.lineHeight === undefined || options.lineHeight === null) {
		options.lineHeight = DEFAULT_ERROR_LINE_HEIGHT;
	}

	if (!options.lineWrapper) {
		options.lineWrapper = DEFAULT_ERROR_LINE_WRAPPER;
	}

	if (!options.fontFamily) {
		options.fontFamily = DEFAULT_ERROR_FONT_FAMILY;
	}

	if (!options.backgroundColor) {
		options.backgroundColor = DEFAULT_ERROR_BACKGROUND_COLOR;
	}

	if (!options.textColor) {
		options.textColor = DEFAULT_ERROR_TEXT_COLOR;
	}

	if (options.padding === undefined || options.padding === null) {
		options.padding = DEFAULT_ERROR_PADDING;
	}

	return options;
};

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: ICanvasRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (
		options.lazyRenderingThrottleDuration === undefined ||
		options.lazyRenderingThrottleDuration === null
	) {
		options.lazyRenderingThrottleDuration =
			DEFAULT_LAZY_RENDERING_THROTTLE_DURATION;
	}

	options.scrollBar = fillScrollBarOptions(options.scrollBar);
	options.selection = fillSelectionOptions(options.selection);
	options.scrolling = fillScrollingOptions(options.scrolling);
	options.rowColumnResizing = fillRowColumnResizingOptions(
		options.rowColumnResizing
	);
	options.error = fillErrorOptions(options.error);

	return options;
};
