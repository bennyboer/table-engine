import {ICellRange} from "./cell-range";

/**
 * Utility methods that are cell range related.
 */
export class CellRangeUtil {

	/**
	 * Whether the range only spans over one row and column.
	 * @param range to check
	 */
	public static isSingleRowColumnRange(range: ICellRange): boolean {
		return range.startRow === range.endRow && range.startColumn === range.endColumn;
	}

	/**
	 * Check whether the given range is contained in the other range.
	 * @param range to check whether it is contained in the second range
	 * @param containedIn range that contains the first range
	 */
	public static contains(range: ICellRange, containedIn: ICellRange): boolean {
		return range.startRow >= containedIn.startRow
			&& range.startColumn >= containedIn.startColumn
			&& range.endRow <= containedIn.endRow
			&& range.endColumn <= containedIn.endColumn;
	}

	/**
	 * Check whether the given range is the same as the other range.
	 * @param a first range to check for equality
	 * @param b second range to check for equality
	 */
	public static equals(a: ICellRange, b: ICellRange): boolean {
		return a.startRow === b.startRow
			&& a.startColumn === b.startColumn
			&& a.endRow === b.endRow
			&& a.endColumn === b.endColumn;
	}

}
