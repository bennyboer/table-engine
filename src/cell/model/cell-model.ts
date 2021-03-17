import {ICell} from "../cell";
import {CellRange, ICellRange} from "../range/cell-range";
import {CellRangeUtil} from "../range/cell-range-util";

/**
 * Model managing cells and their position and size in the table.
 */
export class CellModel {

	/**
	 * The default row size.
	 */
	private static readonly DEFAULT_ROW_SIZE: number = 25;

	/**
	 * The default column size.
	 */
	private static readonly DEFAULT_COLUMN_SIZE: number = 100;

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
						if (value !== null && value !== undefined) {
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
			result[i] = currentOffset;

			const isHidden = hidden.has(i);
			if (!isHidden) {
				currentOffset += sizes[i];
			}
		}

		return result;
	}

	/**
	 * Get a cell at the given coordinates.
	 * @param rowIndex to get cell at
	 * @param columnIndex to get cell at
	 */
	public getCell(rowIndex: number, columnIndex: number): ICell | null {
		return this._cellLookup[rowIndex][columnIndex];
	}

	/**
	 * Get the number of rows in the model.
	 */
	public getRowCount(): number {
		return this._rowSizes.length;
	}

	/**
	 * Get the number of columns in the model.
	 */
	public getColumnCount(): number {
		return this._columnSizes.length;
	}

	/**
	 * Get the total width of the table.
	 */
	public getWidth(): number {
		const lastColumnIndex: number = this.getColumnCount() - 1;

		return this._columnOffsets[lastColumnIndex] + (this.isColumnHidden(lastColumnIndex) ? 0.0 : this.getColumnSize(lastColumnIndex));
	}

	/**
	 * Get the total height of the table.
	 */
	public getHeight(): number {
		const lastRowIndex: number = this.getRowCount() - 1;

		return this._rowOffsets[lastRowIndex] + (this.isRowHidden(lastRowIndex) ? 0.0 : this.getRowSize(lastRowIndex));
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
		return offsets[index];
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

		let sizeDiff: number = 0; // Total size added/subtracted until now
		let resizedCount = 0; // Total count of indices resized (of the given indices to resize array)
		let nextResizeIndex = indices[resizedCount];
		for (let i = nextResizeIndex; i < offsets.length; i++) {
			offsets[i] += sizeDiff;

			if (i === nextResizeIndex) {
				// Add/subtract the size difference to/from sizeSum (when not hidden)
				const isHidden = hiddenIndices.has(nextResizeIndex);
				if (!isHidden) {
					sizeDiff += size - sizes[nextResizeIndex];
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
		this._insert(insertBeforeIndex, count, true);
	}

	/**
	 * Insert columns before the given index.
	 * @param insertBeforeIndex index to insert columns before
	 * @param count of columns to insert
	 */
	public insertColumns(insertBeforeIndex: number, count: number): void {
		this._insert(insertBeforeIndex, count, false);
	}

	/**
	 * Insert rows/columns before the given index.
	 * @param insertBeforeIndex the index to insert rows/columns before
	 * @param count of rows/columns to insert
	 * @param isRow whether we want to insert rows or columns
	 */
	private _insert(insertBeforeIndex: number, count: number, isRow: boolean): void {
		// First and foremost collect all merged cells ranging over the new area to insert
		const intersectingMergedAreaRanges: ICellRange[] = insertBeforeIndex > 0
			? this._collectMergedCellsRangingOverIndex(isRow, insertBeforeIndex - 1)
			: [];

		// Split those merged cells before inserting
		for (const range of intersectingMergedAreaRanges) {
			this.splitCell(range.startRow, range.startColumn);
		}

		// Expand cell lookup and other collections
		const totalAddedSize: number = this._expandModelForInsert(insertBeforeIndex, count, isRow);

		// Shift hidden rows/columns
		CellModel._shiftHidden(isRow ? this._hiddenRows : this._hiddenColumns, insertBeforeIndex + 1, count);

		// Shift offsets for the old rows/columns below/after the inserted ones by the total added size
		CellModel._shiftOffsets(isRow ? this._rowOffsets : this._columnOffsets, insertBeforeIndex + count, totalAddedSize);

		// Shift cell ranges for all cells below/after the inserted ones
		this._shiftCellRangesForInsert(isRow, insertBeforeIndex + count, count);

		// Re-merge cells that have been split before inserting
		for (const range of intersectingMergedAreaRanges) {
			// Update range to account for the inserted rows or columns
			if (isRow) {
				range.endRow += count;
			} else {
				range.endColumn += count;
			}

			this.mergeCells(range);
		}
	}

	/**
	 * Shift the cell ranges of all cells on the given axis (row or column) starting from the passed index
	 * by the given amount.
	 * @param isRowAxis whether we want to shift on the row or column axis
	 * @param fromIndex from which index to start shifting (inclusive)
	 * @param by what amount to shift
	 */
	private _shiftCellRangesForInsert(isRowAxis: boolean, fromIndex: number, by: number): void {
		const forEachOptions: ForEachInRangeOptions = {
			unique: true,
			includeHidden: true
		};
		if (isRowAxis) {
			this._forEachCellInRange({
				startRow: fromIndex,
				endRow: this.getRowCount() - 1,
				startColumn: 0,
				endColumn: this.getColumnCount() - 1
			}, (cell, row, column) => {
				if (!!cell) {
					// Change cell range for the cell
					cell.range.startRow += by;
					cell.range.endRow += by;
				}
			}, forEachOptions);
		} else {
			this._forEachCellInRange({
				startRow: 0,
				endRow: this.getRowCount() - 1,
				startColumn: fromIndex,
				endColumn: this.getColumnCount() - 1
			}, (cell, row, column) => {
				if (!!cell) {
					// Change cell range for the cell
					cell.range.startColumn += by;
					cell.range.endColumn += by;
				}
			}, forEachOptions);
		}
	}

	/**
	 * Execute the given callback function for each cell in the passed range.
	 * @param range to execute callback for
	 * @param callback to execute for each cell in the range
	 * @param options to modify the algorithm behavior (filtering cells for example)
	 */
	private _forEachCellInRange(
		range: ICellRange,
		callback: (cell: ICell | null, row, column) => void,
		options?: ForEachInRangeOptions
	) {
		// Already encountered merged cells (ranging over multiple rows and/or columns).
		const alreadyEncounteredMergedCells: Set<ICell> = new Set<ICell>();

		for (let row = range.startRow; row <= range.endRow; row++) {
			if (!options.includeHidden && this.isRowHidden(row)) {
				continue;
			}

			for (let column = range.startColumn; column <= range.endColumn; column++) {
				if (!options.includeHidden && this.isColumnHidden(column)) {
					continue;
				}

				const cell: ICell = this.getCell(row, column);
				if (options.unique && !!cell && !CellRangeUtil.isSingleRowColumnRange(cell.range)) {
					// Check if we already processed the cell with the given range
					if (alreadyEncounteredMergedCells.has(cell)) {
						continue;
					}

					alreadyEncounteredMergedCells.add(cell);
				}

				// Execute callback for the cell
				callback(cell, row, column);
			}
		}
	}

	/**
	 * Shift the passed offset by the given amount starting from the given index.
	 * @param offsets to shift
	 * @param fromIndex from which index to start shifting
	 * @param by the amount to shift by
	 */
	private static _shiftOffsets(offsets: number[], fromIndex: number, by: number): void {
		for (let i = fromIndex; i < offsets.length; i++) {
			offsets[i] += by;
		}
	}

	/**
	 * Expand the cell model as preparation for an insert operation.
	 * @param insertBeforeIndex insert before this index (in rows or columns).
	 * @param count of rows or columns to insert
	 * @param isRow whether we want to insert rows or columns
	 * @returns the total added size (height for rows, width for columns)
	 */
	private _expandModelForInsert(insertBeforeIndex: number, count: number, isRow: boolean): number {
		if (isRow) {
			return this._expandModelForInsertForRows(insertBeforeIndex, count);
		} else {
			return this._expandModelForInsertForColumns(insertBeforeIndex, count);
		}
	}

	/**
	 * Expand the cell model as preparation for a row insert operation.
	 * @param insertBeforeIndex insert before this row index
	 * @param count of rows to insert
	 * @returns the height of the inserted rows
	 */
	private _expandModelForInsertForRows(insertBeforeIndex: number, count: number): number {
		const rowCount: number = this.getRowCount();
		const columnCount: number = this.getColumnCount();

		// Prepare cell lookup
		const rowsToInsert: ICell[][] = new Array(count);
		for (let row = 0; row < count; row++) {
			rowsToInsert[row] = new Array(columnCount);

			for (let column = 0; column < columnCount; column++) {
				rowsToInsert[row][column] = null; // Empty cell
			}
		}

		// Prepare new row sizes
		const defaultRowSize = rowCount > 0
			? (insertBeforeIndex < rowCount ? this.getRowSize(insertBeforeIndex) : this.getRowSize(rowCount - 1))
			: CellModel.DEFAULT_ROW_SIZE;
		const rowSizesToInsert: number[] = new Array(count);
		let totalAddedHeight: number = 0;
		for (let i = 0; i < count; i++) {
			rowSizesToInsert[i] = defaultRowSize;

			totalAddedHeight += defaultRowSize;
		}

		// Prepare new offsets
		let lastOffset: number = insertBeforeIndex < rowCount ? this.getRowOffset(insertBeforeIndex) : this.getHeight();
		const offsetsToInsert: number[] = new Array(count);
		for (let i = 0; i < count; i++) {
			offsetsToInsert[i] = lastOffset;
			lastOffset += rowSizesToInsert[i];
		}

		// Expand collections
		this._cellLookup.splice(insertBeforeIndex, 0, ...rowsToInsert);
		this._rowSizes.splice(insertBeforeIndex, 0, ...rowSizesToInsert);
		this._rowOffsets.splice(insertBeforeIndex, 0, ...offsetsToInsert);

		return totalAddedHeight;
	}

	/**
	 * Expand the cell model as preparation for a column insert operation.
	 * @param insertBeforeIndex insert before this column index
	 * @param count of columns to insert
	 * @returns the width of the inserted columns
	 */
	private _expandModelForInsertForColumns(insertBeforeIndex: number, count: number): number {
		const rowCount = this.getRowCount();
		const columnCount = this.getColumnCount();

		// Prepare columns sizes
		const defaultColumnSize = columnCount > 0
			? (insertBeforeIndex < columnCount ? this.getColumnSize(insertBeforeIndex) : this.getColumnSize(columnCount - 1))
			: CellModel.DEFAULT_COLUMN_SIZE;
		const columnSizesToInsert: number[] = new Array(count);
		let totalAddedWidth: number = 0;
		for (let i = 0; i < count; i++) {
			columnSizesToInsert[i] = defaultColumnSize;

			totalAddedWidth += defaultColumnSize;
		}

		// Prepare offsets
		let lastOffset: number = insertBeforeIndex < columnCount ? this.getColumnOffset(insertBeforeIndex) : this.getWidth();
		const offsetsToInsert: number[] = new Array(count);
		for (let i = 0; i < count; i++) {
			offsetsToInsert[i] = lastOffset;
			lastOffset += columnSizesToInsert[i];
		}

		// Expand cell lookup
		for (let row = 0; row < rowCount; row++) {
			const cellsToInsert: Array<ICell | null> = new Array(count);
			for (let i = 0; i < cellsToInsert.length; i++) {
				cellsToInsert[i] = null; // Empty cell
			}

			this._cellLookup[row].splice(insertBeforeIndex, 0, ...cellsToInsert);
		}

		// Expand other collections
		this._columnSizes.splice(insertBeforeIndex, 0, ...columnSizesToInsert);
		this._columnOffsets.splice(insertBeforeIndex, 0, ...offsetsToInsert);

		return totalAddedWidth;
	}

	/**
	 * Shift the passed hidden indices by the given offset starting with the given fromIndex.
	 * @param hidden the set to shift indices in
	 * @param fromIndex index to start shifting from (inclusive)
	 * @param offset to shift indices by
	 */
	private static _shiftHidden(hidden: Set<number>, fromIndex: number, offset: number): void {
		const tmp: number[] = Array.from(hidden.values());

		hidden.clear();

		for (const hiddenIndex of tmp) {
			if (hiddenIndex >= fromIndex) {
				hidden.add(hiddenIndex + offset); // Re-add with offset applied
			} else {
				hidden.add(hiddenIndex); // Just re-add again
			}
		}
	}

	/**
	 * Delete rows starting with the given index.
	 * @param fromIndex index to start deleting rows from (inclusively)
	 * @param count of rows to delete
	 */
	public deleteRows(fromIndex: number, count: number): void {
		this._delete(fromIndex, count, true);
	}

	/**
	 * Delete columns starting with the given index.
	 * @param fromIndex index to start deleting columns from (inclusively)
	 * @param count of columns to delete
	 */
	public deleteColumns(fromIndex: number, count: number): void {
		this._delete(fromIndex, count, false);
	}

	/**
	 * Delete rows/columns from the given index (inclusive).
	 * @param fromIndex the index to delete rows/columns from (inclusively)
	 * @param count of rows/columns to delete
	 * @param isRow whether we want to delete rows or columns
	 */
	private _delete(fromIndex: number, count: number, isRow: boolean): void {
		// Find all merged cells ranging over the first row/column to delete
		const intersectingMergedAreaRanges: ICellRange[] = fromIndex > 0
			? this._collectMergedCellsRangingOverIndex(isRow, fromIndex - 1)
			: [];

		const lastIndexToRemove: number = fromIndex + count - 1;
		const totalSizeToRemove: number = isRow
			? (this.getRowOffset(lastIndexToRemove) + (this.isRowHidden(lastIndexToRemove) ? 0.0 : this.getRowSize(lastIndexToRemove))) - this.getRowOffset(fromIndex)
			: (this.getColumnOffset(lastIndexToRemove) + (this.isColumnHidden(lastIndexToRemove) ? 0.0 : this.getColumnSize(lastIndexToRemove))) - this.getColumnOffset(fromIndex)

		// Adjust cell ranges ranging over the first row/column to delete,
		// but not ranges that that span over the whole area to delete
		// (Those will be adjusted in a later step).
		for (const range of intersectingMergedAreaRanges) {
			if (isRow) {
				if (range.endRow <= lastIndexToRemove) {
					const cell: ICell = this.getCell(range.startRow, range.startColumn);

					cell.range.endRow = fromIndex - 1;
				}
			} else {
				if (range.endColumn <= lastIndexToRemove) {
					const cell: ICell = this.getCell(range.startRow, range.startColumn);

					cell.range.endColumn = fromIndex - 1;
				}
			}
		}

		// Shift cell ranges for all cells in areas below (rows) or beneath (columns) of the area to remove
		this._shiftCellRangesForDelete(isRow, fromIndex, count);

		// Remove hidden rows/columns from the lookup
		const hidden: Set<number> = isRow ? this._hiddenRows : this._hiddenColumns;
		for (let i = fromIndex; i < fromIndex + count; i++) {
			hidden.delete(i);
		}

		// Shift hidden rows/columns to the left as there are now less rows/columns
		CellModel._shiftHidden(isRow ? this._hiddenRows : this._hiddenColumns, fromIndex + count, -count);

		// Delete from the offset lookup
		const offsets: number[] = isRow ? this._rowOffsets : this._columnOffsets;
		offsets.splice(fromIndex, count); // Remove offsets for rows/columns that are now deleted

		// Shift offsets by the removed size
		for (let i = fromIndex; i < offsets.length; i++) {
			offsets[i] -= totalSizeToRemove;
		}

		// Remove deleted rows/columns from the size lookup
		const sizes: number[] = isRow ? this._rowSizes : this._columnSizes;
		sizes.splice(fromIndex, count);

		// Remove cells from cell lookup for the deleted rows/columns
		if (isRow) {
			this._cellLookup.splice(fromIndex, count);
		} else {
			for (const cells of this._cellLookup) {
				cells.splice(fromIndex, count);
			}
		}
	}

	/**
	 * Shift the cell ranges below or after the row/column area to delete.
	 * @param isRowAxis whether we deal with deleting rows or columns
	 * @param fromIndex the index rows/columns are deleted from (inclusive)
	 * @param count of rows/columns that are deleted
	 */
	private _shiftCellRangesForDelete(isRowAxis: boolean, fromIndex: number, count: number): void {
		const forEachOptions: ForEachInRangeOptions = {
			unique: true,
			includeHidden: true
		};

		if (isRowAxis) {
			this._forEachCellInRange({
				startRow: fromIndex + count,
				endRow: this.getRowCount() - 1,
				startColumn: 0,
				endColumn: this.getColumnCount() - 1
			}, (cell, row, column) => {
				if (!!cell) {
					if (CellRangeUtil.isSingleRowColumnRange(cell.range)) {
						cell.range.startRow -= count;
						cell.range.endRow -= count;
					} else {
						if (cell.range.startRow < fromIndex) {
							// Case 1: Merged cell starts in row above the rows to delete
							cell.range.endRow -= count;
						} else if (cell.range.startRow < fromIndex + count) {
							// Case 2: Merged cell starts in a row to delete
							cell.range.startRow = fromIndex;
							cell.range.endRow -= count;
						} else {
							// Case 3: Merged cell starts without concern to the deleted area
							cell.range.startRow -= count;
							cell.range.endRow -= count;
						}
					}
				}
			}, forEachOptions);
		} else {
			this._forEachCellInRange({
				startRow: 0,
				endRow: this.getRowCount() - 1,
				startColumn: fromIndex + count,
				endColumn: this.getColumnCount() - 1
			}, (cell, row, column) => {
				if (!!cell) {
					if (CellRangeUtil.isSingleRowColumnRange(cell.range)) {
						cell.range.startColumn -= count;
						cell.range.endColumn -= count;
					} else {
						if (cell.range.startColumn < fromIndex) {
							// Case 1: Merged cell starts in column before the columns to delete
							cell.range.endColumn -= count;
						} else if (cell.range.startColumn < fromIndex + count) {
							// Case 2: Merged cell starts in a column to delete
							cell.range.startColumn = fromIndex;
							cell.range.endColumn -= count;
						} else {
							// Case 3: Merged cell starts without concern to the deleted area
							cell.range.startColumn -= count;
							cell.range.endColumn -= count;
						}
					}
				}
			}, forEachOptions);
		}
	}

	/**
	 * Find all merged cells that range over the given index.
	 * @param overRow whether to collect merged cells over rows or over columns
	 * @param index (row/column) index to detect merged cells for that span over it (row index when overRow is true)
	 */
	private _collectMergedCellsRangingOverIndex(overRow: boolean, index: number): ICellRange[] {
		const result: ICellRange[] = [];

		const maxIndex: number = overRow ? this.getRowCount() - 1 : this.getColumnCount() - 1;
		const otherAxisMaxIndex: number = overRow ? this.getColumnCount() - 1 : this.getRowCount() - 1;

		if (index >= maxIndex) {
			return result; // Nothing to do here as there cannot be cells ranging over the max index
		}

		const alreadySeenMergedCells: Set<ICell> = new Set<ICell>();
		for (let i = 0; i < otherAxisMaxIndex; i++) {
			const row = overRow ? index + 1 : i;
			const column = overRow ? i : index + 1;

			const cell = this.getCell(row, column);
			if (!!cell && !CellRangeUtil.isSingleRowColumnRange(cell.range)) {
				if (!alreadySeenMergedCells.has(cell)) {
					// The cell is a merged cell and has not yet been processed by this algorithm
					alreadySeenMergedCells.add(cell);

					// Check whether the merged cell ranges over the index to check
					let isOverIndex;
					if (overRow) {
						isOverIndex = cell.range.startRow <= index;
					} else {
						isOverIndex = cell.range.startColumn <= index;
					}

					if (isOverIndex) {
						result.push(new CellRange(cell.range)); // Make a copy of the cell range
					}
				}
			}
		}

		return result;
	}

	/**
	 * Merge the passed range to a single cell.
	 * Note that this will only succeed when the range
	 * does not intersect cells spanning multiple rows and columns (will return false).
	 * @param range to merge
	 * @returns whether the cells could be merged
	 */
	public mergeCells(range: ICellRange): boolean {
		// Check whether we can merge the cell range
		for (let row = range.startRow; row <= range.endRow; row++) {
			for (let column = range.startColumn; column <= range.endColumn; column++) {
				const cell = this.getCell(row, column);
				if (!!cell) {
					if (!CellRangeUtil.isSingleRowColumnRange(cell.range)) {
						return false; // Cannot merge over already merged cell
					}
				}
			}
		}

		// Actually merge the cell by writing cell references in the cell lookup to the most upper left corner cell
		const cell: ICell = this.getCell(range.startRow, range.startColumn);
		for (let row = range.startRow; row <= range.endRow; row++) {
			for (let column = range.startColumn; column <= range.endColumn; column++) {
				if (row === range.startRow && column === range.startColumn) {
					continue;
				}

				this._cellLookup[row][column] = cell;
			}
		}

		// Update cell range
		cell.range.endRow = range.endRow;
		cell.range.endColumn = range.endColumn;

		return true;
	}

	/**
	 * Split a cell spanning multiple rows and columns at the given
	 * row index and column index.
	 * @param rowIndex index of the row the cell is at
	 * @param columnIndex index of the column the cell is at
	 */
	public splitCell(rowIndex: number, columnIndex: number): void {
		const cell = this.getCell(rowIndex, columnIndex);

		if (CellRangeUtil.isSingleRowColumnRange(cell.range)) {
			return;
		}

		// Reset cell lookup to empty cell for all cells but the most upper left one
		for (let row = cell.range.startRow; row <= cell.range.endRow; row++) {
			for (let column = cell.range.startColumn; column <= cell.range.endColumn; column++) {
				if (row === cell.range.startRow && column === cell.range.startColumn) {
					continue;
				}

				this._cellLookup[row][column] = null;
			}
		}

		// Update cell range
		cell.range.endRow = cell.range.startRow;
		cell.range.endColumn = cell.range.startColumn;
	}

	/**
	 * Check whether the row with the given index is hidden.
	 * @param index to check row for
	 */
	public isRowHidden(index: number): boolean {
		return this._hiddenRows.has(index);
	}

	/**
	 * Check whether the column with the given index is hidden.
	 * @param index to check column for
	 */
	public isColumnHidden(index: number): boolean {
		return this._hiddenColumns.has(index);
	}

	/**
	 * Hide rows with the given indices.
	 * @param rowIndices indices to hide rows for
	 */
	public hideRows(rowIndices: number[]): void {
		CellModel._hide(rowIndices, this._rowOffsets, this._hiddenRows, this._rowSizes);
	}

	/**
	 * Hide the columns with the given indices.
	 * @param columnIndices to hide columns for
	 */
	public hideColumns(columnIndices: number[]): void {
		CellModel._hide(columnIndices, this._columnOffsets, this._hiddenColumns, this._columnSizes);
	}

	/**
	 * Hide the given indices of rows or columns.
	 * @param indices to hide
	 * @param offsets to adjust (for rows or columns)
	 * @param hidden lookup of hidden rows or columns
	 * @param sizes lookup for the indices
	 */
	private static _hide(indices: number[], offsets: number[], hidden: Set<number>, sizes: number[]): void {
		// Add indices to the hidden collection first
		const adjustOffsetsIndices: number[] = [];
		for (const index of indices) {
			const isAlreadyHidden = hidden.has(index);
			if (!isAlreadyHidden) {
				hidden.add(index);

				// We need to adjust the offset array later
				adjustOffsetsIndices.push(index);
			}
		}

		if (adjustOffsetsIndices.length > 0) {
			// Sort offset indices to adjust
			adjustOffsetsIndices.sort((n1, n2) => n1 - n2);

			// Adjust offsets
			let toDecrease = sizes[adjustOffsetsIndices[0]];
			let alreadyHiddenCount = 1;
			let nextHideIndex = adjustOffsetsIndices.length > alreadyHiddenCount ? adjustOffsetsIndices[alreadyHiddenCount] : -1;
			for (let i = adjustOffsetsIndices[0] + 1; i < offsets.length; i++) {
				offsets[i] -= toDecrease;

				if (i === nextHideIndex) {
					toDecrease += sizes[nextHideIndex];
					alreadyHiddenCount++;

					if (adjustOffsetsIndices.length > alreadyHiddenCount) {
						nextHideIndex = adjustOffsetsIndices[alreadyHiddenCount];
					} else {
						nextHideIndex = -1;
					}
				}
			}
		}
	}

	/**
	 * Show hidden rows with the passed indices.
	 * @param rowIndices indices of rows to show
	 */
	public showRows(rowIndices: number[]): void {
		CellModel._show(rowIndices, this._rowOffsets, this._hiddenRows, this._rowSizes);
	}

	/**
	 * Show hidden columns with the passed indices.
	 * @param columnIndices indices of columns to show
	 */
	public showColumns(columnIndices: number[]): void {
		CellModel._show(columnIndices, this._columnOffsets, this._hiddenColumns, this._columnSizes);
	}

	/**
	 * Show the given indices of rows or columns.
	 * @param indices to show
	 * @param offsets to adjust (for rows or columns)
	 * @param hidden lookup of hidden rows or columns
	 * @param sizes lookup for the indices
	 */
	private static _show(indices: number[], offsets: number[], hidden: Set<number>, sizes: number[]): void {
		// Remove indices from the hidden collection first
		const adjustOffsetsIndices: number[] = [];
		for (const index of indices) {
			// Check if the index is currently hidden
			const isHidden = hidden.has(index);
			if (isHidden) {
				hidden.delete(index);

				// We need to adjust the offset array later
				adjustOffsetsIndices.push(index);
			}
		}

		if (adjustOffsetsIndices.length > 0) {
			// Sort offset indices to adjust
			adjustOffsetsIndices.sort((n1, n2) => n1 - n2);

			// Adjust offsets
			let toIncrease = sizes[adjustOffsetsIndices[0]];
			let alreadyShownCount = 1;
			let nextShowIndex = adjustOffsetsIndices.length > alreadyShownCount ? adjustOffsetsIndices[alreadyShownCount] : -1;
			for (let i = adjustOffsetsIndices[0] + 1; i < offsets.length; i++) {
				offsets[i] += toIncrease;

				if (i === nextShowIndex) {
					toIncrease += sizes[nextShowIndex];
					alreadyShownCount++;

					if (adjustOffsetsIndices.length > alreadyShownCount) {
						nextShowIndex = adjustOffsetsIndices[alreadyShownCount];
					} else {
						nextShowIndex = -1;
					}
				}
			}
		}
	}

}

/**
 * Options for the forEachInRange method.
 */
interface ForEachInRangeOptions {
	/**
	 * Whether cells must be unique.
	 * When true the for each method will
	 * only be called once for each cell, even
	 * if they range over multiple rows and columns.
	 */
	unique: boolean;

	/**
	 * Whether the for each callback should be called
	 * for hidden cells as well, otherwise they are filtered.
	 */
	includeHidden: boolean;
}
