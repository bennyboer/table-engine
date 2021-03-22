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
	 * @param validate whether to validate the passed selection first
	 */
	addSelection(selection: ISelection, validate: boolean): void;

	/**
	 * Clear all selections.
	 */
	clear(): void;

	/**
	 * Select the next possible row.
	 */
	selectNextRow(): void;

	/**
	 * Select the previous possible row.
	 */
	selectPreviousRow(): void;

	/**
	 * Select the next column.
	 */
	selectNextColumn(): void;

	/**
	 * Select the previous column.
	 */
	selectPreviousColumn(): void;

}
