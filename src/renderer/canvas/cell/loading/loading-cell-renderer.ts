import { ICanvasCellRenderer } from '../canvas-cell-renderer';
import { ICell } from '../../../../cell';
import { IRectangle, ISize } from '../../../../util';
import { TableEngine } from '../../../../table-engine';
import { IRenderContext } from '../../canvas-renderer';
import { ICellRendererEventListener } from '../../../cell';

/**
 * Cell renderer for displaying a loading animation.
 */
export class LoadingCellRenderer implements ICanvasCellRenderer {
	/**
	 * Name of the cell renderer.
	 */
	public static readonly NAME: string = 'loading';

	/**
	 * Duration of one full animation in milliseconds.
	 */
	private static readonly DURATION_MS: number = 1500;

	/**
	 * Max width of the dummy rectangle.
	 */
	private static readonly MAX_WIDTH: number = 80;

	/**
	 * Max width of the dummy rectangle.
	 */
	private static readonly MAX_HEIGHT: number = 20;

	/**
	 * Vertical padding for the dummy rectangle.
	 */
	private static readonly VERTICAL_PADDING: number = 12;

	/**
	 * Horizontal padding for the dummy rectangle.
	 */
	private static readonly HORIZONTAL_PADDING: number = 30;

	/**
	 * The last animation timestamp.
	 */
	private _lastTimestamp: number | null = null;

	/**
	 * Current progress of the dummy animation.
	 */
	private _progress: number = 0.0;

	/**
	 * Transformed progress to use for the dummy animation.
	 */
	private _transformedProgress: number = 0.0;

	/**
	 * The canvas rendering context to use.
	 */
	private _ctx: CanvasRenderingContext2D;

	/**
	 * Context of the current rendering cycle.
	 */
	private _context: IRenderContext;

	/**
	 * Reference to the table-engine.
	 */
	private _engine: TableEngine;

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
		return LoadingCellRenderer.NAME;
	}

	/**
	 * Called before rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 * @param context of the current rendering cycle
	 */
	public before(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext
	): void {
		this._ctx = ctx;
		this._context = context;

		// Calculate animation progress
		const timestamp = window.performance.now();
		if (!!this._lastTimestamp) {
			const diff = timestamp - this._lastTimestamp;
			this._progress += diff / LoadingCellRenderer.DURATION_MS;
			if (this._progress > 1.0) {
				this._progress = 0.0;
			}

			this._transformedProgress = LoadingCellRenderer._easeInOut(
				this._progress
			);
		}
		this._lastTimestamp = timestamp;

		// Prepare fill style for all cells to render
		LoadingCellRenderer._prepareFillStyle(ctx, this._transformedProgress);
	}

	/**
	 * Called after rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 */
	public after(ctx: CanvasRenderingContext2D): void {
		// Request another repaint for the animation
		this._engine.repaint();
	}

	/**
	 * Get the event listeners on cells for this cell renderer.
	 */
	public getEventListener(): ICellRendererEventListener | null {
		return null;
	}

	/**
	 * Ease in out progress transformation.
	 * @param progress to transform
	 */
	private static _easeInOut(progress: number): number {
		return progress < 0.5
			? 4 * progress * progress * progress
			: (progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1;
	}

	/**
	 * Called when there are no cells that need to be rendered with the renderer in
	 * the current viewport.
	 */
	public cleanup(): void {
		// Nothing to cleanup
	}

	/**
	 * Prepare the fill style to fill all cells for this renderer with.
	 * @param ctx to apply style to
	 * @param progress to use
	 */
	private static _prepareFillStyle(
		ctx: CanvasRenderingContext2D,
		progress: number
	): void {
		const p = Math.abs(progress - 0.5);
		const colorVal: number = 170 + 60 * (1.0 - p);
		ctx.fillStyle = `rgb(${colorVal}, ${colorVal}, ${colorVal})`;
	}

	/**
	 * Render the given cell in the passed bounds.
	 * @param ctx context to render with
	 * @param cell to render
	 * @param bounds to render cell in
	 */
	public render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		const width: number = Math.max(
			Math.min(
				bounds.width - LoadingCellRenderer.HORIZONTAL_PADDING * 2,
				LoadingCellRenderer.MAX_WIDTH
			),
			2
		);
		const height: number = Math.max(
			Math.min(
				bounds.height - LoadingCellRenderer.VERTICAL_PADDING * 2,
				LoadingCellRenderer.MAX_HEIGHT
			),
			2
		);

		let rect: IRectangle = {
			top: bounds.top + (bounds.height - height) / 2,
			left: bounds.left + (bounds.width - width) / 2,
			width,
			height,
		};

		const value: ILoadingCellRendererValue =
			cell.value as ILoadingCellRendererValue;
		if (value.promiseSupplier !== undefined && !value.isLoading) {
			value.isLoading = true;

			// Start loading the value of the cell
			value.promiseSupplier().then((v) => {
				cell.rendererName = value.cellRenderer;
				cell.value = v;

				// Cause table repaint
				this._engine.repaint();
			});
		}

		ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
		ctx.fill();
	}

	/**
	 * Get the copy value of the passed cell rendered with this renderer.
	 * This may be a HTML representation of the value (for example for copying formatting, lists, ...).
	 */
	public getCopyValue(cell: ICell): string {
		return '';
	}

	/**
	 * Called when the passed cell is disappearing from the visible area (viewport).
	 * @param cell that is disappearing
	 */
	public onDisappearing(cell: ICell): void {
		// Do nothing
	}

	estimatePreferredSize(cell: ICell): ISize | null {
		return null; // Renderer does not have a preferred size
	}
}

/**
 * Value for the loading cell renderer.
 */
export interface ILoadingCellRendererValue {
	/**
	 * Supplier for the loading promise.
	 */
	promiseSupplier: () => Promise<any>;

	/**
	 * Whether the promise is already being loaded.
	 */
	isLoading?: boolean;

	/**
	 * Value to display when loaded.
	 */
	value?: any;

	/**
	 * Name of the cell renderer to display when loading finished.
	 */
	cellRenderer: string;
}
