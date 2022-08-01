import { RendererType } from './renderers';
import {
	fillOptions as fillCanvasRendererOptions,
	ICanvasRendererOptions,
} from './canvas/options';
import { INotificationService } from '../util';

/**
 * The default renderer type.
 */
const DEFAULT_RENDERER_TYPE: RendererType = RendererType.CANVAS;

/**
 * Default limit when copying cells.
 */
const DEFAULT_MAX_CELL_COUNT_TO_COPY: number = 10000;

/**
 * Options for the renderer to use.
 */
export interface IRendererOptions {
	/**
	 * Type of renderer to use.
	 */
	type?: RendererType;

	/**
	 * Options regarding the table view to render.
	 */
	view?: IViewOptions;

	/**
	 * Options for the HTML5 canvas renderer.
	 */
	canvas?: ICanvasRendererOptions;

	/**
	 * Settings for the custom renderer.
	 */
	custom?: any;

	/**
	 * Notification service to publish infos, warnings or error over.
	 */
	notificationService?: INotificationService;
}

/**
 * Options customizing the table view.
 */
export interface IViewOptions {
	/**
	 * Options regarding fixed areas of a table.
	 * A fixed area is a part of a table that is always visible and does not scroll.
	 */
	fixedAreas?: IFixedAreasOptions;

	/**
	 * Maximum cell count to allow copying
	 * or negative if no limit.
	 */
	maxCellCountToCopy?: number;
}

/**
 * Options regarding fixed areas of a table.
 * A fixed area is a part of a table that is always visible and does not scroll.
 */
export interface IFixedAreasOptions {
	/**
	 * Amount of rows to fix at the top of the table.
	 */
	top?: number;

	/**
	 * Amount of rows to fix at the bottom of the table.
	 */
	bottom?: number;

	/**
	 * Amount of columns to fix at the left of the table.
	 */
	left?: number;

	/**
	 * Amount of columns to fix at the right of the table.
	 */
	right?: number;
}

/**
 * Function used to fill the renderer options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: IRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.type) {
		options.type = DEFAULT_RENDERER_TYPE;
	}

	// Fill options based on selected type
	if (options.type === RendererType.CANVAS) {
		options.canvas = fillCanvasRendererOptions(options.canvas);
	}

	options.view = fillViewOptions(options.view);

	return options;
};

const fillFixedAreasOptions = (options?: IFixedAreasOptions) => {
	if (!options) {
		options = {};
	}

	if (options.top === undefined || options.top === null) {
		options.top = 0;
	}

	if (options.bottom === undefined || options.bottom === null) {
		options.bottom = 0;
	}

	if (options.left === undefined || options.left === null) {
		options.left = 0;
	}

	if (options.right === undefined || options.right === null) {
		options.right = 0;
	}

	return options;
};

const fillViewOptions = (options?: IViewOptions) => {
	if (!options) {
		options = {};
	}

	if (
		options.maxCellCountToCopy === undefined ||
		options.maxCellCountToCopy === null
	) {
		options.maxCellCountToCopy = DEFAULT_MAX_CELL_COUNT_TO_COPY;
	}

	options.fixedAreas = fillFixedAreasOptions(options.fixedAreas);

	return options;
};
