import { ISelection } from './selection';
import { ICellModel, ICellRange } from '../cell';

/**
 * Selection transform that will transform selections that start in the first row
 * or column to fill the entire selected row or column.
 */
export const ROW_COLUMN_HEADER_TRANSFORM: (
	selection: ISelection,
	cellModel: ICellModel,
	causedByMove: boolean
) => boolean = (selection, cellModel, causedByMove: boolean) => {
	if (causedByMove) {
		// Prevent selection of the first row and column by move (keyboard navigation).
		if (selection.initial.row === 0) {
			selection.initial.row = 1;
		}
		if (selection.initial.column === 0) {
			selection.initial.column = 1;
		}
		if (selection.range.startRow === 0) {
			selection.range.startRow = 1;
		}
		if (selection.range.endRow === 0) {
			selection.range.endRow = 1;
		}
		if (selection.range.startColumn === 0) {
			selection.range.startColumn = 1;
		}
		if (selection.range.endColumn === 0) {
			selection.range.endColumn = 1;
		}
	} else {
		// Select a whole row/column or when clicking on corner cell select everything
		if (selection.initial.row === 0 && selection.initial.column === 0) {
			// Select all cells
			selection.range = {
				startRow: 1,
				endRow: cellModel.getRowCount() - 1,
				startColumn: 1,
				endColumn: cellModel.getColumnCount() - 1,
			};
			selection.initial = {
				row: 1,
				column: 1,
			};
		} else if (selection.initial.row === 0) {
			// Select whole column
			selection.range = {
				startRow: 1,
				endRow: cellModel.getRowCount() - 1,
				startColumn: selection.range.startColumn,
				endColumn: selection.range.endColumn,
			};
			selection.initial = {
				row: 1,
				column: selection.initial.column,
			};
		} else if (selection.initial.column === 0) {
			// Select whole row
			selection.range = {
				startRow: selection.range.startRow,
				endRow: selection.range.endRow,
				startColumn: 1,
				endColumn: cellModel.getColumnCount() - 1,
			};
			selection.initial = {
				row: selection.initial.row,
				column: 1,
			};
		}
	}

	return true; // All other selections are allowed and do not need modification
};

/**
 * Options for the selection model.
 */
export interface ISelectionOptions {
	/**
	 * Whether selecting ranges is allowed.
	 * When false only a single cell can be selected.
	 */
	allowRangeSelection?: boolean;

	/**
	 * Whether multiple selections are allowed.
	 */
	allowMultiSelection?: boolean;

	/**
	 * Transform for every selection added to the model.
	 * @param selection to transform
	 * @param cellModel the cell model
	 * @param causedByMove whether the selection was caused by a move (keyboard navigation)
	 * @returns whether the selection is allowed
	 */
	selectionTransform?: (
		selection: ISelection,
		cellModel: ICellModel,
		causedByMove: boolean
	) => boolean;

	/**
	 * Options for a copy-handle.
	 *
	 * A copy handle is the small grasp (mostly a rectangle)
	 * on the right-lower edge of the primary selection rectangle,
	 * that you might drag to invoke a copy-like operation.
	 */
	copyHandle?: ICopyHandleOptions;
}

/**
 * Options for the copy-handle.
 * A copy handle is the small grasp (mostly a rectangle)
 * on the right-lower edge of the primary selection rectangle,
 * that you might drag to invoke a copy-like operation.
 */
export interface ICopyHandleOptions {
	/**
	 * Whether to show the copy handle on the primary selection.
	 * Note that the copy-handle will only be shown when there is a single selection rectangle.
	 */
	showCopyHandle?: boolean;

	/**
	 * Handler to apply an operation based on the copy-handle movement.
	 * @param origin the origin cell range (range before dragging the handle)
	 * @param target the target cell range (range after dropping the handle)
	 */
	copyHandler?: (origin: ICellRange, target: ICellRange) => void;
}

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: ISelectionOptions) => {
	if (!options) {
		options = {};
	}

	if (
		options.allowRangeSelection === undefined ||
		options.allowRangeSelection === null
	) {
		options.allowRangeSelection = true;
	}

	if (
		options.allowMultiSelection === undefined ||
		options.allowMultiSelection === null
	) {
		options.allowMultiSelection = true;
	}

	if (!options.copyHandle) {
		options.copyHandle = {};
	}

	if (
		options.copyHandle.showCopyHandle === null ||
		options.copyHandle.showCopyHandle === undefined
	) {
		options.copyHandle.showCopyHandle = false;
	}

	return options;
};
