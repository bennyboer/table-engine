import {ICellRenderer} from "../../cell/cell-renderer";

/**
 * Cell renderer for the HTML5 canvas renderer.
 */
export interface ICanvasCellRenderer extends ICellRenderer<CanvasRenderingContext2D> {

	/**
	 * Called before rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 */
	before(ctx: CanvasRenderingContext2D): void;

	/**
	 * Called after rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 */
	after(ctx: CanvasRenderingContext2D): void;

}
