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
	 * Extend the passed selection in the given direction.
	 * @param selection to extend
	 * @param xDiff horizontal offset to extend by
	 * @param yDiff vertical offset to extend by
	 */
	extendSelection(selection: ISelection, xDiff: number, yDiff: number): void;

	/**
	 * Move the passed selection in the given direction.
	 * @param selection to move
	 * @param xDiff horizontal offset to move by
	 * @param yDiff vertical offset to move by
	 */
	moveSelection(selection: ISelection, xDiff: number, yDiff: number): void;

	/**
	 * Move the initial in the current primary selection (if any)
	 * in the given direction.
	 * @param xDiff horizontal offset to move by
	 * @param yDiff vertical offset to move by
	 */
	moveInitial(xDiff: number, yDiff: number): void;

}
