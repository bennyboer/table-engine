import {IRendererOptions, fillOptions as fillRendererOptions} from "./renderer/options";
import {ISelectionOptions, fillOptions as fillSelectionOptions} from "./selection/options";

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

	return options;
};
