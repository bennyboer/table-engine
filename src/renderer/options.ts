import {fillOptions as fillCanvasKitRendererOptions, ICanvasKitRendererOptions} from "./canvaskit/options";
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
	 * Options for the HTML5 canvas renderer.
	 */
	canvas?: ICanvasRendererOptions;

	/**
	 * Options for the Skia CanvasKit renderer.
	 */
	canvasKit?: ICanvasKitRendererOptions;

	/**
	 * Settings for the custom renderer.
	 */
	custom?: any;

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
	} else if (options.type === RendererType.CANVAS_KIT) {
		options.canvasKit = fillCanvasKitRendererOptions(options.canvasKit);
	}

	return options;
};
