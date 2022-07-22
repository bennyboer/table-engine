import { ICellRenderer } from '../../cell';
import { IRenderContext } from '../canvas-renderer';

/**
 * Cell renderer for the HTML5 canvas renderer.
 */
export interface ICanvasCellRenderer
	extends ICellRenderer<CanvasRenderingContext2D> {
	/**
	 * Called before rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 * @param context of the current rendering cycle
	 */
	before(ctx: CanvasRenderingContext2D, context: IRenderContext): void;

	/**
	 * Called after rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 */
	after(ctx: CanvasRenderingContext2D): void;

	/**
	 * Called when there are no cells that need to be rendered with the renderer in
	 * the current viewport.
	 */
	cleanup(): void;
}
