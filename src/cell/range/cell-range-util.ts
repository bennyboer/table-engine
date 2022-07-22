import { ICellRange } from './cell-range';

/**
 * Utility methods that are cell range related.
 */
export class CellRangeUtil {
	/**
	 * Whether the range only spans over one row and column.
	 * @param range to check
	 */
	public static isSingleRowColumnRange(range: ICellRange): boolean {
		return (
			range.startRow === range.endRow &&
			range.startColumn === range.endColumn
		);
	}

	/**
	 * Check whether the given range is contained in the other range.
	 * @param range to check whether it is contained in the second range
	 * @param containedIn range that contains the first range
	 */
	public static contains(
		range: ICellRange,
		containedIn: ICellRange
	): boolean {
		return (
			range.startRow >= containedIn.startRow &&
			range.startColumn >= containedIn.startColumn &&
			range.endRow <= containedIn.endRow &&
			range.endColumn <= containedIn.endColumn
		);
	}

	/**
	 * Check whether the two given cell ranges overlap.
	 * @param a first cell range
	 * @param b second cell range
	 */
	public static overlap(a: ICellRange, b: ICellRange): boolean {
		const cantOverlapVertically: boolean =
			a.startRow > b.endRow || a.endRow < b.startRow;
		if (cantOverlapVertically) {
			return false;
		}

		const cantOverlapHorizontally: boolean =
			a.startColumn > b.endColumn || a.endColumn < b.startColumn;
		return !cantOverlapHorizontally;
	}

	/**
	 * Apply the AND operation on two cell ranges.
	 * Will return the cell range that overlaps or null if they do not overlap.
	 * @param a first cell range
	 * @param b second cell range
	 */
	public static and(a: ICellRange, b: ICellRange): ICellRange | null {
		// First and foremost check that the two cell ranges overlap
		if (!CellRangeUtil.overlap(a, b)) {
			return null;
		}

		return {
			startRow: Math.max(a.startRow, b.startRow),
			endRow: Math.min(a.endRow, b.endRow),
			startColumn: Math.max(a.startColumn, b.startColumn),
			endColumn: Math.min(a.endColumn, b.endColumn),
		};
	}

	/**
	 * Apply the exclusive or (XOR) operation on two cell ranges.
	 * @param a first cell range
	 * @param b second cell range
	 */
	public static xor(a: ICellRange, b: ICellRange): ICellRange[] {
		const result: ICellRange[] = [];

		// Cut top rows if necessary
		if (a.startRow !== b.startRow) {
			result.push({
				startRow: Math.min(a.startRow, b.startRow),
				endRow: Math.max(a.startRow, b.startRow) - 1, // Exclusive!
				startColumn: Math.min(a.startColumn, b.startColumn),
				endColumn: Math.max(a.endColumn, b.endColumn),
			});
		}

		// Cut bottom rows in necessary
		if (a.endRow !== b.endRow) {
			result.push({
				startRow: Math.min(a.endRow, b.endRow) + 1, // Exclusive!
				endRow: Math.max(a.endRow, b.endRow),
				startColumn: Math.min(a.startColumn, b.startColumn),
				endColumn: Math.max(a.endColumn, b.endColumn),
			});
		}

		// Cut left columns in between already cut rows
		if (a.startColumn !== b.startColumn) {
			result.push({
				startRow: Math.max(a.startRow, b.startRow),
				endRow: Math.min(a.endRow, b.endRow),
				startColumn: Math.min(a.startColumn, b.startColumn),
				endColumn: Math.max(a.startColumn, b.startColumn) - 1, // Exclusive!
			});
		}

		// Cut right columns in between already cut rows
		if (a.endColumn !== b.endColumn) {
			result.push({
				startRow: Math.max(a.startRow, b.startRow),
				endRow: Math.min(a.endRow, b.endRow),
				startColumn: Math.min(a.endColumn, b.endColumn) + 1, // Exclusive!
				endColumn: Math.max(a.endColumn, b.endColumn),
			});
		}

		return result;
	}

	/**
	 * Check whether the given range is the same as the other range.
	 * @param a first range to check for equality
	 * @param b second range to check for equality
	 */
	public static equals(a: ICellRange, b: ICellRange): boolean {
		return (
			a.startRow === b.startRow &&
			a.startColumn === b.startColumn &&
			a.endRow === b.endRow &&
			a.endColumn === b.endColumn
		);
	}

	/**
	 * Calculate the size of the range.
	 * @param range to calculate size for
	 */
	public static size(range: ICellRange): number {
		const width: number = range.endColumn - range.startColumn + 1;
		const height: number = range.endRow - range.startRow + 1;

		return width * height;
	}
}
