import {ICellRange} from "./range/cell-range";

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
	 * Value of the cell - may be anything.
	 * A concrete renderer is dealing with interpreting the value later,
	 * thus the value type is not of concern for the library.
	 */
	value: any;
}
