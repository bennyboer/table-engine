/**
 * Options for the selection model.
 */
export interface ISelectionOptions {

	/**
	 * Whether multiple selections are allowed.
	 */
	allowMultiSelection?: boolean;

}

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: ISelectionOptions) => {
	if (!options) {
		options = {};
	}

	if (options.allowMultiSelection === undefined || options.allowMultiSelection === null) {
		options.allowMultiSelection = true;
	}

	return options;
};
