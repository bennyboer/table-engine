import { IRectangle } from '../util';

/**
 * Representation of something that is displayed over the table
 * and not necessarily on a cell.
 * For example you might want to add charts, shapes that are not in any cells but
 * displayed over them.
 */
export interface IOverlay {
	/**
	 * HTML element of the overlay.
	 */
	element: HTMLElement;

	/**
	 * Bounds of the overlay.
	 */
	bounds: IRectangle;
}
