import { IInitialPosition, ISelection } from '../selection';
import { ICellRange } from '../../cell';

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
	 * Check if the cell at the given row and column index
	 * is selected.
	 * @param rowIndex to check at
	 * @param columnIndex to check at
	 */
	isSelected(rowIndex: number, columnIndex: number): boolean;

	/**
	 * Add a selection to the model.
	 * @param selection to add
	 * @param validate whether to validate the passed selection first
	 * @param subtract whether to subtract from existing selections when needed
	 */
	addSelection(
		selection: ISelection,
		validate: boolean,
		subtract: boolean
	): void;

	/**
	 * Modify the passed selection, that is already in the selection model.
	 * @param selection to modify
	 * @param newRange to set
	 * @param newInitial to set
	 * @param validate whether to validate the passed selection first
	 * @param subtract whether to subtract from existing selections when needed
	 * @returns whether the selection model changed
	 */
	modifySelection(
		selection: ISelection,
		newRange: ICellRange,
		newInitial: IInitialPosition,
		validate: boolean,
		subtract: boolean
	): boolean;

	/**
	 * Remove a selection already existing in the model.
	 * @param selection to remove
	 */
	removeSelection(selection: ISelection): void;

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
	extendSelection(
		selection: ISelection,
		xDiff: number,
		yDiff: number,
		jump: boolean
	): boolean;

	/**
	 * Move the passed selection in the given direction.
	 * @param selection to move
	 * @param xDiff horizontal offset to move by
	 * @param yDiff vertical offset to move by
	 * @param jump whether to jump to the very end in the specified direction
	 * @returns whether the selection changed
	 */
	moveSelection(
		selection: ISelection,
		xDiff: number,
		yDiff: number,
		jump: boolean
	): boolean;

	/**
	 * Move the initial in the current primary selection (if any)
	 * in the given direction.
	 * @param xDiff horizontal offset to move by
	 * @param yDiff vertical offset to move by
	 */
	moveInitial(xDiff: number, yDiff: number): void;
}
