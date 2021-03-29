import {ICanvasCellRenderer} from "../canvas-cell-renderer";
import {ICell} from "../../../../cell/cell";
import {IRectangle} from "../../../../util/rect";
import {ICellModel} from "../../../../cell/model/cell-model.interface";
import {ISelectionModel} from "../../../../selection/model/selection-model.interface";
import {TableEngine} from "../../../../table-engine";
import {IRenderContext} from "../../canvas-renderer";
import {ICellRendererEventListener} from "../../../cell/event/cell-renderer-event-listener";
import {ICellRendererEvent} from "../../../cell/event/cell-renderer-event";

/**
 * Basic cell renderer rendering every value as string.
 */
export class BaseCellRenderer implements ICanvasCellRenderer {

	/**
	 * Max duration of two mouse up events to be detected as double click (in milliseconds).
	 */
	private static readonly MAX_DOUBLE_CLICK_DURATION: number = 300;

	/**
	 * Cell of the last mouse up.
	 */
	private _lastCellMouseUp: ICell | null = null;

	/**
	 * Timestamp of the last mouse up event.
	 */
	private _lastMouseUpTimestamp: number;

	/**
	 * Event listeners on cells rendered with this cell renderer.
	 */
	private _eventListener: ICellRendererEventListener = {
		onMouseUp: (event) => {
			const currentTimestamp: number = window.performance.now();
			if (!!this._lastCellMouseUp && this._lastCellMouseUp === event.cell) {
				// Check if is double click
				const diff: number = currentTimestamp - this._lastMouseUpTimestamp;
				if (diff <= BaseCellRenderer.MAX_DOUBLE_CLICK_DURATION) {
					this._onDoubleClick(event);
				}
			}

			this._lastCellMouseUp = event.cell;
			this._lastMouseUpTimestamp = currentTimestamp;
		}
	};

	/**
	 * Called on a double click on the cell.
	 * @param event that occurred
	 */
	private _onDoubleClick(event: ICellRendererEvent): void {
		console.log("Double click!");

		// TODO Try to edit cell
	}

	/**
	 * Initialize the cell renderer.
	 * This is only called once.
	 * @param engine reference to the table-engine
	 */
	public initialize(engine: TableEngine): void {
		// Nothing to do
	}

	/**
	 * Get the name of the cell renderer.
	 * This must be unique.
	 */
	public getName(): string {
		return "base";
	}

	/**
	 * Called before rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 * @param context of the current rendering cycle
	 */
	public before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		// TODO Make those things customizable (Renderer options?)
		ctx.font = "12px sans-serif";
		ctx.fillStyle = "#333333";
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
	}

	/**
	 * Called after rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 */
	public after(ctx: CanvasRenderingContext2D): void {
		// Nothing to do
	}

	/**
	 * Called when there are no cells that need to be rendered with the renderer in
	 * the current viewport.
	 */
	public cleanup(): void {
		// Nothing to cleanup
	}

	/**
	 * Get the event listeners on cells for this cell renderer.
	 */
	public getEventListener(): ICellRendererEventListener | null {
		return this._eventListener;
	}

	/**
	 * Render the given cell in the passed bounds.
	 * @param ctx context to render with
	 * @param cell to render
	 * @param bounds to render cell in
	 */
	public render(ctx: CanvasRenderingContext2D, cell: ICell, bounds: IRectangle): void {
		if (cell.value !== null) {
			const value = `${cell.value}`;
			const metrics = ctx.measureText(value);

			let clip: boolean = metrics.width > bounds.width;
			if (clip) {
				const clippingRegion = new Path2D();
				clippingRegion.rect(bounds.left, bounds.top, bounds.width, bounds.height);

				ctx.save();
				ctx.clip(clippingRegion);
			}

			ctx.fillText(value, Math.round(bounds.left + bounds.width / 2), Math.round(bounds.top + bounds.height / 2));

			if (clip) {
				ctx.restore();
			}
		}
	}

}
