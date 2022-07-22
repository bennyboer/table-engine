import { ITextCellRendererOptions } from './text-cell-renderer-options';

/**
 * Value of a cell to be rendered by the text cell renderer.
 * If the value of a cell is of this interface, you can customize
 * the options of the cell renderer for this cell.
 * If you do not need customizing the cell renderer options for individual cell values,
 * you can just pass a string as value for the cell and do not really need to use this interface.
 */
export interface ITextCellRendererValue {
	/**
	 * Text to render.
	 */
	text: string;

	/**
	 * Options to apply to the cell rendering.
	 * If not set the default options of the text cell renderer are applied.
	 */
	options?: ITextCellRendererOptions;
}
