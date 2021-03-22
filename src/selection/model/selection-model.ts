import {ISelectionModel} from "./selection-model.interface";
import {ISelection} from "../selection";
import {CellRange, ICellRange} from "../../cell/range/cell-range";
import {ICellModel} from "../../cell/model/cell-model.interface";
import {ICell} from "../../cell/cell";
import {CellRangeUtil} from "../../cell/range/cell-range-util";

/**
 * Model managing a table selection.
 */
export class SelectionModel implements ISelectionModel {

	/**
	 * Selections currently in the model.
	 */
	private readonly _selections: ISelection[] = [];

	/**
	 * Current primary selection index (if any, otherwise -1).
	 */
	private _primaryIndex: number = -1;

	constructor(private readonly _cellModel: ICellModel) {
	}

	/**
	 * Get the primary selection (if any).
	 */
	public getPrimary(): ISelection | null {
		if (this._primaryIndex !== -1) {
			return this._selections[this._primaryIndex];
		}

		return null;
	}

	/**
	 * Set the given index to be the primary selection.
	 * @param index of the selection to set to primary
	 */
	public setPrimary(index: number): void {
		if (index < 0 || index >= this._selections.length) {
			throw new Error(`Cannot set selection with index ${index} to be primary as there exists no selection with that index`);
		}

		this._primaryIndex = index;
	}

	/**
	 * Get the current selections.
	 */
	public getSelections(): ISelection[] {
		return this._selections;
	}

	/**
	 * Add a selection to the model.
	 * @param selection to add
	 * @param validate whether to validate the selection first
	 */
	public addSelection(selection: ISelection, validate: boolean): void {
		if (validate) {
			const result = this._validateSelection(selection);

			for (const s of result.toRemove) {
				this._selections.splice(this._selections.indexOf(s), 1);
			}
			for (const s of result.toAdd) {
				this._selections.push(s);
			}
			this.setPrimary(this._selections.length - result.toAdd.length);
		} else {
			this._selections.push(selection);
			this.setPrimary(this._selections.length - 1);
		}
	}

	/**
	 * Validate a selection.
	 * For example to range over a complete merged cells.
	 * @param selection to validate
	 * @returns the selections to add and remove
	 */
	private _validateSelection(selection: ISelection): IValidationResult {
		SelectionModel._validateCellRange(selection.range);
		this._validateCellRangeContainAllMergedCells(selection);
		return this._subtractIfNeeded(selection);
	}

	/**
	 * Subtract the passed selection from the existing ones if it is completely enclosed in a selection.
	 * @param selection to subtract from the existing ones
	 * @returns the selections to add and remove
	 */
	private _subtractIfNeeded(selection: ISelection): IValidationResult {
		// Check if selection is completely enclosed in another existing selection
		if (this._selections.length === 0) {
			// Trivial case - cannot be enclosed
			return {
				toAdd: [selection],
				toRemove: []
			};
		}

		for (const s of this._selections) {
			const isEnclosed: boolean = CellRangeUtil.contains(selection.range, s.range);
			if (isEnclosed) {
				// Divide selection that contains the new selection
				const toAdd: ISelection[] = [];

				// Check if the new selection is exactly the old one -> return just the initial row/column as new selection
				if (CellRangeUtil.equals(selection.range, s.range)) {
					toAdd.push({
						range: CellRange.fromSingleRowColumn(selection.initial.row, selection.initial.column),
						initial: selection.initial
					});
				} else {
					// Add top selection (if necessary)
					if (selection.range.startRow > s.range.startRow) {
						toAdd.push({
							range: {
								startRow: s.range.startRow,
								endRow: selection.range.startRow - 1,
								startColumn: s.range.startColumn,
								endColumn: s.range.endColumn
							}
						});
					}

					// Add left selection (if necessary)
					if (selection.range.startColumn > s.range.startColumn) {
						toAdd.push({
							range: {
								startRow: selection.range.startRow,
								endRow: selection.range.endRow,
								startColumn: s.range.startColumn,
								endColumn: selection.range.startColumn - 1
							}
						});
					}

					// Add right selection (if necessary)
					if (selection.range.endColumn < s.range.endColumn) {
						toAdd.push({
							range: {
								startRow: selection.range.startRow,
								endRow: selection.range.endRow,
								startColumn: selection.range.endColumn + 1,
								endColumn: s.range.endColumn
							}
						});
					}

					// Add bottom selection (if necessary)
					if (selection.range.endRow < s.range.endRow) {
						toAdd.push({
							range: {
								startRow: selection.range.endRow + 1,
								endRow: s.range.endRow,
								startColumn: s.range.startColumn,
								endColumn: s.range.endColumn
							}
						});
					}
				}

				return {
					toAdd,
					toRemove: [s],
				};
			}
		}

		// Is not contained
		return {
			toAdd: [selection],
			toRemove: []
		};
	}

	/**
	 * Validate the passed selection to completely contain all merged cells.
	 * @param selection to validate
	 */
	private _validateCellRangeContainAllMergedCells(selection: ISelection): void {
		while (this._updateCellRangeToContainAllMergedCells(selection.range)) {
			// Continue to update cell ranges until no change has been found anymore
		}
	}

	/**
	 * Update the passed range to contain all merged cells completely.
	 * @param range the range to update
	 * @returns whether there was a change and this process needs to be repeated
	 */
	private _updateCellRangeToContainAllMergedCells(range: ICellRange): boolean {
		for (let row = range.startRow; row <= range.endRow; row++) {
			for (let column = range.startColumn; column <= range.endColumn; column++) {
				const cell: ICell = this._cellModel.getCell(row, column);

				let foundChange = false;

				if (cell.range.startColumn < range.startColumn) {
					range.startColumn = cell.range.startColumn;
					foundChange = true;
				}
				if (cell.range.startRow < range.startRow) {
					range.startRow = cell.range.startRow;
					foundChange = true;
				}
				if (cell.range.endColumn > range.endColumn) {
					range.endColumn = cell.range.endColumn;
					foundChange = true;
				}
				if (cell.range.endRow > range.endRow) {
					range.endRow = cell.range.endRow;
					foundChange = true;
				}

				if (foundChange) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Validate the passed cell range.
	 * @param range to validate
	 */
	private static _validateCellRange(range: ICellRange): void {
		const startRow = Math.min(range.startRow, range.endRow);
		const endRow = Math.max(range.startRow, range.endRow);
		const startColumn = Math.min(range.startColumn, range.endColumn);
		const endColumn = Math.max(range.startColumn, range.endColumn);

		range.startRow = startRow;
		range.endRow = endRow;
		range.startColumn = startColumn;
		range.endColumn = endColumn;
	}

	/**
	 * Clear all selections.
	 */
	public clear(): void {
		this._selections.length = 0;
		this._primaryIndex = -1;
	}

	/**
	 * Select the next possible row.
	 */
	public selectNextRow(): void {
		// TODO
	}

	/**
	 * Select the previous possible row.
	 */
	public selectPreviousRow(): void {
		// TODO
	}

	/**
	 * Select the next column.
	 */
	public selectNextColumn(): void {
		// TODO
	}

	/**
	 * Select the previous column.
	 */
	public selectPreviousColumn(): void {
		// TODO
	}

}

/**
 * Result of a selection validation.
 */
interface IValidationResult {

	/**
	 * Selections to remove.
	 */
	toRemove: ISelection[];

	/**
	 * Selections to add.
	 */
	toAdd: ISelection[];

}
