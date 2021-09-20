import {ICellRendererEvent} from "./cell-renderer-event";

/**
 * Keyboard event passed to a cell renderer.
 */
export interface ICellRendererKeyboardEvent extends ICellRendererEvent {

	/**
	 * Original keyboard event that led to this event.
	 */
	originalEvent: KeyboardEvent;

}
