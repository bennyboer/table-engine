import {fillOptions as fillRendererOptions, IRendererOptions} from "./renderer/options";
import {fillOptions as fillSelectionOptions, ISelectionOptions} from "./selection/options";
import {fillOptions as fillBorderOptions, IBorderOptions} from "./border/options";

/**
 * Options used to modify the table engine behavior.
 */
export interface ITableEngineOptions {

	/**
	 * Options regarding the table-engine renderer.
	 */
	renderer?: IRendererOptions;

	/**
	 * Options regarding the table-engines selection model.
	 */
	selection?: ISelectionOptions;

	/**
	 * Options regarding the table-engines border model.
	 */
	border?: IBorderOptions;

}

/**
 * Function used to fill the table engine options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: ITableEngineOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.renderer) {
		options.renderer = {};
	}
	options.renderer = fillRendererOptions(options.renderer);

	if (!options.selection) {
		options.selection = {};
	}
	options.selection = fillSelectionOptions(options.selection);

	if (!options.border) {
		options.border = {};
	}
	options.border = fillBorderOptions(options.border);

	return options;
};
