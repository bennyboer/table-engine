import { IRectangle } from '../../../../util';
import { ICell } from '../../../../cell';
import { IOverlay } from '../../../../overlay';
import { AbstractCanvasCellRenderer } from '../abstract-canvas-cell-renderer';

/**
 * Cell renderer for rendering HTML/DOM inside a cell.
 */
export class DOMCellRenderer extends AbstractCanvasCellRenderer<
	string | HTMLElement,
	any,
	IDOMCellRendererViewportCache
> {
	static readonly NAME: string = 'dom';

	constructor() {
		super(DOMCellRenderer.NAME, {});
	}

	getCopyValue(cell: ICell): string {
		const cache: IDOMCellRendererViewportCache = this.cache(cell);
		return !!cache.overlay ? cache.overlay.element.innerHTML : '';
	}

	onDisappearing(cell: ICell): void {
		// Remove DOM element (overlay) again
		const cache: IDOMCellRendererViewportCache = this.cache(cell);
		if (!!cache.overlay) {
			this.engine.getOverlayManager().removeOverlay(cache.overlay);
		}
	}

	getDefaultViewportCache(): IDOMCellRendererViewportCache {
		return {};
	}

	getOptionsFromCell(cell: ICell): any {
		return {};
	}

	mergeOptions(defaultOptions: any, cellOptions: any): any {
		return defaultOptions;
	}

	render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		// Render nothing on the canvas, instead use an overlay to display the DOM element
		const cache: IDOMCellRendererViewportCache = this.cache(cell);
		if (!cache.overlay) {
			// Create overlay
			let domElement: HTMLElement;
			if (cell.value instanceof HTMLElement) {
				domElement = cell.value as HTMLElement;
			} else {
				domElement = document.createElement('div');
				domElement.innerHTML = `${cell.value}`;
			}

			const overlay: IOverlay = {
				element: domElement,
				bounds: this.engine.getCellModel().getBounds(cell.range),
			};
			this.engine.getOverlayManager().addOverlay(overlay);

			// Save overlay for later in the viewport cache
			cache.overlay = overlay;
		} else {
			// Check whether cell dimensions changed -> Overlay update is needed
			const oldBounds: IRectangle = cache.overlay.bounds;
			const newBounds: IRectangle = this.engine
				.getCellModel()
				.getBounds(cell.range);

			const boundsChanged: boolean =
				newBounds.left !== oldBounds.left ||
				newBounds.top !== oldBounds.top ||
				newBounds.width !== oldBounds.width ||
				newBounds.height !== oldBounds.height;
			if (boundsChanged) {
				cache.overlay.bounds = newBounds;
				this.engine.getOverlayManager().updateOverlay(cache.overlay);
			}
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
