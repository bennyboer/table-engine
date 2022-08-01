import { IPoint } from '../../../util';

/**
 * A viewport scroller is a component that provides scrolling logic
 * for a viewport.
 */
export interface IViewportScroller {
	/**
	 * Get the current scroll position/offset.
	 */
	getScrollOffset(): IPoint;

	/**
	 * Scroll to a specific row and column.
	 * @param row to scroll to
	 * @param column to scroll to
	 * @returns whether the scroll position changed
	 */
	scrollTo(row: number, column: number): boolean;

	/**
	 * Scroll to a specific offset.
	 * @param x offset
	 * @param y offset
	 * @returns whether the scroll position changed
	 */
	scrollToOffset(x: number, y: number): boolean;
}
