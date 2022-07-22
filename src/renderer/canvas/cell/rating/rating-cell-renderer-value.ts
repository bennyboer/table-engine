import { IRatingCellRendererOptions } from './rating-cell-renderer-options';

/**
 * Value of the checkbox cell renderer value.
 * Note that the checkbox cell renderer is also able to process
 * a simple number as value for the renderer but using this interface
 * will allow more control and unlock more options.
 */
export interface IRatingCellRendererValue {
	/**
	 * The rating to render.
	 */
	rating: number;

	/**
	 * Options to apply to the cell rendering.
	 * If not set the default options of the rating cell renderer are applied.
	 */
	options?: IRatingCellRendererOptions;
}
