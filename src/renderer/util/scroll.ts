/**
 * Utility methods regarding scrolling.
 */
export class ScrollUtil {

	/**
	 * Determine the amount to scroll from the given wheel event.
	 * @param canvasElement the canvas element to draw on
	 * @param event of the wheel
	 */
	public static determineScrollOffsetFromEvent(canvasElement: HTMLCanvasElement, event: WheelEvent): number {
		const scrollVertically: boolean = !event.shiftKey;

		switch (event.deltaMode) {
			case event.DOM_DELTA_PIXEL:
				return event.deltaY * window.devicePixelRatio;
			case event.DOM_DELTA_LINE: // Each deltaY means to scroll a line
				return event.deltaY * 25 * window.devicePixelRatio;
			case event.DOM_DELTA_PAGE: // Each deltaY means to scroll by a page (the tables height)
				return event.deltaY * (scrollVertically ? canvasElement.height : canvasElement.width);
			default:
				throw new Error(`WheelEvent deltaMode unsupported`);
		}
	}

}
