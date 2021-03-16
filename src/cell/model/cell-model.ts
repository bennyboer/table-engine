import {ICell} from "../cell";
import {CellRange, ICellRange} from "../range/cell-range";

/**
 * Model managing cells and their position and size in the table.
 */
export class CellModel {

	/**
	 * Size for each row.
	 */
	private readonly _rowSizes: number[];

	/**
	 * Size for each column.
	 */
	private readonly _columnSizes: number[];

	/**
	 * Offset for each row.
	 * Size will always be ROW_COUNT.
	 * Note that for the first row the offset is always 0 and thus it
	 * is not included in this list.
	 */
	private readonly _rowOffsets: number[];

	/**
	 * Offset for each column.
	 * Size will always be COLUMN_COUNT.
	 * Note that for the first column the offset is always 0 and thus it
	 * is not included in this list.
	 */
	private readonly _columnOffsets: number[];

	/**
	 * Currently hidden rows.
	 */
	private readonly _hiddenRows: Set<number>;

	/**
	 * Currently hidden columns.
	 */
	private readonly _hiddenColumns: Set<number>;

	/**
	 * Lookup of cells for each row and column in the table.
	 * Individual cell references may appear multiple times
	 * when encountering cells ranging over multiple rows/columns.
	 *
	 * Note that entries in the lookup may be null when there is an
	 * empty cell.
	 * We've chosen to insert null instead of an actual object to save
	 * some memory.
	 */
	private readonly _cellLookup: Array<Array<ICell | null>>;

	constructor(cellLookup: Array<Array<ICell | null>>, rowSizes: number[], columnSizes: number[], hiddenRows: Set<number>, hiddenColumns: Set<number>) {
		this._cellLookup = cellLookup;
		this._rowSizes = rowSizes;
		this._columnSizes = columnSizes;
		this._hiddenRows = hiddenRows;
		this._hiddenColumns = hiddenColumns;

		this._rowOffsets = CellModel._calculateOffsets(rowSizes, hiddenRows);
		this._columnOffsets = CellModel._calculateOffsets(columnSizes, hiddenColumns);
	}

	/**
	 * Initialize a cell model from the passed size.
	 * @param cells to fill cell model with
	 * @param emptyCellValueSupplier supplies values for empty cells
	 * @param rowSizeSupplier supplies size for each row
	 * @param columnSizeSupplier supplies size for each column
	 * @param hiddenRows supplies whether a row is hidden
	 * @param hiddenColumns supplies whether a column is hidden
	 */
	public static generate(
		cells: ICell[],
		emptyCellValueSupplier: (row: number, column: number) => any,
		rowSizeSupplier: (row: number) => number,
		columnSizeSupplier: (column: number) => number,
		hiddenRows: Set<number>,
		hiddenColumns: Set<number>
	): CellModel {
		// Find row and column count first
		// Additionally save cells by their row and column key for later lookup
		const cellsByKey: Map<string, ICell> = new Map<string, ICell>();
		let maxRowIndex: number = 0;
		let maxColumnIndex: number = 0;
		for (const cell of cells) {
			const key: string = `${cell.range.startRow}_${cell.range.startColumn}`;
			cellsByKey.set(key, cell);

			if (cell.range.endRow > maxRowIndex) {
				maxRowIndex = cell.range.endRow;
			}
			if (cell.range.endColumn > maxColumnIndex) {
				maxColumnIndex = cell.range.endColumn;
			}
		}

		// Allocate cell lookup matrix
		const rowCount = maxRowIndex + 1;
		const columnCount = maxColumnIndex + 1;
		const cellLookup: Array<Array<ICell | null>> = new Array(rowCount);
		for (let row = 0; row < rowCount; row++) {
			cellLookup[row] = new Array(columnCount);
		}

		// Find row and column sizes
		const rowSizes = new Array(rowCount);
		for (let row = 0; row < rowCount; row++) {
			rowSizes[row] = rowSizeSupplier(row);
		}
		const columnSizes = new Array(columnCount);
		for (let column = 0; column < columnCount; column++) {
			columnSizes[column] = columnSizeSupplier(column);
		}

		// Fill cell lookup with cells
		for (let row = 0; row < rowCount; row++) {
			for (let column = 0; column < columnCount; column++) {
				const cellAlreadyFilledInLookup: boolean = !!cellLookup[row][column];
				if (!cellAlreadyFilledInLookup) {
					// Create new cell and fill lookup
					const cell: ICell = cellsByKey.get(`${row}_${column}`);
					if (!!cell) {
						// Fill cell into lookup
						for (let r = cell.range.startRow; r <= cell.range.endRow; r++) {
							for (let c = cell.range.startColumn; c <= cell.range.endColumn; c++) {
								cellLookup[row][column] = cell;
							}
						}
					} else {
						// Encountered empty cell
						const value: any = emptyCellValueSupplier(row, column);
						if (!!value) {
							cellLookup[row][column] = {
								value,
								range: CellRange.fromSingleRowColumn(row, column)
							};
						} else {
							/*
							We fill the lookup with null instead of a ICell instance here
							to save some memory.
							 */
							cellLookup[row][column] = null;
						}
					}
				}
			}
		}

		return new CellModel(cellLookup, rowSizes, columnSizes, hiddenRows, hiddenColumns);
	}

	/**
	 * Calculate offsets for the given array of row/column sizes and hidden rows/columns.
	 * @param sizes to calculate offsets from
	 * @param hidden rows/columns that need to be left out
	 */
	private static _calculateOffsets(sizes: number[], hidden: Set<number>): number[] {
		const result = new Array(sizes.length);

		let currentOffset = 0;
		for (let i = 0; i < sizes.length; i++) {
			const isHidden = hidden.has(i);
			if (!isHidden) {
				currentOffset += sizes[i];
			}

			result[i] = currentOffset;
		}

		return result;
	}

	/**
	 * Get the total width of the table.
	 */
	public getWidth(): number {
		return this._columnOffsets[this._columnOffsets.length - 1];
	}

	/**
	 * Get the total height of the table.
	 */
	public getHeight(): number {
		return this._rowOffsets[this._rowOffsets.length - 1];
	}

	/**
	 * Get the size of a specific row with the given index.
	 * @param index of the row
	 */
	public getRowSize(index: number): number {
		return this._rowSizes[index];
	}

	/**
	 * Get the size of a specific column with the given index.
	 * @param index of the column
	 */
	public getColumnSize(index: number): number {
		return this._columnSizes[index];
	}

	/**
	 * Get the offset of the row with the given index.
	 * @param index of the row
	 */
	public getRowOffset(index: number): number {
		return CellModel._getOffset(this._rowOffsets, index);
	}

	/**
	 * Get the offset of the column with the given index.
	 * @param index of the column
	 */
	public getColumnOffset(index: number): number {
		return CellModel._getOffset(this._columnOffsets, index);
	}

	/**
	 * Get the offset at the given index for the passed offset collection.
	 * @param offsets to get offset in
	 * @param index to get offset for
	 */
	private static _getOffset(offsets: number[], index: number): number {
		if (index === 0) {
			return 0.0;
		}

		return offsets[index - 1];
	}

	/**
	 * Resize the rows at the given row indices to the passed size.
	 * @param rowIndices indices of rows to resize
	 * @param size new size for the rows to resize
	 */
	public resizeRows(rowIndices: number[], size: number): void {
		CellModel._resize(this._rowSizes, this._rowOffsets, this._hiddenRows, rowIndices, size);
	}

	/**
	 * Resize the columns at the given column indices to the passed size.
	 * @param columnIndices indices of columns to resize
	 * @param size new size for the columns to resize
	 */
	public resizeColumns(columnIndices: number[], size: number): void {
		CellModel._resize(this._columnSizes, this._columnOffsets, this._hiddenColumns, columnIndices, size);
	}

	/**
	 * Resize rows/columns with the given indices in the cell model.
	 * @param sizes array to update
	 * @param offsets array to update
	 * @param hiddenIndices lookup for hidden rows/column indices
	 * @param indices to resize at
	 * @param size to resize to
	 */
	private static _resize(
		sizes: number[],
		offsets: number[],
		hiddenIndices: Set<number>,
		indices: number[],
		size: number
	): void {
		/*
		Do this by adjusting the offsets collection.
		We need to update all offsets after the first index in the indices list.
		 */

		// Sort indices first from lower to higher
		indices.sort((n1, n2) => n1 - n2);

		let sizeSum: number = 0; // Total size added/subtracted until now
		let resizedCount = 1; // Total count of indices resized (of the given indices to resize array)

		// Resize first index as preparation
		if (!hiddenIndices.has(indices[0])) {
			sizeSum += size - sizes[indices[0]]
		}
		sizes[indices[0]] = size;

		// Iterate over all offset indices and update offsets lookup
		let nextResizeIndex = indices.length > resizedCount ? indices[resizedCount] : -1; // Next index in the indices to resize array
		for (let i = indices[0]; i < offsets.length; i++) {
			// Update offsets
			offsets[i] += sizeSum;

			// Check if i is the next index to resize
			if (i + 1 === nextResizeIndex) {
				// Add/substract the size difference to/from sizeSum (when not hidden)
				const isHidden = hiddenIndices.has(nextResizeIndex);
				if (!isHidden) {
					sizeSum += size - sizes[nextResizeIndex];
				}

				// Update the actual sizes array
				sizes[nextResizeIndex] = size;
				resizedCount++;

				if (indices.length > resizedCount) {
					nextResizeIndex = indices[resizedCount];
				} else {
					nextResizeIndex = -1; // No more indices to resize
				}
			}
		}
	}

	/**
	 * Insert rows before the given index.
	 * @param insertBeforeIndex index to insert rows before
	 * @param count of rows to insert
	 */
	public insertRows(insertBeforeIndex: number, count: number): void {
		// TODO
	}

	/**
	 * Delete rows starting with the given index.
	 * @param fromIndex index to start deleting rows from (inclusively)
	 * @param count of rows to delete
	 */
	public deleteRows(fromIndex: number, count: number): void {
		// TODO
	}

	/**
	 * Insert columns before the given index.
	 * @param insertBeforeIndex index to insert columns before
	 * @param count of columns to insert
	 */
	public insertColumns(insertBeforeIndex: number, count: number): void {
		// TODO
	}

	/**
	 * Delete columns starting with the given index.
	 * @param fromIndex index to start deleting columns from (inclusively)
	 * @param count of columns to delete
	 */
	public deleteColumns(fromIndex: number, count: number): void {
		// TODO
	}

	/**
	 * Merge the passed range to a single cell.
	 * Note that this will only succeed when the range
	 * does not intersect cells spanning multiple rows and columns (will return false).
	 * @param range to merge
	 * @returns whether the cells could be merged
	 */
	public mergeCells(range: ICellRange): boolean {
		return true; // TODO
	}

	/**
	 * Split a cell spanning multiple rows and columns at the given
	 * row index and column index.
	 * @param rowIndex index of the row the cell is at
	 * @param columnIndex index of the column the cell is at
	 */
	public splitCell(rowIndex: number, columnIndex: number): void {
		// TODO
	}

	/**
	 * Hide the given range of rows.
	 * @param fromIndex index to start hiding rows from (inclusively)
	 * @param count of rows to hide
	 */
	public hideRows(fromIndex: number, count: number): void {
		// TODO
	}

	/**
	 * Show hidden rows in the given range of rows.
	 * @param fromIndex index to start showing hidden rows from (inclusively)
	 * @param count of rows to show
	 */
	public showRows(fromIndex: number, count: number): void {
		// TODO
	}

	/**
	 * Hide the given range of columns.
	 * @param fromIndex index to start hiding columns from (inclusively)
	 * @param count of columns to hide
	 */
	public hideColumns(fromIndex: number, count: number): void {
		// TODO
	}

	/**
	 * Show hidden columns in the given range of columns.
	 * @param fromIndex index to start showing hidden columns from (inclusively)
	 * @param count of columns to show
	 */
	public showColumns(fromIndex: number, count: number): void {
		// TODO
	}

	/**
	 * Show all hidden rows and columns.
	 */
	public showAll(): void {
		// TODO
	}

}
