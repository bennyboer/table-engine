import {ICell} from "../../../cell/cell";
import {IPoint} from "../../../util/point";

/**
 * Event propagated to a cell renderer.
 */
export interface ICellRendererEvent {

	/**
	 * Cell the event occurs on.
	 */
	cell: ICell;

	/**
	 * Mouse offset within the bounds of the rectangle the event
	 * occurred on (if a mouse event).
	 */
	offset?: IPoint;

	/**
	 * Whether to prevent the default action of the table.
	 */
	preventDefault: boolean;

}
