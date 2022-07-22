import { ICheckboxCellRendererOptions } from './checkbox-cell-renderer-options';

/**
 * Value of the checkbox cell renderer value.
 * Note that the checkbox cell renderer is also able to process
 * a simple boolean as value for the renderer but using this interface
 * will allow more control and unlock more options.
 */
export interface ICheckboxCellRendererValue {
	/**
	 * Whether the checkbox is checked.
	 */
	checked: boolean;

	/**
	 * Label of the checkbox.
	 */
	label?: string;

	/**
	 * Options to apply to the cell rendering.
	 * If not set the default options of the checkbox cell renderer are applied.
	 */
	options?: ICheckboxCellRendererOptions;
}
