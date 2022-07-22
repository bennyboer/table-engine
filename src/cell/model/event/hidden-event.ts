import { ICellModelEvent } from './cell-model-change';
import { CellModelEventType } from './cell-model-event-type';

/**
 * Event when rows/columns have been hidden.
 */
export class HiddenEvent implements ICellModelEvent {
	public readonly type: CellModelEventType = CellModelEventType.HIDDEN;

	/**
	 * Indices of hidden/visible rows/columns.
	 */
	private readonly _indices: number[];

	/**
	 * Whether rows or columns have been hidden.
	 */
	private readonly _isRow: boolean;

	constructor(indices: number[], isRow: boolean) {
		this._indices = indices;
		this._isRow = isRow;
	}

	get indices(): number[] {
		return this._indices;
	}

	get isRow(): boolean {
		return this._isRow;
	}
}
