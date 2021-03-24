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
	 * @param subtract whether to subtract from existing selections when needed
	 */
	addSelection(selection: ISelection, validate: boolean, subtract: boolean): void;

	/**
	 * Remove a selection already existing in the model.
	 * @param selection to remove
	 */
	removeSelection(selection: ISelection): void;

	/**
	 * Validate the passed selection that must be in the current selection model.
	 * @param selection to validate
	 * @param subtract whether to subtract from existing selections when needed
	 */
	validate(selection: ISelection, subtract: boolean): IValidationResult;

	/**
	 * Clear all selections.
	 */
	clear(): void;

	/**
	 * Extend the passed selection in the given direction.
	 * @param selection to extend
	 * @param xDiff horizontal offset to extend by
	 * @param yDiff vertical offset to extend by
	 * @param jump whether to jump to the very end in the specified direction
	 * @returns whether the selection changed
	 */
	extendSelection(selection: ISelection, xDiff: number, yDiff: number, jump: boolean): boolean;

	/**
	 * Move the passed selection in the given direction.
	 * @param selection to move
	 * @param xDiff horizontal offset to move by
	 * @param yDiff vertical offset to move by
	 * @param jump whether to jump to the very end in the specified direction
	 * @returns whether the selection changed
	 */
	moveSelection(selection: ISelection, xDiff: number, yDiff: number, jump: boolean): boolean;

	/**
	 * Move the initial in the current primary selection (if any)
	 * in the given direction.
	 * @param xDiff horizontal offset to move by
	 * @param yDiff vertical offset to move by
	 */
	moveInitial(xDiff: number, yDiff: number): void;

}

/**
 * Result of a selection validation.
 */
export interface IValidationResult {

	/**
	 * Selections to remove.
	 */
	toRemove: ISelection[];

	/**
	 * Selections to add.
	 */
	toAdd: ISelection[];

}
