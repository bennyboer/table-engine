/**
 * Utility methods regarding scrolling.
 */
export class ScrollUtil {

	/**
	 * Determine the amount to scroll from the given wheel event.
	 * @param canvasElement the canvas element to draw on
	 * @param vertical whether to determine the vertical or horizontal scroll offset
	 * @param event of the wheel
	 */
	public static determineScrollOffsetFromEvent(canvasElement: HTMLCanvasElement, vertical: boolean, event: WheelEvent): number {
		const scrollVertically: boolean = !event.shiftKey;
		const delta: number = vertical ? event.deltaY : event.deltaX;

		switch (event.deltaMode) {
			case event.DOM_DELTA_PIXEL:
				return delta * window.devicePixelRatio;
			case event.DOM_DELTA_LINE: // Each deltaY means to scroll a line
				return delta * 25 * window.devicePixelRatio;
			case event.DOM_DELTA_PAGE: // Each deltaY means to scroll by a page (the tables height)
				return delta * (scrollVertically ? canvasElement.height : canvasElement.width);
			default:
				throw new Error(`WheelEvent deltaMode unsupported`);
		}
	}

}
