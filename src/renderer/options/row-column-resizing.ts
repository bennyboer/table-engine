import {ICellModel} from "../../cell/model/cell-model.interface";
import {ISelectionModel} from "../../selection/model/selection-model.interface";
import {ISelection} from "../../selection/selection";
import {CellRangeUtil} from "../../cell/range/cell-range-util";
import {IColor} from "../../util/color";
import {Colors} from "../../util/colors";

/**
 * Default count of rows to let the user resize columns in.
 */
export const DEFAULT_ROW_COUNT: number = 1;

/**
 * Default count of columns to let the user resize rows in.
 */
export const DEFAULT_COLUMN_COUNT: number = 1;

/**
 * Default size of the resizer.
 */
export const DEFAULT_RESIZER_SIZE: number = 5;

/**
 * Default minimum row size to resize to.
 */
export const DEFAULT_MIN_ROW_SIZE: number = 20;

/**
 * Default minimum column size to resize to.
 */
export const DEFAULT_MIN_COLUMN_SIZE: number = 20;

/**
 * Default thickness of the resizer line.
 */
export const DEFAULT_RESIZER_LINE_THICKNESS: number = 1;

/**
 * Default color of the resizer line.
 */
export const DEFAULT_RESIZER_LINE_COLOR: IColor = Colors.BLACK;

/**
 * The default resizing handler.
 */
export const DEFAULT_RESIZING_HANDLER: (newSize: number, isRow: boolean, index: number, cellModel: ICellModel, selectionModel: ISelectionModel) => boolean = (newSize, isRow, index, cellModel, selectionModel) => {
	const primary: ISelection | null = selectionModel.getPrimary();

	/*
	Check if the row/column is contained in the primary selection
	and the first row/column of the other axis is contained as well.
	 */
	const isMultiRowColumnResize: boolean = !!primary && CellRangeUtil.contains({
		startRow: isRow ? index : 1,
		endRow: isRow ? index : cellModel.getRowCount() - 1,
		startColumn: isRow ? 1 : index,
		endColumn: isRow ? cellModel.getColumnCount() - 1 : index
	}, primary.range) && CellRangeUtil.size(primary.range) > 1;

	if (isMultiRowColumnResize) {
		// Resize a bunch of rows/columns
		if (isRow) {
			const indices: number[] = [];
			for (let i = primary.range.startRow; i <= primary.range.endRow; i++) {
				indices.push(i);
			}

			cellModel.resizeRows(indices, newSize);
		} else {
			const indices: number[] = [];
			for (let i = primary.range.startColumn; i <= primary.range.endColumn; i++) {
				indices.push(i);
			}

			cellModel.resizeColumns(indices, newSize)
		}
	} else {
		// Only resize a single row/column
		if (isRow) {
			cellModel.resizeRows([index], newSize);
		} else {
			cellModel.resizeColumns([index], newSize);
		}
	}

	return true;
};

/**
 * Options for resizing rows and columns.
 */
export interface IRowColumnResizingOptions {

	/**
	 * Whether the user is allowed to resize rows or columns.
	 */
	allowResizing?: boolean;

	/**
	 * Number of rows to allow resizing for (counting from above).
	 * If set to 1, only resizing between columns in the first row is allowed.
	 */
	rowCount?: number;

	/**
	 * Number of columns to allow resizing for (counting from left).
	 * If set to 1, only resizing between rows in the first column is allowed.
	 */
	columnCount?: number;

	/**
	 * Size of the space between rows and columns to allow resizing the row/column with when dragging.
	 */
	resizerSize?: number;

	/**
	 * The minimum row size to allow resizing to.
	 */
	minRowSize?: number;

	/**
	 * The minimum column size to allow resizing to.
	 */
	minColumnSize?: number;

	/**
	 * Color of the resizer line.
	 */
	resizerLineColor?: IColor;

	/**
	 * Thickness of the resizer line.
	 */
	resizerLineThickness?: number;

	/**
	 * Handler processing the actual resizing.
	 * @param newSize to resize to
	 * @param isRow whether to resize a row or column
	 * @param index of the row (if isRow is true) or column (if isRow is false)
	 * @param cellModel to resize rows/columns with
	 * @param selectionModel to get the current selection with (if needed)
	 * @returns whether we need to repaint afterwards
	 */
	resizingHandler?: (newSize: number, isRow: boolean, index: number, cellModel: ICellModel, selectionModel: ISelectionModel) => boolean;

}

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: IRowColumnResizingOptions) => {
	if (!options) {
		options = {};
	}

	if (options.allowResizing === undefined || options.allowResizing === null) {
		options.allowResizing = false;
	}

	if (options.rowCount === undefined || options.rowCount === null) {
		options.rowCount = DEFAULT_ROW_COUNT;
	}

	if (options.columnCount === undefined || options.columnCount === null) {
		options.columnCount = DEFAULT_COLUMN_COUNT;
	}

	if (options.resizerSize === undefined || options.resizerSize === null) {
		options.resizerSize = DEFAULT_RESIZER_SIZE;
	}

	if (options.minRowSize === undefined || options.minRowSize === null) {
		options.minRowSize = DEFAULT_MIN_ROW_SIZE;
	}

	if (options.minColumnSize === undefined || options.minColumnSize === null) {
		options.minColumnSize = DEFAULT_MIN_COLUMN_SIZE;
	}

	if (options.resizerLineThickness === undefined || options.resizerLineThickness === null) {
		options.resizerLineThickness = DEFAULT_RESIZER_LINE_THICKNESS;
	}

	if (!options.resizerLineColor) {
		options.resizerLineColor = DEFAULT_RESIZER_LINE_COLOR;
	}

	if (!options.resizingHandler) {
		options.resizingHandler = DEFAULT_RESIZING_HANDLER;
	}

	return options;
};
