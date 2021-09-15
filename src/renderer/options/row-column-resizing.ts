/**
 * Options for resizing rows and columns.
 */
export interface IRowColumnResizingOptions {

	/**
	 * Whether the user is allowed to resize rows or columns.
	 */
	allowResizing?: boolean;

	/**
	 * Number of rows to allow resizing for (counting from above).
	 * If set to 1, only resizing between columns in the first row is allowed.
	 */
	rowCount?: number;

	/**
	 * Number of columns to allow resizing for (counting from left).
	 * If set to 1, only resizing between rows in the first column is allowed.
	 */
	columnCount?: number;

}

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: IRowColumnResizingOptions) => {
	if (!options) {
		options = {};
	}

	if (options.allowResizing === undefined || options.allowResizing === null) {
		options.allowResizing = false;
	}

	if (options.rowCount === undefined || options.rowCount === null) {
		options.rowCount = 1;
	}

	if (options.columnCount === undefined || options.columnCount === null) {
		options.columnCount = 1;
	}

	return options;
};
