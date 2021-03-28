import {ICanvasCellRenderer} from "../canvas-cell-renderer";
import {ICell} from "../../../../cell/cell";
import {IRectangle} from "../../../../util/rect";
import {TableEngine} from "../../../../table-engine";
import {IRenderContext} from "../../canvas-renderer";

/**
 * Cell renderer for displaying a loading animation.
 */
export class LoadingCellRenderer implements ICanvasCellRenderer {

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
	 * Cells to animate the loading animation in.
	 */
	private _cellsToAnimate: Map<ICell, ICellInfo> = new Map<ICell, ICellInfo>();

	/**
	 * Currently requested animation frame ID.
	 */
	private _animationFrameID: number | null = null;

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
	 * Whether the rendering is due to the animation.
	 */
	private _isAnimationRender: boolean = false;

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
		return "loading";
	}

	/**
	 * Called before rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 * @param context of the current rendering cycle
	 */
	public before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		this._ctx = ctx;
		this._context = context;

		this._stopAnimation();

		// Prepare fill style for all cells to render
		LoadingCellRenderer._prepareFillStyle(ctx, this._transformedProgress);
	}

	/**
	 * Called after rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 */
	public after(ctx: CanvasRenderingContext2D): void {
		// Start animating
		this._animationFrameID = window.requestAnimationFrame((timestamp) => this._nextAnimationStep(timestamp));
	}

	/**
	 * Stop the animation (if currently running).
	 */
	private _stopAnimation(): void {
		if (this._animationFrameID !== null) {
			window.cancelAnimationFrame(this._animationFrameID);
			this._animationFrameID = null;
		}
		this._cellsToAnimate.clear();
	}

	/**
	 * Ease in out progress transformation.
	 * @param progress to transform
	 */
	private static _easeInOut(progress: number): number {
		return progress < 0.5
			? (4 * progress * progress * progress)
			: ((progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1);
	}

	/**
	 * Called when there are no cells that need to be rendered with the renderer in
	 * the current viewport.
	 */
	public cleanup(): void {
		this._stopAnimation();
	}

	/**
	 * Execute the next animation step.
	 * @param timestamp current timestamp
	 */
	private _nextAnimationStep(timestamp: number): void {
		if (this._lastTimestamp !== null) {
			// Calculate progress
			const diff = timestamp - this._lastTimestamp;
			this._progress += diff / LoadingCellRenderer.DURATION_MS;
			if (this._progress > 1.0) {
				this._progress = 0.0;
			}

			// Repaint cells
			this._isAnimationRender = true;
			this._transformedProgress = LoadingCellRenderer._easeInOut(this._progress);

			// Prepare current animation fill color once for all cells to render
			LoadingCellRenderer._prepareFillStyle(this._ctx, this._transformedProgress);

			for (const info of this._cellsToAnimate.values()) {
				this.render(this._ctx, info.cell, info.bounds);
			}
			this._isAnimationRender = false;
		}

		this._lastTimestamp = timestamp;

		// Schedule next animation frame
		this._animationFrameID = window.requestAnimationFrame((timestamp) => this._nextAnimationStep(timestamp));
	}

	/**
	 * Prepare the fill style to fill all cells for this renderer with.
	 * @param ctx to apply style to
	 * @param progress to use
	 */
	private static _prepareFillStyle(ctx: CanvasRenderingContext2D, progress: number): void {
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
	public render(ctx: CanvasRenderingContext2D, cell: ICell, bounds: IRectangle): void {
		let rect: IRectangle;
		if (!this._isAnimationRender) {
			const width: number = Math.max(Math.min(bounds.width - LoadingCellRenderer.HORIZONTAL_PADDING * 2, LoadingCellRenderer.MAX_WIDTH), 2);
			const height: number = Math.max(Math.min(bounds.height - LoadingCellRenderer.VERTICAL_PADDING * 2, LoadingCellRenderer.MAX_HEIGHT), 2);

			rect = {
				top: bounds.top + (bounds.height - height) / 2,
				left: bounds.left + (bounds.width - width) / 2,
				width,
				height,
			};

			this._cellsToAnimate.set(cell, {
				cell,
				bounds: rect
			});

			const value: ILoadingCellRendererValue = cell.value as ILoadingCellRendererValue;
			if (value.promiseSupplier !== undefined && !value.isLoading) {
				value.isLoading = true;

				// Start loading the value of the cell
				value.promiseSupplier().then((v) => {
					this._cellsToAnimate.delete(cell);

					cell.rendererName = value.cellRenderer;
					cell.value = v;

					// Cause table repaint
					this._engine.repaint();
				});
			}
		} else {
			rect = bounds;
		}

		ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
		ctx.fill();
	}

}

/**
 * Info about a cell to render.
 */
interface ICellInfo {

	/**
	 * Cell to render.
	 */
	cell: ICell;

	/**
	 * The cells bounds.
	 */
	bounds: IRectangle;

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
