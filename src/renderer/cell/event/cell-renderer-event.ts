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
	 * Whether to prevent the default action of the table.
	 */
	preventDefault: boolean;

}
