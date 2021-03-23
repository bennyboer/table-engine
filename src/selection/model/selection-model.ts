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
	 * Extend the passed selection in the given direction.
	 * @param selection to extend
	 * @param xDiff horizontal offset to extend by
	 * @param yDiff vertical offset to extend by
	 */
	public extendSelection(selection: ISelection, xDiff: number, yDiff: number): void {
		// TODO
	}

	/**
	 * Move the current primary selection
	 * in the given direction.
	 * @param selection to move
	 * @param xDiff horizontal offset to move by
	 * @param yDiff vertical offset to move by
	 */
	public moveSelection(selection: ISelection, xDiff: number, yDiff: number): void {
		// TODO
	}

	/**
	 * Move the initial in the current primary selection (if any)
	 * in the given direction.
	 * @param xDiff horizontal offset to move by
	 * @param yDiff vertical offset to move by
	 */
	public moveInitial(xDiff: number, yDiff: number): void {
		const primary = this.getPrimary();
		if (!primary) {
			return;
		}

		const firstVisibleRow: number = this._cellModel.findNextVisibleRow(primary.range.startRow);
		const firstVisibleColumn: number = this._cellModel.findNextVisibleColumn(primary.range.startColumn);
		const lastVisibleRow: number = this._cellModel.findPreviousVisibleRow(primary.range.endRow);
		const lastVisibleColumn: number = this._cellModel.findPreviousVisibleColumn(primary.range.endColumn);

		// Check if move is possible
		let isNextMovePossible: boolean = true;
		let moveToNextSelection: boolean = false;
		if (primary.initial.column === firstVisibleColumn && primary.initial.row === firstVisibleRow && (xDiff < 0 || yDiff < 0)) {
			isNextMovePossible = false;
			moveToNextSelection = false;
		} else if (primary.initial.column === lastVisibleColumn && primary.initial.row === lastVisibleRow && (xDiff > 0 || yDiff > 0)) {
			isNextMovePossible = false;
			moveToNextSelection = true;
		}

		if (!isNextMovePossible) {
			// Move to next or previous selection as new primary (if possible)
			let newPrimary: ISelection = primary;
			if (this._selections.length > 1) {
				let nextPrimaryIndex = moveToNextSelection ? this._primaryIndex + 1 : this._primaryIndex - 1;
				if (nextPrimaryIndex < 0) {
					nextPrimaryIndex = this._selections.length - 1;
				} else if (nextPrimaryIndex > this._selections.length - 1) {
					nextPrimaryIndex = 0;
				}
				this._primaryIndex = nextPrimaryIndex;

				newPrimary = this._selections[this._primaryIndex];
			}

			if (newPrimary === primary) {
				// Primary did not change
				if (moveToNextSelection) {
					newPrimary.initial.row = firstVisibleRow;
					newPrimary.initial.column = firstVisibleColumn;
				} else {
					newPrimary.initial.row = lastVisibleRow;
					newPrimary.initial.column = lastVisibleColumn;
				}
			} else {
				if (moveToNextSelection) {
					newPrimary.initial.row = this._cellModel.findNextVisibleRow(newPrimary.range.startRow);
					newPrimary.initial.column = this._cellModel.findNextVisibleColumn(newPrimary.range.startColumn);
				} else {
					newPrimary.initial.row = this._cellModel.findPreviousVisibleRow(newPrimary.range.endRow);
					newPrimary.initial.column = this._cellModel.findPreviousVisibleColumn(newPrimary.range.endColumn);
				}
			}

			return;
		}

		let wrapOccurred: boolean = true;
		while (wrapOccurred) {
			wrapOccurred = false;

			if (yDiff !== 0) {
				let newRow: number;

				if (yDiff < 0) {
					newRow = this._findRowOfPreviousVisibleCell(primary.initial.row, primary.initial.column);

					if (newRow === -1 || newRow < firstVisibleRow) {
						// Move to end row of selection
						newRow = lastVisibleRow;

						// Move to previous column later
						xDiff = -1;

						wrapOccurred = true;
					}

					yDiff = 0;
				} else {
					newRow = this._findRowOfNextVisibleCell(primary.initial.row, primary.initial.column);

					if (newRow === -1 || newRow > lastVisibleRow) {
						// Move to start row of selection
						newRow = firstVisibleRow;

						// Move to next column later
						xDiff = 1;

						wrapOccurred = true;
					}

					yDiff = 0;
				}

				primary.initial.row = newRow;
			}

			if (!wrapOccurred && xDiff !== 0) {
				let newColumn: number;
				if (xDiff < 0) {
					newColumn = this._findColumnOfPreviousVisibleCell(primary.initial.column, primary.initial.row);

					if (newColumn === -1 || newColumn < firstVisibleColumn) {
						// Move to end column of selection
						newColumn = lastVisibleColumn;

						// Move to previous row later
						yDiff = -1;

						wrapOccurred = true;
					}

					xDiff = 0;
				} else {
					newColumn = this._findColumnOfNextVisibleCell(primary.initial.column, primary.initial.row);

					if (newColumn === -1 || newColumn > lastVisibleColumn) {
						// Move to start column of selection
						newColumn = firstVisibleColumn;

						// Move to next row later
						yDiff = 1;

						wrapOccurred = true;
					}

					xDiff = 0;
				}

				primary.initial.column = newColumn;
			}
		}
	}

	/**
	 * Find row of the next visible cell.
	 * @param afterRow row index to start from (exclusive)
	 * @param column index to use
	 * @return the next visible index or -1
	 */
	private _findRowOfNextVisibleCell(afterRow: number, column: number): number {
		const cell: ICell = this._cellModel.getCell(afterRow, column);

		let nextVisibleRowCell: ICell = null;
		let nextVisibleRow: number = afterRow;
		do {
			nextVisibleRow = this._cellModel.findNextVisibleRow(nextVisibleRow + 1);
			if (nextVisibleRow === -1) {
				return -1;
			}

			nextVisibleRowCell = this._cellModel.getCell(nextVisibleRow, column);
		} while (nextVisibleRowCell !== null && nextVisibleRowCell === cell);

		return nextVisibleRow;
	}

	/**
	 * Find row of the previous visible cell.
	 * @param beforeRow row index to start from (exclusive)
	 * @param column index to use
	 * @return the previous visible index or -1
	 */
	private _findRowOfPreviousVisibleCell(beforeRow: number, column: number): number {
		const cell: ICell = this._cellModel.getCell(beforeRow, column);

		let previousVisibleRowCell: ICell = null;
		let previousVisibleRow: number = beforeRow;
		do {
			previousVisibleRow = this._cellModel.findPreviousVisibleRow(previousVisibleRow - 1);
			if (previousVisibleRow === -1) {
				return -1;
			}

			previousVisibleRowCell = this._cellModel.getCell(previousVisibleRow, column);
		} while (previousVisibleRowCell !== null && previousVisibleRowCell === cell);

		return previousVisibleRow;
	}

	/**
	 * Find column of the next visible cell.
	 * @param afterColumn column index to start from (exclusive)
	 * @param row index to use
	 * @return the next visible index or -1
	 */
	private _findColumnOfNextVisibleCell(afterColumn: number, row: number): number {
		const cell: ICell = this._cellModel.getCell(row, afterColumn);

		let nextVisibleColumnCell: ICell = null;
		let nextVisibleColumn: number = afterColumn;
		do {
			nextVisibleColumn = this._cellModel.findNextVisibleColumn(nextVisibleColumn + 1);
			if (nextVisibleColumn === -1) {
				return -1;
			}

			nextVisibleColumnCell = this._cellModel.getCell(row, nextVisibleColumn);
		} while (nextVisibleColumnCell !== null && nextVisibleColumnCell === cell);

		return nextVisibleColumn;
	}

	/**
	 * Find column of the previous visible cell.
	 * @param beforeColumn column index to start from (exclusive)
	 * @param row index to use
	 * @return the previous visible index or -1
	 */
	private _findColumnOfPreviousVisibleCell(beforeColumn: number, row: number): number {
		const cell: ICell = this._cellModel.getCell(row, beforeColumn);

		let previousVisibleColumnCell: ICell = null;
		let previousVisibleColumn: number = beforeColumn;
		do {
			previousVisibleColumn = this._cellModel.findPreviousVisibleColumn(previousVisibleColumn - 1);
			if (previousVisibleColumn === -1) {
				return -1;
			}

			previousVisibleColumnCell = this._cellModel.getCell(row, previousVisibleColumn);
		} while (previousVisibleColumnCell !== null && previousVisibleColumnCell === cell);

		return previousVisibleColumn;
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
