/**
 * Basic cell renderer rendering every value as string.
 */
import {ICanvasCellRenderer} from "../../../../src/renderer/canvas/cell/canvas-cell-renderer";
import {ICell} from "../../../../src/cell/cell";
import {TableEngine} from "../../../../src/table-engine";
import {ICellRendererEventListener} from "../../../../src/renderer/cell/event/cell-renderer-event-listener";
import {ICellRendererEvent} from "../../../../src/renderer/cell/event/cell-renderer-event";
import {IOverlay} from "../../../../src/overlay/overlay";
import {IRenderContext} from "../../../../src/renderer/canvas/canvas-renderer";
import {IRectangle} from "../../../../src/util/rect";


export class EditableTextCellRenderer implements ICanvasCellRenderer {

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
	 * Reference to the table engine.
	 */
	private _engine: TableEngine;

	/**
	 * Event listeners on cells rendered with this cell renderer.
	 */
	private _eventListener: ICellRendererEventListener = {
		onMouseUp: (event) => {
			const currentTimestamp: number = window.performance.now();
			if (!!this._lastCellMouseUp && this._lastCellMouseUp === event.cell) {
				// Check if is double click
				const diff: number = currentTimestamp - this._lastMouseUpTimestamp;
				if (diff <= EditableTextCellRenderer.MAX_DOUBLE_CLICK_DURATION) {
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
		// Create editor overlay
		const editorOverlayElement: HTMLElement = document.createElement("div");
		const editor: HTMLInputElement = document.createElement("input");
		editor.style.width = "100%";
		editor.style.height = "100%";
		editor.style.boxSizing = "border-box";
		editor.value = event.cell.value;

		editorOverlayElement.appendChild(editor);

		const overlay: IOverlay = {
			element: editorOverlayElement,
			bounds: this._engine.getCellModel().getBounds(event.cell.range)
		};
		this._engine.getOverlayManager().addOverlay(overlay);

		// Add editor event listeners
		const keyDownListener: (KeyboardEvent) => void = (e: KeyboardEvent) => {
			e.stopPropagation(); // Do not give control to the table

			if (e.code === "Enter") {
				blurListener();
			}
		};
		editor.addEventListener("keydown", keyDownListener);

		const blurListener: () => void = () => {
			// Remove all event listeners again
			editor.removeEventListener("blur", blurListener);
			editor.removeEventListener("keydown", keyDownListener);

			// Save changes
			event.cell.value = editor.value;

			// Remove overlay
			this._engine.getOverlayManager().removeOverlay(overlay);

			// Re-focus table
			this._engine.requestFocus();
		};
		editor.addEventListener("blur", blurListener);

		setTimeout(() => {
			editor.focus();
		});
	}

	/**
	 * Initialize the cell renderer.
	 * This is only called once.
	 * @param engine reference to the table-engine
	 */
	public initialize(engine: TableEngine): void {
		this._engine = engine;
	}

	/**
	 * Get the name of the cell renderer.
	 * This must be unique.
	 */
	public getName(): string {
		return "editable-text";
	}

	/**
	 * Called before rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 * @param context of the current rendering cycle
	 */
	public before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
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
