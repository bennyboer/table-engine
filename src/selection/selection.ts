import {ICellRange} from "../cell/range/cell-range";

/**
 * Representation of a selection.
 */
export interface ISelection {

	/**
	 * Range of the selection.
	 */
	range: ICellRange;

	/**
	 * Initial position of the selection.
	 */
	initial: IInitialPosition;

}

/**
 * Initial position of a selection.
 * This is needed for example for the keyboard navigation
 * when navigating over merged cells.
 */
export interface IInitialPosition {

	/**
	 * Initial selected row.
	 */
	row: number;

	/**
	 * Initial selected column.
	 */
	column: number;

}
