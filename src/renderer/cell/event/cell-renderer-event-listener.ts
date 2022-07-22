import { ICellRendererKeyboardEvent } from './cell-renderer-keyboard-event';
import { ICellRendererMouseEvent } from './cell-renderer-mouse-event';
import { ICellRendererFocusEvent } from './cell-renderer-focus-event';

/**
 * Event listeners on a cell renderer.
 */
export interface ICellRendererEventListener {
	/**
	 * On mouse down event listener.
	 * @param event that occurred
	 */
	onMouseDown?: (event: ICellRendererMouseEvent) => void;

	/**
	 * On mouse move event listener.
	 * @param event that occurred
	 */
	onMouseMove?: (event: ICellRendererMouseEvent) => void;

	/**
	 * Called when the mouse leaves a cell.
	 * @param event that occurred
	 */
	onMouseOut?: (event: ICellRendererMouseEvent) => void;

	/**
	 * On mouse up event listener.
	 * @param event that occurred
	 */
	onMouseUp?: (event: ICellRendererMouseEvent) => void;

	/**
	 * On key down event listener.
	 * @param event that occurred
	 */
	onKeyDown?: (event: ICellRendererKeyboardEvent) => void;

	/**
	 * On key up event listener.
	 * @param event that occurred
	 */
	onKeyUp?: (event: ICellRendererKeyboardEvent) => void;

	/**
	 * On focus event listener (cell gained focus).
	 * @param event that occurred
	 */
	onFocus?: (event: ICellRendererFocusEvent) => void;

	/**
	 * On blur event listener (cell lost focus).
	 * @param event that occurred
	 */
	onBlur?: (event: ICellRendererFocusEvent) => void;
}
