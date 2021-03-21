import {IRectangle} from "../../util/rect";
import {IColor} from "../../util/color";

/**
 * Utility methods regarding HTML5 canvas.
 */
export class CanvasUtil {

	/**
	 * Set the given width and height to the passed canvas HTML element.
	 * @param element the canvas element to set the size to
	 * @param width new width of the element to set
	 * @param height new height of the element to set
	 * @param devicePixelRatio to use (optional) if not specified the browser default is used
	 */
	public static setCanvasSize(element: HTMLCanvasElement, width: number, height: number, devicePixelRatio?: number): void {
		/*
		We honor window.devicePixelRatio here to support high-DPI screens.
		To support High-DPI screens we will set the canvas element size twice:
			1. As style: width and height will be the same as in the container element bounds
			2. As attributes to the HTML canvas element: width and height need to be multiplied by
			   window.devicePixelRatio (for example 2.0 for most SmartPhones and 4K screens).

		If we don't do this the table will be rendered blurry on High-DPI screens/devices.
		 */

		if (devicePixelRatio === undefined || devicePixelRatio === null) {
			devicePixelRatio = window.devicePixelRatio;
		}

		element.width = width * devicePixelRatio;
		element.height = height * devicePixelRatio;

		element.style.width = `${width}px`;
		element.style.height = `${height}px`;
	}

	/**
	 * Apply a closed path of a round rectangle on the given 2d rendering context.
	 * @param ctx to draw with
	 * @param rect to draw
	 * @param radius of the corners
	 */
	public static makeRoundRectPath(ctx: CanvasRenderingContext2D, rect: IRectangle, radius: number): void {
		ctx.beginPath();

		// Start with top side (without corners)
		ctx.moveTo(rect.left + radius, rect.top);
		ctx.lineTo(rect.left + rect.width - radius, rect.top);

		// Make top-right corner
		ctx.quadraticCurveTo(rect.left + rect.width, rect.top, rect.left + rect.width, rect.top + radius);

		// Make right side (without corners)
		ctx.lineTo(rect.left + rect.width, rect.top + rect.height - radius);

		// Make bottom-right corner
		ctx.quadraticCurveTo(rect.left + rect.width, rect.top + rect.height, rect.left + rect.width - radius, rect.top + rect.height);

		// Make bottom side (without corners)
		ctx.lineTo(rect.left + radius, rect.top + rect.height);

		// Make bottom-left corner
		ctx.quadraticCurveTo(rect.left, rect.top + rect.height, rect.left, rect.top + rect.height - radius);

		// Make left side (without corners)
		ctx.lineTo(rect.left, rect.top + radius);

		// Make top-left corner
		ctx.quadraticCurveTo(rect.left, rect.top, rect.left + radius, rect.top);

		ctx.closePath();
	}

	/**
	 * Convert the passed color for a fill or stroke style for the HTML5 canvas.
	 * @param color to convert
	 */
	public static colorToStyle(color: IColor): string {
		return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha})`;
	}

}
