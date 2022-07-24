import { ISelectionModel } from './selection-model.interface';
import { IInitialPosition, ISelection } from '../selection';
import {
	CellRange,
	CellRangeUtil,
	ICell,
	ICellModel,
	ICellRange,
} from '../../cell';
import { ITableEngineOptions } from '../../options';

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

	constructor(
		private readonly _cellModel: ICellModel,
		private readonly _options: ITableEngineOptions
	) {}

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
			throw new Error(
				`Cannot set selection with index ${index} to be primary as there exists no selection with that index`
			);
		}

		this._primaryIndex = index;

		// Make sure primary selection has the initial row/column set
		const primary: ISelection = this.getPrimary();
		if (!primary.initial) {
			primary.initial = {
				row: primary.range.startRow,
				column: primary.range.startColumn,
			};
		}
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
	 * @param subtract whether to subtract from existing selections when needed
	 */
	public addSelection(
		selection: ISelection,
		validate: boolean,
		subtract: boolean
	): void {
		if (!this._options.selection.allowMultiSelection) {
			this.clear();
		}
		if (!this._options.selection.allowRangeSelection) {
			selection = {
				initial: selection.initial,
				range: {
					startRow: selection.initial.row,
					endRow: selection.initial.row,
					startColumn: selection.initial.column,
					endColumn: selection.initial.column,
				},
			};
		}

		if (validate) {
			const result = this._validateSelection(selection, subtract);
			if (!!result) {
				for (const s of result.toRemove) {
					this._selections.splice(this._selections.indexOf(s), 1);
				}
				for (const s of result.toAdd) {
					this._selections.push(s);
				}
				this.setPrimary(this._selections.length - result.toAdd.length);
			}
		} else {
			// When there is a selection transform we need to consult that first
			// whether the selection is possible!
			if (!this._transformSelection(selection, false)) {
				return; // Selection not allowed!
			}

			this._selections.push(selection);
			this.setPrimary(this._selections.length - 1);
		}
	}

	/**
	 * Modify the passed selection, that is already in the selection model.
	 * @param selection to modify
	 * @param newRange to set
	 * @param newInitial to set
	 * @param validate whether to validate the passed selection first
	 * @param subtract whether to subtract from existing selections when needed
	 * @returns whether the selection model changed
	 */
	public modifySelection(
		selection: ISelection,
		newRange: ICellRange,
		newInitial: IInitialPosition,
		validate: boolean,
		subtract: boolean
	): boolean {
		const oldRange = selection.range;
		const oldInitial = selection.initial;

		selection.range = newRange;
		selection.initial = newInitial;
		if (!this._options.selection.allowRangeSelection) {
			selection.range = {
				startRow: selection.initial.row,
				endRow: selection.initial.row,
				startColumn: selection.initial.column,
				endColumn: selection.initial.column,
			};
		}

		let undoChange: boolean = false;
		let subtractChange: boolean = false;
		if (validate) {
			const result = this._validateSelection(selection, subtract);
			if (!!result) {
				// Remove selection first
				this._selections.splice(this._selections.indexOf(selection), 1);

				for (const s of result.toRemove) {
					this._selections.splice(this._selections.indexOf(s), 1);
				}
				for (const s of result.toAdd) {
					this._selections.push(s);
				}
				this.setPrimary(this._selections.length - result.toAdd.length);

				subtractChange = result.toRemove.length > 0;
			} else {
				// Selection not allowed!
				undoChange = true;
			}
		} else {
			// When there is a selection transform we need to consult that first
			// whether the selection is possible!
			if (!this._transformSelection(selection, false)) {
				undoChange = true;
			}
		}

		if (undoChange) {
			selection.range = oldRange;
			selection.initial = oldInitial;

			return false;
		} else {
			const rangeChanged = !CellRangeUtil.equals(
				selection.range,
				oldRange
			);
			const initialChanged =
				selection.initial.row !== oldInitial.row ||
				selection.initial.column !== oldInitial.column;

			return rangeChanged || initialChanged || subtractChange;
		}
	}

	/**
	 * Remove a selection already existing in the model.
	 * @param selection to remove
	 */
	public removeSelection(selection: ISelection): void {
		const index = this._selections.indexOf(selection);
		if (index > -1) {
			this._selections.splice(index, 1);
		}
	}

	/**
	 * Validate a selection.
	 * For example to range over a complete merged cells.
	 * @param selection to validate
	 * @param subtract whether to also subtract if needed
	 * @returns the selections to add and remove or null if the selection is not allowed
	 */
	private _validateSelection(
		selection: ISelection,
		subtract: boolean
	): IValidationResult | null {
		SelectionModel._validateCellRange(selection.range);
		this._validateCellRangeContainAllMergedCells(selection);

		// When there is a selection transform we need to consult that first
		// whether the selection is possible!
		if (!this._transformSelection(selection, false)) {
			return null; // Selection not allowed
		}

		if (subtract) {
			return this._subtractIfNeeded(selection);
		} else {
			return {
				toAdd: [selection],
				toRemove: [],
			};
		}
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
				toRemove: [],
			};
		}

		for (const s of this._selections) {
			if (s === selection) {
				continue;
			}

			const isEnclosed: boolean = CellRangeUtil.contains(
				selection.range,
				s.range
			);
			if (isEnclosed) {
				// Divide selection that contains the new selection
				const toAdd: ISelection[] = [];

				// Check if the new selection is exactly the old one -> return just the initial row/column as new selection
				if (CellRangeUtil.equals(selection.range, s.range)) {
					toAdd.push({
						range: CellRange.fromSingleRowColumn(
							selection.initial.row,
							selection.initial.column
						),
						initial: selection.initial,
					});
				} else {
					// Add top selection (if necessary)
					if (selection.range.startRow > s.range.startRow) {
						toAdd.push({
							range: {
								startRow: s.range.startRow,
								endRow: selection.range.startRow - 1,
								startColumn: s.range.startColumn,
								endColumn: s.range.endColumn,
							},
						});
					}

					// Add left selection (if necessary)
					if (selection.range.startColumn > s.range.startColumn) {
						toAdd.push({
							range: {
								startRow: selection.range.startRow,
								endRow: selection.range.endRow,
								startColumn: s.range.startColumn,
								endColumn: selection.range.startColumn - 1,
							},
						});
					}

					// Add right selection (if necessary)
					if (selection.range.endColumn < s.range.endColumn) {
						toAdd.push({
							range: {
								startRow: selection.range.startRow,
								endRow: selection.range.endRow,
								startColumn: selection.range.endColumn + 1,
								endColumn: s.range.endColumn,
							},
						});
					}

					// Add bottom selection (if necessary)
					if (selection.range.endRow < s.range.endRow) {
						toAdd.push({
							range: {
								startRow: selection.range.endRow + 1,
								endRow: s.range.endRow,
								startColumn: s.range.startColumn,
								endColumn: s.range.endColumn,
							},
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
			toRemove: [],
		};
	}

	/**
	 * Validate the passed selection to completely contain all merged cells.
	 * @param selection to validate
	 */
	private _validateCellRangeContainAllMergedCells(
		selection: ISelection
	): void {
		while (this._updateCellRangeToContainAllMergedCells(selection.range)) {
			// Continue to update cell ranges until no change has been found anymore
		}
	}

	/**
	 * Update the passed range to contain all merged cells completely.
	 * @param range the range to update
	 * @returns whether there was a change and this process needs to be repeated
	 */
	private _updateCellRangeToContainAllMergedCells(
		range: ICellRange
	): boolean {
		for (let row = range.startRow; row <= range.endRow; row++) {
			for (
				let column = range.startColumn;
				column <= range.endColumn;
				column++
			) {
				const cell: ICell | null = this._cellModel.getCell(row, column);
				if (!!cell) {
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
	 * Check if the cell at the given row and column index
	 * is selected.
	 * @param rowIndex to check at
	 * @param columnIndex to check at
	 */
	public isSelected(rowIndex: number, columnIndex: number): boolean {
		for (const s of this._selections) {
			if (
				CellRangeUtil.contains(
					CellRange.fromSingleRowColumn(rowIndex, columnIndex),
					s.range
				)
			) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Extend the passed selection in the given direction.
	 * @param selection to extend
	 * @param xDiff horizontal offset to extend by
	 * @param yDiff vertical offset to extend by
	 * @param jump whether to jump to the very end in the specified direction
	 * @returns whether the selection changed
	 */
	public extendSelection(
		selection: ISelection,
		xDiff: number,
		yDiff: number,
		jump: boolean
	): boolean {
		if (!this._options.selection.allowRangeSelection) {
			return false;
		}

		const changed = this._extendSelectionInternal(
			selection,
			xDiff,
			yDiff,
			jump
		);

		this._validateSelection(selection, false);

		return changed;
	}

	private _extendSelectionInternal(
		selection: ISelection,
		xDiff: number,
		yDiff: number,
		jump: boolean
	): boolean {
		if (xDiff !== 0) {
			if (xDiff < 0) {
				if (selection.initial.column < selection.range.endColumn) {
					return this._shrinkSelectionFromRight(selection, jump);
				} else {
					return this._extendSelectionToLeft(selection, jump);
				}
			} else {
				if (selection.initial.column > selection.range.startColumn) {
					return this._shrinkSelectionFromLeft(selection, jump);
				} else {
					return this._extendSelectionToRight(selection, jump);
				}
			}
		}

		if (yDiff !== 0) {
			if (yDiff < 0) {
				if (selection.initial.row < selection.range.endRow) {
					return this._shrinkSelectionFromBottom(selection, jump);
				} else {
					return this._extendSelectionToTop(selection, jump);
				}
			} else {
				if (selection.initial.row > selection.range.startRow) {
					return this._shrinkSelectionFromTop(selection, jump);
				} else {
					return this._extendSelectionToBottom(selection, jump);
				}
			}
		}

		return false;
	}

	private _shrinkSelectionFromLeft(
		selection: ISelection,
		jump: boolean
	): boolean {
		const nextColumnShrinkableTo =
			this._findNextShrinkableColumnFromLeftForSelection(selection);

		const isShrinkable = nextColumnShrinkableTo > -1;
		if (!isShrinkable) {
			// Extend the selection in the opposite direction instead
			return this._extendSelectionToRight(selection, jump);
		}

		const newColumn = jump
			? selection.initial.column
			: nextColumnShrinkableTo;

		const oldValue = selection.range.startColumn;
		selection.range.startColumn = newColumn;
		if (!this._transformSelection(selection, true)) {
			selection.range.startColumn = oldValue; // Set old value
			return false;
		}

		return true;
	}

	private _shrinkSelectionFromRight(
		selection: ISelection,
		jump: boolean
	): boolean {
		const nextColumnShrinkableTo =
			this._findNextShrinkableColumnFromRightForSelection(selection);

		const isShrinkable = nextColumnShrinkableTo > -1;
		if (!isShrinkable) {
			// Extend the selection in the opposite direction instead
			return this._extendSelectionToLeft(selection, jump);
		}

		const newColumn = jump
			? selection.initial.column
			: nextColumnShrinkableTo;

		const oldValue = selection.range.endColumn;
		selection.range.endColumn = newColumn;
		if (!this._transformSelection(selection, true)) {
			selection.range.endColumn = oldValue; // Set old value
			return false;
		}

		return true;
	}

	private _shrinkSelectionFromTop(
		selection: ISelection,
		jump: boolean
	): boolean {
		const nextRowShrinkableTo =
			this._findNextShrinkableRowFromTopForSelection(selection);

		const isShrinkable = nextRowShrinkableTo > -1;
		if (!isShrinkable) {
			// Extend the selection in the opposite direction instead
			return this._extendSelectionToBottom(selection, jump);
		}

		const newRow = jump ? selection.initial.row : nextRowShrinkableTo;

		const oldValue = selection.range.startRow;
		selection.range.startRow = newRow;
		if (!this._transformSelection(selection, true)) {
			selection.range.startRow = oldValue; // Set old value
			return false;
		}

		return true;
	}

	private _shrinkSelectionFromBottom(
		selection: ISelection,
		jump: boolean
	): boolean {
		const nextRowShrinkableTo =
			this._findNextShrinkableRowFromBottomForSelection(selection);

		const isShrinkable = nextRowShrinkableTo > -1;
		if (!isShrinkable) {
			// Extend the selection in the opposite direction instead
			return this._extendSelectionToTop(selection, jump);
		}

		const newRow = jump ? selection.initial.row : nextRowShrinkableTo;

		const oldValue = selection.range.endRow;
		selection.range.endRow = newRow;
		if (!this._transformSelection(selection, true)) {
			selection.range.endRow = oldValue; // Set old value
			return false;
		}

		return true;
	}

	private _extendSelectionToLeft(
		selection: ISelection,
		jump: boolean
	): boolean {
		const newColumn = jump
			? this._findColumnOfNextVisibleCell(
					-1,
					selection.initial.row,
					false
			  )
			: this._findColumnOfPreviousVisibleCell(
					selection.range.startColumn,
					selection.initial.row,
					false
			  );
		if (newColumn === -1) {
			return false;
		}

		const oldValue = selection.range.startColumn;
		selection.range.startColumn = newColumn;
		if (!this._transformSelection(selection, true)) {
			selection.range.startColumn = oldValue; // Set old value
			return false;
		}

		return true;
	}

	private _extendSelectionToRight(
		selection: ISelection,
		jump: boolean
	): boolean {
		const newColumn = jump
			? this._findColumnOfPreviousVisibleCell(
					this._cellModel.getColumnCount(),
					selection.initial.row,
					false
			  )
			: this._findColumnOfNextVisibleCell(
					selection.range.endColumn,
					selection.initial.row,
					false
			  );
		if (newColumn === -1) {
			return false;
		}

		const oldValue = selection.range.endColumn;
		selection.range.endColumn = newColumn;
		if (!this._transformSelection(selection, true)) {
			selection.range.endColumn = oldValue; // Set old value
			return false;
		}

		return true;
	}

	private _extendSelectionToTop(
		selection: ISelection,
		jump: boolean
	): boolean {
		const newRow = jump
			? this._findRowOfNextVisibleCell(
					-1,
					selection.initial.column,
					false
			  )
			: this._findRowOfPreviousVisibleCell(
					selection.range.startRow,
					selection.initial.column,
					false
			  );
		if (newRow === -1) {
			return false;
		}

		const oldValue = selection.range.startRow;
		selection.range.startRow = newRow;
		if (!this._transformSelection(selection, true)) {
			selection.range.startRow = oldValue; // Set old value
			return false;
		}

		return true;
	}

	private _extendSelectionToBottom(
		selection: ISelection,
		jump: boolean
	): boolean {
		const newRow = jump
			? this._findRowOfPreviousVisibleCell(
					this._cellModel.getRowCount(),
					selection.initial.column,
					false
			  )
			: this._findRowOfNextVisibleCell(
					selection.range.endRow,
					selection.initial.column,
					false
			  );
		if (newRow === -1) {
			return false;
		}

		const oldValue = selection.range.endRow;
		selection.range.endRow = newRow;
		if (!this._transformSelection(selection, true)) {
			selection.range.endRow = oldValue; // Set old value
			return false;
		}

		return true;
	}

	/**
	 * Move the current primary selection
	 * in the given direction.
	 * @param selection to move
	 * @param xDiff horizontal offset to move by
	 * @param yDiff vertical offset to move by
	 * @param jump whether to jump to the very end in the specified direction
	 * @returns whether the selection changed
	 */
	public moveSelection(
		selection: ISelection,
		xDiff: number,
		yDiff: number,
		jump: boolean
	): boolean {
		if (xDiff !== 0) {
			if (xDiff < 0) {
				// Find previous cell to select (if any)
				const previousColumn = jump
					? this._findColumnOfNextVisibleCell(
							-1,
							selection.initial.row,
							false
					  )
					: this._findColumnOfPreviousVisibleCell(
							selection.initial.column,
							selection.initial.row,
							false
					  );
				if (previousColumn === -1) {
					return false;
				}

				const oldRange = selection.range;
				const oldInitial = selection.initial.column;
				selection.range = this._findCellRange(
					selection.initial.row,
					previousColumn
				);
				selection.initial.column = previousColumn;
				if (!this._transformSelection(selection, true)) {
					selection.range = oldRange;
					selection.initial.column = oldInitial;
					return false;
				}

				return true;
			} else {
				// Find next cell to select (if any)
				const nextColumn = jump
					? this._findColumnOfPreviousVisibleCell(
							this._cellModel.getColumnCount(),
							selection.initial.row,
							false
					  )
					: this._findColumnOfNextVisibleCell(
							selection.initial.column,
							selection.initial.row,
							false
					  );
				if (nextColumn === -1) {
					return false;
				}

				const oldRange = selection.range;
				const oldInitial = selection.initial.column;
				selection.range = this._findCellRange(
					selection.initial.row,
					nextColumn
				);
				selection.initial.column = nextColumn;
				if (!this._transformSelection(selection, true)) {
					selection.range = oldRange;
					selection.initial.column = oldInitial;
					return false;
				}

				return true;
			}
		}

		if (yDiff !== 0) {
			if (yDiff < 0) {
				// Find previous cell to select (if any)
				const previousRow = jump
					? this._findRowOfNextVisibleCell(
							-1,
							selection.initial.column,
							false
					  )
					: this._findRowOfPreviousVisibleCell(
							selection.initial.row,
							selection.initial.column,
							false
					  );
				if (previousRow === -1) {
					return false;
				}

				const oldRange = selection.range;
				const oldInitial = selection.initial.row;
				selection.range = this._findCellRange(
					previousRow,
					selection.initial.column
				);
				selection.initial.row = previousRow;
				if (!this._transformSelection(selection, true)) {
					selection.range = oldRange;
					selection.initial.row = oldInitial;
					return false;
				}

				return true;
			} else {
				// Find next cell to select (if any)
				const nextRow = jump
					? this._findRowOfPreviousVisibleCell(
							this._cellModel.getRowCount(),
							selection.initial.row,
							false
					  )
					: this._findRowOfNextVisibleCell(
							selection.initial.row,
							selection.initial.column,
							false
					  );
				if (nextRow === -1) {
					return false;
				}

				const oldRange = selection.range;
				const oldInitial = selection.initial.row;
				selection.range = this._findCellRange(
					nextRow,
					selection.initial.column
				);
				selection.initial.row = nextRow;
				if (!this._transformSelection(selection, true)) {
					selection.range = oldRange;
					selection.initial.row = oldInitial;
					return false;
				}

				return true;
			}
		}

		return false;
	}

	/**
	 * Find the cell range of the cell at the given row and column.
	 * @param row to get cell range for
	 * @param column to get cell range for
	 */
	private _findCellRange(row: number, column: number): ICellRange {
		const cell = this._cellModel.getCell(row, column);
		let range: ICellRange;
		if (!!cell) {
			return {
				startRow: cell.range.startRow,
				endRow: cell.range.endRow,
				startColumn: cell.range.startColumn,
				endColumn: cell.range.endColumn,
			};
		} else {
			range = CellRange.fromSingleRowColumn(row, column);
		}

		return range;
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

		const cellRange: ICellRange = this._cellModel.getCell(
			primary.initial.row,
			primary.initial.column
		)?.range ?? {
			startRow: primary.initial.row,
			endRow: primary.initial.row,
			startColumn: primary.initial.column,
			endColumn: primary.initial.column,
		};

		// Make sure initial is at the correct position for the movement in case of a merged cell
		if (!CellRangeUtil.isSingleRowColumnRange(cellRange)) {
			if (xDiff !== 0) {
				if (xDiff > 0) {
					primary.initial.column =
						this._cellModel.findPreviousVisibleColumn(
							cellRange.endColumn
						);
				} else {
					primary.initial.column =
						this._cellModel.findNextVisibleColumn(
							cellRange.startColumn
						);
				}
			}

			if (yDiff !== 0) {
				if (xDiff > 0) {
					primary.initial.row =
						this._cellModel.findPreviousVisibleRow(
							cellRange.endRow
						);
				} else {
					primary.initial.row = this._cellModel.findNextVisibleRow(
						cellRange.startRow
					);
				}
			}
		}

		// Check bounds of the selection we can move the initial to
		const firstVisibleRow: number = this._cellModel.findNextVisibleRow(
			primary.range.startRow
		);
		const firstVisibleColumn: number =
			this._cellModel.findNextVisibleColumn(primary.range.startColumn);
		const lastVisibleRow: number = this._cellModel.findPreviousVisibleRow(
			primary.range.endRow
		);
		const lastVisibleColumn: number =
			this._cellModel.findPreviousVisibleColumn(primary.range.endColumn);

		if (xDiff !== 0) {
			if (xDiff > 0) {
				// Check if we can move initial to the right
				const nextColumn: number = this._findColumnOfNextVisibleCell(
					primary.initial.column,
					primary.initial.row,
					false
				);

				if (nextColumn === -1 || nextColumn > lastVisibleColumn) {
					// Wrap around
					primary.initial.column = firstVisibleColumn;

					// Check if we're still in the same cell range
					if (
						CellRangeUtil.contains(
							CellRange.fromSingleRowColumn(
								primary.initial.row,
								primary.initial.column
							),
							cellRange
						)
					) {
						// Make sure initial is set to last row to properly wrap initial selection
						primary.initial.row =
							this._cellModel.findPreviousVisibleRow(
								cellRange.endRow
							);
					}

					const nextRow: number = this._findRowOfNextVisibleCell(
						primary.initial.row,
						primary.initial.column,
						true
					);
					if (nextRow === -1 || nextRow > lastVisibleRow) {
						// Go to next selection (if any) or start with first initial position in the primary selection again
						if (this.getSelections().length > 1) {
							// Go to next selection
							this._primaryIndex += 1;
							if (
								this._primaryIndex >=
								this.getSelections().length
							) {
								this._primaryIndex = 0;
							}

							const newPrimary: ISelection = this.getPrimary();

							// Set initial position properly
							newPrimary.initial = {
								row: this._cellModel.findNextVisibleRow(
									newPrimary.range.startRow
								),
								column: this._cellModel.findNextVisibleColumn(
									newPrimary.range.startColumn
								),
							};
						} else {
							// Start with first initial position again
							primary.initial.row = firstVisibleRow;
							primary.initial.column = firstVisibleColumn;
						}
					} else {
						primary.initial.row = nextRow;
					}
				} else {
					primary.initial.column = nextColumn;
				}
			} else {
				// Check if we can move initial to the left
				const previousColumn: number =
					this._findColumnOfPreviousVisibleCell(
						primary.initial.column,
						primary.initial.row,
						false
					);

				if (
					previousColumn === -1 ||
					previousColumn < firstVisibleColumn
				) {
					// Wrap around
					primary.initial.column = lastVisibleColumn;

					// Check if we're still in the same cell range
					if (
						CellRangeUtil.contains(
							CellRange.fromSingleRowColumn(
								primary.initial.row,
								primary.initial.column
							),
							cellRange
						)
					) {
						// Make sure initial is set to first row to properly wrap initial selection
						primary.initial.row =
							this._cellModel.findNextVisibleRow(
								cellRange.startRow
							);
					}

					const previousRow: number =
						this._findRowOfPreviousVisibleCell(
							primary.initial.row,
							primary.initial.column,
							true
						);
					if (previousRow === -1 || previousRow < firstVisibleRow) {
						// Go to previous selection (if any) or start with first initial position in the primary selection again
						if (this.getSelections().length > 1) {
							// Go to previous selection
							this._primaryIndex -= 1;
							if (this._primaryIndex < 0) {
								this._primaryIndex =
									this.getSelections().length - 1;
							}

							const newPrimary: ISelection = this.getPrimary();

							// Set initial position properly
							newPrimary.initial = {
								row: this._cellModel.findPreviousVisibleRow(
									newPrimary.range.endRow
								),
								column: this._cellModel.findPreviousVisibleColumn(
									newPrimary.range.endColumn
								),
							};
						} else {
							// Start with last initial position again
							primary.initial.row = lastVisibleRow;
							primary.initial.column = lastVisibleColumn;
						}
					} else {
						primary.initial.row = previousRow;
					}
				} else {
					primary.initial.column = previousColumn;
				}
			}
		}

		if (yDiff !== 0) {
			if (yDiff > 0) {
				// Check if we can move initial down
				const nextRow: number = this._findRowOfNextVisibleCell(
					primary.initial.row,
					primary.initial.column,
					false
				);

				if (nextRow === -1 || nextRow > lastVisibleRow) {
					// Wrap around
					primary.initial.row = firstVisibleRow;

					// Check if we're still in the same cell range
					if (
						CellRangeUtil.contains(
							CellRange.fromSingleRowColumn(
								primary.initial.row,
								primary.initial.column
							),
							cellRange
						)
					) {
						// Make sure initial is set to last column to properly wrap initial selection
						primary.initial.column =
							this._cellModel.findPreviousVisibleColumn(
								cellRange.endColumn
							);
					}

					const nextColumn: number =
						this._findColumnOfNextVisibleCell(
							primary.initial.column,
							primary.initial.row,
							true
						);
					if (nextColumn === -1 || nextColumn > lastVisibleColumn) {
						// Go to next selection (if any) or start with first initial position in the primary selection again
						if (this.getSelections().length > 1) {
							// Go to next selection
							this._primaryIndex += 1;
							if (
								this._primaryIndex >=
								this.getSelections().length
							) {
								this._primaryIndex = 0;
							}

							const newPrimary: ISelection = this.getPrimary();

							// Set initial position properly
							newPrimary.initial = {
								row: this._cellModel.findNextVisibleRow(
									newPrimary.range.startRow
								),
								column: this._cellModel.findNextVisibleColumn(
									newPrimary.range.startColumn
								),
							};
						} else {
							// Start with first initial position again
							primary.initial.row = firstVisibleRow;
							primary.initial.column = firstVisibleColumn;
						}
					} else {
						primary.initial.column = nextColumn;
					}
				} else {
					primary.initial.row = nextRow;
				}
			} else {
				// Check if we can move initial up
				const previousRow: number = this._findRowOfPreviousVisibleCell(
					primary.initial.row,
					primary.initial.column,
					false
				);

				if (previousRow === -1 || previousRow < firstVisibleRow) {
					// Wrap around
					primary.initial.row = lastVisibleRow;

					// Check if we're still in the same cell range
					if (
						CellRangeUtil.contains(
							CellRange.fromSingleRowColumn(
								primary.initial.row,
								primary.initial.column
							),
							cellRange
						)
					) {
						// Make sure initial is set to first column to properly wrap initial selection
						primary.initial.column =
							this._cellModel.findNextVisibleColumn(
								cellRange.startColumn
							);
					}

					const previousColumn: number =
						this._findColumnOfPreviousVisibleCell(
							primary.initial.column,
							primary.initial.row,
							true
						);
					if (
						previousColumn === -1 ||
						previousColumn < firstVisibleColumn
					) {
						// Go to previous selection (if any) or start with first initial position in the primary selection again
						if (this.getSelections().length > 1) {
							// Go to previous selection
							this._primaryIndex -= 1;
							if (this._primaryIndex < 0) {
								this._primaryIndex =
									this.getSelections().length - 1;
							}

							const newPrimary: ISelection = this.getPrimary();

							// Set initial position properly
							newPrimary.initial = {
								row: this._cellModel.findPreviousVisibleRow(
									newPrimary.range.endRow
								),
								column: this._cellModel.findPreviousVisibleColumn(
									newPrimary.range.endColumn
								),
							};
						} else {
							// Start with last initial position again
							primary.initial.row = lastVisibleRow;
							primary.initial.column = lastVisibleColumn;
						}
					} else {
						primary.initial.column = previousColumn;
					}
				} else {
					primary.initial.row = previousRow;
				}
			}
		}
	}

	/**
	 * Find row of the next visible cell.
	 * @param afterRow row index to start from (exclusive)
	 * @param column index to use
	 * @param allowSameCell whether to allow resulting in a row in the same cell (when having a merged cell)
	 * @return the next visible index or -1
	 */
	private _findRowOfNextVisibleCell(
		afterRow: number,
		column: number,
		allowSameCell: boolean
	): number {
		const cell: ICell | null =
			afterRow >= 0 ? this._cellModel.getCell(afterRow, column) : null;

		let nextVisibleRowCell: ICell = null;
		let nextVisibleRow: number = afterRow;
		do {
			nextVisibleRow = this._cellModel.findNextVisibleRow(
				nextVisibleRow + 1
			);
			if (nextVisibleRow === -1) {
				return -1;
			}

			nextVisibleRowCell = this._cellModel.getCell(
				nextVisibleRow,
				column
			);
		} while (
			nextVisibleRowCell !== null &&
			cell !== null &&
			nextVisibleRowCell === cell &&
			!allowSameCell
		);

		return nextVisibleRow;
	}

	/**
	 * Find row of the previous visible cell.
	 * @param beforeRow row index to start from (exclusive)
	 * @param column index to use
	 * @param allowSameCell whether to allow resulting in a row in the same cell (when having a merged cell)
	 * @return the previous visible index or -1
	 */
	private _findRowOfPreviousVisibleCell(
		beforeRow: number,
		column: number,
		allowSameCell: boolean
	): number {
		const cell: ICell | null =
			beforeRow <= this._cellModel.getRowCount() - 1
				? this._cellModel.getCell(beforeRow, column)
				: null;

		let previousVisibleRowCell: ICell = null;
		let previousVisibleRow: number = beforeRow;
		do {
			previousVisibleRow = this._cellModel.findPreviousVisibleRow(
				previousVisibleRow - 1
			);
			if (previousVisibleRow === -1) {
				return -1;
			}

			previousVisibleRowCell = this._cellModel.getCell(
				previousVisibleRow,
				column
			);
		} while (
			previousVisibleRowCell !== null &&
			cell !== null &&
			previousVisibleRowCell === cell &&
			!allowSameCell
		);

		return previousVisibleRow;
	}

	/**
	 * Find column of the next visible cell.
	 * @param afterColumn column index to start from (exclusive)
	 * @param row index to use
	 * @param allowSameCell whether to allow resulting in a column in the same cell (when having a merged cell)
	 * @return the next visible index or -1
	 */
	private _findColumnOfNextVisibleCell(
		afterColumn: number,
		row: number,
		allowSameCell: boolean
	): number {
		const cell: ICell | null =
			afterColumn >= 0 ? this._cellModel.getCell(row, afterColumn) : null;

		let nextVisibleColumnCell: ICell = null;
		let nextVisibleColumn: number = afterColumn;
		do {
			nextVisibleColumn = this._cellModel.findNextVisibleColumn(
				nextVisibleColumn + 1
			);
			if (nextVisibleColumn === -1) {
				return -1;
			}

			nextVisibleColumnCell = this._cellModel.getCell(
				row,
				nextVisibleColumn
			);
		} while (
			nextVisibleColumnCell !== null &&
			cell !== null &&
			nextVisibleColumnCell === cell &&
			!allowSameCell
		);

		return nextVisibleColumn;
	}

	/**
	 * Find column of the previous visible cell.
	 * @param beforeColumn column index to start from (exclusive)
	 * @param row index to use
	 * @param allowSameCell whether to allow resulting in a column in the same cell (when having a merged cell)
	 * @return the previous visible index or -1
	 */
	private _findColumnOfPreviousVisibleCell(
		beforeColumn: number,
		row: number,
		allowSameCell: boolean
	): number {
		const cell: ICell | null =
			beforeColumn <= this._cellModel.getColumnCount() - 1
				? this._cellModel.getCell(row, beforeColumn)
				: null;

		let previousVisibleColumnCell: ICell = null;
		let previousVisibleColumn: number = beforeColumn;
		do {
			previousVisibleColumn = this._cellModel.findPreviousVisibleColumn(
				previousVisibleColumn - 1
			);
			if (previousVisibleColumn === -1) {
				return -1;
			}

			previousVisibleColumnCell = this._cellModel.getCell(
				row,
				previousVisibleColumn
			);
		} while (
			previousVisibleColumnCell !== null &&
			cell !== null &&
			previousVisibleColumnCell === cell &&
			!allowSameCell
		);

		return previousVisibleColumn;
	}

	/**
	 * Find the next column of the given selection to shrink to from the right.
	 * Can return -1 if no such column may be found.
	 * @param selection to shrink
	 * @private
	 */
	private _findNextShrinkableColumnFromRightForSelection(
		selection: ISelection
	): number {
		outer: for (
			let column = selection.range.endColumn;
			column > selection.initial.column;
			column--
		) {
			// Check if column is visible -> otherwise continue
			if (this._cellModel.isColumnHidden(column)) {
				continue;
			}

			// Iterate over cells in the columns
			for (
				let row = selection.range.startRow;
				row <= selection.range.endRow;
				row++
			) {
				// Check if row is visible -> otherwise continue
				if (this._cellModel.isRowHidden(row)) {
					continue;
				}

				// Check if cell has startColumn that is lower than the current column
				const cell = this._cellModel.getCell(row, column);
				if (!!cell) {
					const range = cell.range;
					if (range.startColumn < column) {
						column = range.startColumn + 1;
						continue outer;
					}
				}
			}

			return column - 1;
		}

		return -1;
	}

	/**
	 * Find the next column of the given selection to shrink to from the left.
	 * Can return -1 if no such column may be found.
	 * @param selection to shrink
	 * @private
	 */
	private _findNextShrinkableColumnFromLeftForSelection(
		selection: ISelection
	): number {
		outer: for (
			let column = selection.range.startColumn;
			column < selection.initial.column;
			column++
		) {
			// Check if column is visible -> otherwise continue
			if (this._cellModel.isColumnHidden(column)) {
				continue;
			}

			// Iterate over cells in the columns
			for (
				let row = selection.range.startRow;
				row <= selection.range.endRow;
				row++
			) {
				// Check if row is visible -> otherwise continue
				if (this._cellModel.isRowHidden(row)) {
					continue;
				}

				// Check if cell has endColumn that is higher than the current column
				const cell = this._cellModel.getCell(row, column);
				if (!!cell) {
					const range = cell.range;
					if (range.endColumn > column) {
						column = range.endColumn - 1;
						continue outer;
					}
				}
			}

			return column + 1;
		}

		return -1;
	}

	/**
	 * Find the next row of the given selection to shrink to from the bottom.
	 * Can return -1 if no such row may be found.
	 * @param selection to shrink
	 * @private
	 */
	private _findNextShrinkableRowFromBottomForSelection(
		selection: ISelection
	): number {
		outer: for (
			let row = selection.range.endRow;
			row > selection.initial.row;
			row--
		) {
			// Check if row is visible -> otherwise continue
			if (this._cellModel.isRowHidden(row)) {
				continue;
			}

			// Iterate over cells in the column
			for (
				let column = selection.range.startColumn;
				column <= selection.range.endColumn;
				column++
			) {
				// Check if column is visible -> otherwise continue
				if (this._cellModel.isColumnHidden(column)) {
					continue;
				}

				// Check if cell has startRow that is lower than the current row
				const cell = this._cellModel.getCell(row, column);
				if (!!cell) {
					const range = cell.range;
					if (range.startRow < row) {
						row = range.startRow + 1;
						continue outer;
					}
				}
			}

			return row - 1;
		}

		return -1;
	}

	/**
	 * Find the next row of the given selection to shrink to from the top.
	 * Can return -1 if no such row may be found.
	 * @param selection to shrink
	 * @private
	 */
	private _findNextShrinkableRowFromTopForSelection(
		selection: ISelection
	): number {
		outer: for (
			let row = selection.range.startRow;
			row < selection.initial.row;
			row++
		) {
			// Check if row is visible -> otherwise continue
			if (this._cellModel.isRowHidden(row)) {
				continue;
			}

			// Iterate over cells in the column
			for (
				let column = selection.range.startColumn;
				column <= selection.range.endColumn;
				column++
			) {
				// Check if column is visible -> otherwise continue
				if (this._cellModel.isColumnHidden(column)) {
					continue;
				}

				// Check if cell has endRow that is higher than the current row
				const cell = this._cellModel.getCell(row, column);
				if (!!cell) {
					const range = cell.range;
					if (range.endRow > row) {
						row = range.endRow - 1;
						continue outer;
					}
				}
			}

			return row + 1;
		}

		return -1;
	}

	/**
	 * Transform the selection by a user defined routine.
	 * @param selection to transform
	 * @param causedByMove whether the selection is caused by a move (keyboard navigation)
	 * @returns whether the selection is possible
	 * @private
	 */
	private _transformSelection(
		selection: ISelection,
		causedByMove: boolean
	): boolean {
		if (!this._options.selection.selectionTransform) {
			return true; // No user defined routine present
		}

		const result = this._options.selection.selectionTransform(
			selection,
			this._cellModel,
			causedByMove
		);

		// Making sure the transformed selection satisfies the option whether only a single cell can be selected
		if (!this._options.selection.allowRangeSelection) {
			selection.range = {
				startRow: selection.initial.row,
				endRow: selection.initial.row,
				startColumn: selection.initial.column,
				endColumn: selection.initial.column,
			};
		}

		return result;
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
