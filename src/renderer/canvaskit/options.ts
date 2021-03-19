/**
 * Default canvas kit version to use.
 */
const DEFAULT_CANVAS_KIT_VERSION: string = "0.25.0";

/**
 * URL to the bin folder of the Skia CanvasKit library to use by default.
 * In the bin folder the CanvasKit library will need to lookup the wasm code file to execute.
 */
const DEFAULT_CANVAS_KIT_LIB_BIN_URL: string = `https://unpkg.com/canvaskit-wasm@${DEFAULT_CANVAS_KIT_VERSION}/bin/`;

/**
 * Options of the Skia CanvasKit renderer.
 */
export interface ICanvasKitRendererOptions {

	/**
	 * URL to the bin fodler of the Skia CanvasKit library to use.
	 * This is needed as Skia CanvasKit is based on WASM where we need
	 * to load the WASM code first from the bin folder.
	 */
	canvasKitLibBinURL?: string;

}

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: ICanvasKitRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.canvasKitLibBinURL) {
		options.canvasKitLibBinURL = DEFAULT_CANVAS_KIT_LIB_BIN_URL;
	}

	return options;
};
