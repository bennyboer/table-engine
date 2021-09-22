import {ICanvasCellRenderer} from "../canvas-cell-renderer";
import {IRectangle} from "../../../../util/rect";
import {ICell} from "../../../../cell/cell";
import {TableEngine} from "../../../../table-engine";
import {ICellRendererEventListener} from "../../../cell/event/cell-renderer-event-listener";
import {IRenderContext} from "../../canvas-renderer";
import {IOverlay} from "../../../../overlay/overlay";

/**
 * Cell renderer for rendering HTML/DOM inside a cell.
 */
export class DOMCellRenderer implements ICanvasCellRenderer {

	/**
	 * Name of the cell renderer.
	 */
	public static readonly NAME: string = "dom";

	/**
	 * Reference to the table engine.
	 */
	private _engine: TableEngine;

	public after(ctx: CanvasRenderingContext2D): void {
		// Nothing to do after rendering cells with this renderer
	}

	public before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		// Nothing to do before rendering cells with this renderer
	}

	public cleanup(): void {
		// Nothing to cleanup
	}

	public getCopyValue(cell: ICell): string {
		const cache: IDOMCellRendererViewportCache = DOMCellRenderer._cache(cell);

		return !!cache.overlay ? cache.overlay.element.innerHTML : "";
	}

	public getEventListener(): ICellRendererEventListener | null {
		return null;
	}

	public getName(): string {
		return DOMCellRenderer.NAME;
	}

	public initialize(engine: TableEngine): void {
		this._engine = engine;
	}

	public onDisappearing(cell: ICell): void {
		// Remove DOM element (overlay) again
		const cache: IDOMCellRendererViewportCache = DOMCellRenderer._cache(cell);
		if (!!cache.overlay) {
			this._engine.getOverlayManager().removeOverlay(cache.overlay);
		}
	}

	public render(ctx: CanvasRenderingContext2D, cell: ICell, bounds: IRectangle): void {
		// Render nothing on the canvas, instead use an overlay to display the DOM element
		const cache: IDOMCellRendererViewportCache = DOMCellRenderer._cache(cell);
		if (!cache.overlay) {
			// Create overlay
			let domElement: HTMLElement;
			if (cell.value instanceof HTMLElement) {
				domElement = cell.value as HTMLElement;
			} else {
				domElement = document.createElement("div");
				domElement.innerHTML = `${cell.value}`;
			}

			const overlay: IOverlay = {
				element: domElement,
				bounds: this._engine.getCellModel().getBounds(cell.range)
			};
			this._engine.getOverlayManager().addOverlay(overlay);

			// Save overlay for later in the viewport cache
			cache.overlay = overlay;
		} else {
			// Check whether cell dimensions changed -> Overlay update is needed
			const oldBounds: IRectangle = cache.overlay.bounds;
			const newBounds: IRectangle = this._engine.getCellModel().getBounds(cell.range);

			const boundsChanged: boolean = newBounds.left !== oldBounds.left
				|| newBounds.top !== oldBounds.top
				|| newBounds.width !== oldBounds.width
				|| newBounds.height !== oldBounds.height;
			if (boundsChanged) {
				cache.overlay.bounds = newBounds;
				this._engine.getOverlayManager().updateOverlay(cache.overlay);
			}
		}
	}

	/**
	 * Get the cache for the given cell.
	 * @param cell to get cache for
	 */
	private static _cache(cell: ICell): IDOMCellRendererViewportCache {
		if (!!cell.viewportCache) {
			return cell.viewportCache as IDOMCellRendererViewportCache;
		} else {
			const cache: IDOMCellRendererViewportCache = {};
			cell.viewportCache = cache;

			return cache;
		}
	}

}

/**
 * Viewport cache of the DOM cell renderer.
 */
interface IDOMCellRendererViewportCache {

	/**
	 * The overlay showing the DOM element for a cell.
	 */
	overlay?: IOverlay;

}
