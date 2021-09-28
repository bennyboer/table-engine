import {ICell} from "../cell";
import {ICellRange} from "../range/cell-range";
import {IRectangle} from "../../util/rect";
import {Observable} from "rxjs";
import {ICellModelEvent} from "./event/cell-model-change";

/**
 * Representation of a cell model.
 */
export interface ICellModel {

	/**
	 * Get a cell at the given coordinates.
	 * @param rowIndex to get cell at
	 * @param columnIndex to get cell at
	 * @param fill whether to fill the cell lookup with a new cell instance, if it is currently null (Default: false)
	 */
	getCell(rowIndex: number, columnIndex: number, fill?: boolean): ICell | null;

	/**
	 * Set a value to the cell at the given row and column.
	 * @param rowIndex index of the row
	 * @param columnIndex index of the column
	 * @param value to set
	 */
	setValue(rowIndex: number, columnIndex: number, value: any): void;

	/**
	 * Set the renderer for a cell at the given row and column.
	 * @param rowIndex index of the row
	 * @param columnIndex index of the column
	 * @param rendererName name of the renderer to set
	 */
	setRenderer(rowIndex: number, columnIndex: number, rendererName: string): void;

	/**
	 * Get all cells in the provided range.
	 * @param range to get cells in
	 * @param options for the method
	 */
	getCells(range: ICellRange, options?: IGetCellsOptions): ICell[];

	/**
	 * Get a list of cells in the provided rectangle (metric is pixel).
	 * @param rect rectangle to get cells in (metric is pixel)
	 */
	getCellsForRect(rect: IRectangle): ICell[];

	/**
	 * Get a cell range for the given rectangle (metric is pixel).
	 * @param rect rectangle to get cell range for (metric is pixel)
	 */
	getRangeForRect(rect: IRectangle): ICellRange;

	/**
	 * Get a cell at the given offset (metric is pixel points).
	 * @param x offset from left (horizontal)
	 * @param y offset from top (vertical)
	 */
	getCellAtOffset(x: number, y: number): ICell | null;

	/**
	 * Get the nearest row at the given offset.
	 * @param offset to get nearest row at
	 */
	getRowAtOffset(offset: number): number;

	/**
	 * Get the nearest column at the given offset.
	 * @param offset to get nearest column at
	 */
	getColumnAtOffset(offset: number): number;

	/**
	 * Whether the given cell range is visible.
	 * At least one row and column needs to be visible.
	 * @param range to check for visibility
	 */
	isRangeVisible(range: ICellRange): boolean;

	/**
	 * Find the next visible row starting from the given one.
	 * @param from the first row to check for visibility
	 * @returns the next visible row or -1
	 */
	findNextVisibleRow(from: number): number;

	/**
	 * Find the next visible column starting from the given one.
	 * @param from the first column to check for visibility
	 * @returns the next visible column or -1
	 */
	findNextVisibleColumn(from: number): number;

	/**
	 * Find the previous visible row starting from the given one.
	 * @param from the first row to check for visibility
	 * @returns the previous visible row or -1
	 */
	findPreviousVisibleRow(from: number): number;

	/**
	 * Find the previous visible column starting from the given one.
	 * @param from the first column to check for visibility
	 * @returns the previous visible column or -1
	 */
	findPreviousVisibleColumn(from: number): number;

	/**
	 * Get bounds for the given range.
	 * @param range to get bounds for
	 */
	getBounds(range: ICellRange): IRectangle;

	/**
	 * Get the number of rows in the model.
	 */
	getRowCount(): number;

	/**
	 * Get the number of columns in the model.
	 */
	getColumnCount(): number;

	/**
	 * Get the total width of the table.
	 */
	getWidth(): number;

	/**
	 * Get the total height of the table.
	 */
	getHeight(): number;

	/**
	 * Get the size of a specific row with the given index.
	 * @param index of the row
	 */
	getRowSize(index: number): number;

	/**
	 * Get the size of a specific column with the given index.
	 * @param index of the column
	 */
	getColumnSize(index: number): number;

	/**
	 * Get the offset of the row with the given index.
	 * @param index of the row
	 */
	getRowOffset(index: number): number;

	/**
	 * Get the offset of the column with the given index.
	 * @param index of the column
	 */
	getColumnOffset(index: number): number;

	/**
	 * Resize the rows at the given row indices to the passed size.
	 * @param rowIndices indices of rows to resize
	 * @param size new size for the rows to resize
	 */
	resizeRows(rowIndices: number[], size: number): void;

	/**
	 * Resize the columns at the given column indices to the passed size.
	 * @param columnIndices indices of columns to resize
	 * @param size new size for the columns to resize
	 */
	resizeColumns(columnIndices: number[], size: number): void;

	/**
	 * Insert rows before the given index.
	 * @param insertBeforeIndex index to insert rows before
	 * @param count of rows to insert
	 * @param cellInitializer initializer for the new cells
	 */
	insertRows(insertBeforeIndex: number, count: number, cellInitializer?: (row: number, column: number) => ICell): void;

	/**
	 * Insert columns before the given index.
	 * @param insertBeforeIndex index to insert columns before
	 * @param count of columns to insert
	 * @param cellInitializer initializer for the new cells
	 */
	insertColumns(insertBeforeIndex: number, count: number, cellInitializer?: (row: number, column: number) => ICell): void;

	/**
	 * Delete rows starting with the given index.
	 * @param fromIndex index to start deleting rows from (inclusively)
	 * @param count of rows to delete
	 */
	deleteRows(fromIndex: number, count: number): void;

	/**
	 * Delete columns starting with the given index.
	 * @param fromIndex index to start deleting columns from (inclusively)
	 * @param count of columns to delete
	 */
	deleteColumns(fromIndex: number, count: number): void;

	/**
	 * Merge the passed range to a single cell.
	 * Note that this will only succeed when the range
	 * does not intersect cells spanning multiple rows and columns (will return false).
	 * @param range to merge
	 * @returns whether the cells could be merged
	 */
	mergeCells(range: ICellRange): boolean;

	/**
	 * Split a cell spanning multiple rows and columns at the given
	 * row index and column index.
	 * @param rowIndex index of the row the cell is at
	 * @param columnIndex index of the column the cell is at
	 */
	splitCell(rowIndex: number, columnIndex: number): void;

	/**
	 * Check whether the row with the given index is hidden.
	 * @param index to check row for
	 */
	isRowHidden(index: number): boolean;

	/**
	 * Check whether the column with the given index is hidden.
	 * @param index to check column for
	 */
	isColumnHidden(index: number): boolean;

	/**
	 * Hide rows with the given indices.
	 * @param rowIndices indices to hide rows for
	 */
	hideRows(rowIndices: number[]): void;

	/**
	 * Hide the columns with the given indices.
	 * @param columnIndices to hide columns for
	 */
	hideColumns(columnIndices: number[]): void;

	/**
	 * Show hidden rows with the passed indices.
	 * @param rowIndices indices of rows to show
	 */
	showRows(rowIndices: number[]): void;

	/**
	 * Show hidden columns with the passed indices.
	 * @param columnIndices indices of columns to show
	 */
	showColumns(columnIndices: number[]): void;

	/**
	 * Show all hidden rows and columns.
	 */
	showAll(): void;

	/**
	 * Get an observable about certain events in the cell model.
	 */
	events(): Observable<ICellModelEvent>;

	/**
	 * Cleanup when the cell model is no more needed.
	 */
	cleanup(): void;

}

/**
 * Options for the getCells method.
 */
export interface IGetCellsOptions {

	/**
	 * Whether to include hidden cells in the result.
	 */
	includeHidden?: boolean;

}
