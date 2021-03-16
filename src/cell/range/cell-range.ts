/**
 * Cell range representation.
 * This means a range of multiple cells in terms of rows and columns.
 */
export interface ICellRange {
	/**
	 * The start row (0-indexed) - inclusive!
	 */
	startRow: number;

	/**
	 * The end row (0-indexed) - inclusive!
	 */
	endRow: number;

	/**
	 * The start column (0-indexed) - inclusive!
	 */
	startColumn: number;

	/**
	 * The end column (0-indexed) - inclusive!
	 */
	endColumn: number;
}

/**
 * Concrete cell range implementation.
 */
export class CellRange implements ICellRange {
	/**
	 * End column of the range (inclusive).
	 */
	private _endColumn: number;

	/**
	 * End row of the range (inclusive).
	 */
	private _endRow: number;

	/**
	 * Start column in the range (inclusive).
	 */
	private _startColumn: number;

	/**
	 * Start row in the range (inclusive).
	 */
	private _startRow: number;

	constructor(range: ICellRange) {
		this._startRow = range.startRow;
		this._endRow = range.endRow;
		this._startColumn = range.startColumn;
		this._endColumn = range.endColumn;
	}

	/**
	 * Create a cell range spanning over a single row and column.
	 * @param row to span over
	 * @param column to span over
	 */
	public static fromSingleRowColumn(row: number, column: number): CellRange {
		return new CellRange({
			startRow: row,
			endRow: row,
			startColumn: column,
			endColumn: column
		});
	}

	get endColumn(): number {
		return this._endColumn;
	}

	set endColumn(value: number) {
		this._endColumn = value;
	}

	get endRow(): number {
		return this._endRow;
	}

	set endRow(value: number) {
		this._endRow = value;
	}

	get startColumn(): number {
		return this._startColumn;
	}

	set startColumn(value: number) {
		this._startColumn = value;
	}

	get startRow(): number {
		return this._startRow;
	}

	set startRow(value: number) {
		this._startRow = value;
	}
}
