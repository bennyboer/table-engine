import { ICellRange } from './range';
import { IBorder } from '../border';

/**
 * Cell representation of the table engine.
 */
export interface ICell {
	/**
	 * Range of the cell (in terms of rows and columns).
	 */
	range: ICellRange;

	/**
	 * Name of the renderer to use.
	 */
	rendererName: string;

	/**
	 * Value of the cell - may be anything, even null.
	 * A concrete renderer is dealing with interpreting the value later,
	 * thus the value type is not of concern for the library.
	 */
	value: any | null;

	/**
	 * Border of the cell.
	 * Should only be managed by using the border model.
	 */
	border?: IBorder;

	/**
	 * Cache that can be used by renderers and will be cleared once
	 * the cell is out of the current viewport.
	 */
	viewportCache?: any;
}
