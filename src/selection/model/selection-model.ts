import {ISelectionModel} from "./selection-model.interface";
import {ISelection} from "../selection";
import {ICellRange} from "../../cell/range/cell-range";

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
	 */
	public addSelection(selection: ISelection): void {
		this._selections.push(selection);
	}

	/**
	 * Validate a selection.
	 * For example to range over a complete merged cells.
	 *
	 * @param selection to validate
	 */
	public validateSelection(selection: ISelection): void {
		SelectionModel._validateCellRange(selection.range);

		// TODO Check whether selection range over all merged cells in range

		// TODO Check whether selection is already (completely) included in another selection -> remove it from selection (subtract -> create new selections instead)
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

}
