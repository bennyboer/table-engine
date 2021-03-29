import {ICellRendererEvent} from "./cell-renderer-event";

/**
 * Event listeners on a cell renderer.
 */
export interface ICellRendererEventListener {

	/**
	 * On mouse down event listener.
	 * @param event that occurred
	 */
	onMouseDown?: (event: ICellRendererEvent) => void;

	/**
	 * On mouse move event listener.
	 * @param event that occurred
	 */
	onMouseMove?: (event: ICellRendererEvent) => void;

	/**
	 * Called when the mouse leaves a cell.
	 * @param event that occurred
	 */
	onMouseOut?: (event: ICellRendererEvent) => void;

	/**
	 * On mouse up event listener.
	 * @param event that occurred
	 */
	onMouseUp?: (event: ICellRendererEvent) => void;

	/**
	 * On key down event listener.
	 * @param event that occurred
	 */
	onKeyDown?: (event: ICellRendererEvent) => void;

}
