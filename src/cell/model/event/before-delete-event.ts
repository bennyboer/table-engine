import { ICellModelEvent } from './cell-model-change';
import { CellModelEventType } from './cell-model-event-type';

/**
 * Deletion change in the cell model.
 * Rows or columns have been deleted.
 */
export class BeforeDeleteEvent implements ICellModelEvent {
	public readonly type: CellModelEventType = CellModelEventType.BEFORE_DELETE;

	/**
	 * Start index or to be deleted rows or columns.
	 */
	private readonly _startIndex: number;

	/**
	 * Count of rows or columns to be deleted.
	 */
	private readonly _count: number;

	/**
	 * Whether rows or columns are to be deleted.
	 */
	private readonly _isRow: boolean;

	constructor(startIndex: number, count: number, isRow: boolean) {
		this._startIndex = startIndex;
		this._count = count;
		this._isRow = isRow;
	}

	get startIndex(): number {
		return this._startIndex;
	}

	get count(): number {
		return this._count;
	}

	get isRow(): boolean {
		return this._isRow;
	}
}
