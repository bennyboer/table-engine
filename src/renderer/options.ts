import {RendererType} from "./renderers";
import {ICanvasRendererOptions, fillOptions as fillCanvasRendererOptions} from "./canvas/options";

/**
 * The default renderer type.
 */
const DEFAULT_RENDERER_TYPE: RendererType = RendererType.CANVAS;

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

}

/**
 * Options customizing the table view.
 */
export interface IViewOptions {

	/**
	 * Number of fixed rows.
	 */
	fixedRows?: number;

	/**
	 * Number of fixed columns.
	 */
	fixedColumns?: number;

}

/**
 * Function used to fill the renderer options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: IRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.view) {
		options.view = {};
	}

	if (options.view.fixedRows === undefined || options.view.fixedRows === null) {
		options.view.fixedRows = 0;
	}

	if (options.view.fixedColumns === undefined || options.view.fixedColumns === null) {
		options.view.fixedColumns = 0;
	}

	if (!options.type) {
		options.type = DEFAULT_RENDERER_TYPE;
	}

	// Fill options based on selected type
	if (options.type === RendererType.CANVAS) {
		options.canvas = fillCanvasRendererOptions(options.canvas);
	}

	return options;
};
