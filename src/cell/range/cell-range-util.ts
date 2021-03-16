import {ICellRange} from "./cell-range";
import {ICell} from "../cell";

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

}
