import { ICell } from '../../../cell';

/**
 * Event propagated to a cell renderer.
 */
export interface ICellRendererEvent {
	/**
	 * Cell the event occurs on.
	 */
	cell: ICell;

	/**
	 * Whether to prevent the default action of the table.
	 */
	preventDefault: boolean;
}
