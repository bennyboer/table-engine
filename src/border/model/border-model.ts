import {IBorder} from "../border";
import {IBorderModel} from "./border-model.interface";
import {ICellRange} from "../../cell/range/cell-range";
import {ICellModel} from "../../cell/model/cell-model.interface";
import {ICell} from "../../cell/cell";
import {ITableEngineOptions} from "../../options";
import {IBorderSide} from "../border-side";
import {IBorderMask} from "./border-mask";

/**
 * Border model of the table-engine.
 */
export class BorderModel implements IBorderModel {

	/**
	 * Cell model of the table-engine.
	 */
	private readonly _cellModel: ICellModel;

	/**
	 * Options of the table-engine.
	 */
	private readonly _options: ITableEngineOptions;

	/**
	 * Counter for the border priorities.
	 */
	private _priorityCounter: number = 0;

	constructor(cellModel: ICellModel, options: ITableEngineOptions) {
		this._cellModel = cellModel;
		this._options = options;
	}

	/**
	 * Set a border on the outlines of the passed range.
	 * @param border to set
	 * @param range to set border on the outsides of
	 */
	public setBorder(border: IBorder, range: ICellRange): void {
		const priority: number = ++this._priorityCounter;

		for (let row = range.startRow; row <= range.endRow; row++) {
			if (!!border.left) {
				const leftCellBorder: IBorder = this._getCellBorder(row, range.startColumn, true);
				if (leftCellBorder.left?.priority !== priority) {
					leftCellBorder.left = {
						priority,
						color: border.left.color,
						size: border.left.size,
						style: border.left.style
					};
				}
			}
			if (!!border.right) {
				const rightCellBorder: IBorder = this._getCellBorder(row, range.endColumn, true);
				if (rightCellBorder.right?.priority !== priority) {
					rightCellBorder.right = {
						priority,
						color: border.right.color,
						size: border.right.size,
						style: border.right.style
					};
				}
			}
		}
		for (let column = range.startColumn; column <= range.endColumn; column++) {
			if (!!border.top) {
				const topCellBorder: IBorder = this._getCellBorder(range.startRow, column, true);
				if (topCellBorder.top?.priority !== priority) {
					topCellBorder.top = {
						priority,
						color: border.top.color,
						size: border.top.size,
						style: border.top.style
					};
				}
			}
			if (!!border.bottom) {
				const bottomCellBorder: IBorder = this._getCellBorder(range.endRow, column, true);
				if (bottomCellBorder.bottom?.priority !== priority) {
					bottomCellBorder.bottom = {
						priority,
						color: border.bottom.color,
						size: border.bottom.size,
						style: border.bottom.style
					};
				}
			}
		}
	}

	/**
	 * Set a border line.
	 * @param row to set border line to
	 * @param column to set border line to
	 * @param borderSide to set
	 * @param mask to apply border with
	 */
	public setBorderLine(row: number, column: number, borderSide: IBorderSide, mask: IBorderMask): void {
		const border: IBorder = this._getCellBorder(row, column, true);
		const priority: number = ++this._priorityCounter;

		if (mask.top) {
			border.top = {
				priority,
				color: borderSide.color,
				size: borderSide.size,
				style: borderSide.style
			};
		}
		if (mask.bottom) {
			border.bottom = {
				priority,
				color: borderSide.color,
				size: borderSide.size,
				style: borderSide.style
			};
		}
		if (mask.left) {
			border.left = {
				priority,
				color: borderSide.color,
				size: borderSide.size,
				style: borderSide.style
			};
		}
		if (mask.right) {
			border.right = {
				priority,
				color: borderSide.color,
				size: borderSide.size,
				style: borderSide.style
			};
		}
	}

	/**
	 * Get border for the cell at the given row and column index.
	 * @param rowIndex of the cell to get border at
	 * @param columnIndex of the cell to get border at
	 * @param fill whether to fill the cell border is there is none yet
	 */
	private _getCellBorder(rowIndex: number, columnIndex: number, fill: boolean): IBorder | null {
		const cell: ICell = this._cellModel.getCell(rowIndex, columnIndex, fill);
		if (!cell) {
			return null;
		}

		let border: IBorder | null = cell.border;
		if (!border && fill) {
			border = {};
			cell.border = border;
		}

		return border;
	}

	/**
	 * Get the default border to use for the given row and column.
	 * @param row to get default border at
	 * @param column to get default border at
	 */
	private _getDefaultBorder(row: number, column: number): IBorder {
		return !!this._options.border.defaultBorderSupplier
			? this._options.border.defaultBorderSupplier(row, column)
			: (!!this._options.border.defaultBorder ? this._options.border.defaultBorder : {});
	}

	/**
	 * Get borders for the given cell range.
	 * @param range to get borders for
	 */
	public getBorders(range: ICellRange): IBorder[][] {
		// Pre-allocate result matrix
		const rows: number = range.endRow - range.startRow + 1;
		const columns: number = range.endColumn - range.startColumn + 1;
		const result: IBorder[][] = new Array(rows);
		for (let i = 0; i < result.length; i++) {
			result[i] = new Array(columns);
		}

		// Fill matrix for cells in cell model first
		const cells: ICell[] = this._cellModel.getCells(range);
		for (const cell of cells) {
			const cellBorder: IBorder = this._getCellBorder(cell.range.startRow, cell.range.startColumn, true);

			// Fill with defaults (if not set)
			const defaultBorder: IBorder = this._getDefaultBorder(cell.range.startRow, cell.range.startColumn);
			const border: IBorder = {
				top: !!cellBorder.top ? cellBorder.top : defaultBorder.top,
				bottom: !!cellBorder.bottom ? cellBorder.bottom : defaultBorder.bottom,
				left: !!cellBorder.left ? cellBorder.left : defaultBorder.left,
				right: !!cellBorder.right ? cellBorder.right : defaultBorder.right
			};

			const startRow: number = Math.max(cell.range.startRow, range.startRow);
			const endRow: number = Math.min(cell.range.endRow, range.endRow);
			const startColumn: number = Math.max(cell.range.startColumn, range.startColumn)
			const endColumn: number = Math.min(cell.range.endColumn, range.endColumn);

			for (let row = startRow; row <= endRow; row++) {
				const rowOffset: number = row - range.startRow;

				for (let column = startColumn; column <= endColumn; column++) {
					const columnOffset: number = column - range.startColumn;

					// Fill empty border object
					const b: IBorder = {};
					result[rowOffset][columnOffset] = b;

					if (row === startRow) {
						// Fill border top
						b.top = border.top;

						// Check for border collision
						if (row > 0) {
							const upper: IBorder = this._getCellBorder(row - 1, column, false);
							if (!!upper && !!upper.bottom) {
								b.top = this._options.border.borderCollisionResolver(border.top, upper.bottom); // Resolve border collision
							}
						}
					}
					if (row === endRow) {
						// Fill border bottom
						b.bottom = border.bottom;

						// Check for border collision
						if (row < this._cellModel.getRowCount() - 1) {
							const lower: IBorder = this._getCellBorder(row + 1, column, false);
							if (!!lower && !!lower.top) {
								b.bottom = this._options.border.borderCollisionResolver(border.bottom, lower.top); // Resolve border collision
							}
						}
					}
					if (column === startColumn) {
						// Fill border left
						b.left = border.left;

						// Check for border collision
						if (row > 0) {
							const leftCell: IBorder = this._getCellBorder(row, column - 1, false);
							if (!!leftCell && !!leftCell.right) {
								b.left = this._options.border.borderCollisionResolver(border.left, leftCell.right); // Resolve border collision
							}
						}
					}
					if (column === endColumn) {
						// Fill border right
						b.right = border.right;

						// Check for border collision
						if (row < this._cellModel.getColumnCount() - 1) {
							const rightCell: IBorder = this._getCellBorder(row, column + 1, false);
							if (!!rightCell && !!rightCell.left) {
								b.right = this._options.border.borderCollisionResolver(border.right, rightCell.left); // Resolve border collision
							}
						}
					}
				}
			}
		}

		// Fill remaining cells in matrix with default border (if specified)
		for (let rowOffset = 0; rowOffset < result.length; rowOffset++) {
			const row: IBorder[] = result[rowOffset];

			for (let columnOffset = 0; columnOffset < row.length; columnOffset++) {
				let border: IBorder | null = row[columnOffset];
				if (!border) {
					// Fill with defaults
					const defaultBorder: IBorder = this._getDefaultBorder(range.startRow + rowOffset, range.startColumn + columnOffset);
					row[columnOffset] = {
						top: defaultBorder.top,
						bottom: defaultBorder.bottom,
						left: defaultBorder.left,
						right: defaultBorder.right
					};
				}
			}
		}

		return result;
	}

}
