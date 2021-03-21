import {ISelection} from "../selection";

/**
 * Representation of the table-engines selection model.
 */
export interface ISelectionModel {

	/**
	 * Get the primary selection (if any).
	 */
	getPrimary(): ISelection | null;

	/**
	 * Set the given index to be the primary selection.
	 * @param index of the selection to set to primary
	 */
	setPrimary(index: number): void;

	/**
	 * Get the current selections.
	 */
	getSelections(): ISelection[];

	/**
	 * Add a selection to the model.
	 * @param selection to add
	 */
	addSelection(selection: ISelection): void;

	/**
	 * Validate a selection.
	 * For example to range over a complete merged cells.
	 *
	 * @param selection to validate
	 */
	validateSelection(selection: ISelection): void;

	/**
	 * Clear all selections.
	 */
	clear(): void;

}
