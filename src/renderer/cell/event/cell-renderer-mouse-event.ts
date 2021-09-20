import {ICellRendererEvent} from "./cell-renderer-event";
import {IPoint} from "../../../util/point";

/**
 * Mouse event passed to a cell renderer.
 */
export interface ICellRendererMouseEvent extends ICellRendererEvent {

	/**
	 * Mouse offset within the bounds of the rectangle the event
	 * occurred on (set for every mouse event except mouse out).
	 */
	offset?: IPoint;

	/**
	 * Original mouse event.
	 */
	originalEvent: MouseEvent;

}
