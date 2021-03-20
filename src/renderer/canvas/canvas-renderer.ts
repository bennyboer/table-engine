import {ITableEngineRenderer} from "../renderer";
import {ICellModel} from "../../cell/model/cell-model.interface";
import {IRendererOptions} from "../options";
import {asyncScheduler, Subject} from "rxjs";
import {takeUntil, throttleTime} from "rxjs/operators";
import {ScrollUtil} from "../util/scroll";
import {CanvasUtil} from "../util/canvas";
import {IRectangle} from "../../util/rect";
import {IScrollBarOptions} from "../options/scrollbar";
import {ICell} from "../../cell/cell";

/**
 * Table-engine renderer using the HTML5 canvas.
 */
export class CanvasRenderer implements ITableEngineRenderer {

	/**
	 * Container the renderer should operate on.
	 */
	private _container: HTMLElement;

	/**
	 * Cell model to render cells from.
	 */
	private _cellModel: ICellModel;

	/**
	 * Options of the renderer.
	 */
	private _options: IRendererOptions;

	/**
	 * HTML canvas element to render on.
	 */
	private _canvasElement: HTMLCanvasElement;

	/**
	 * Canvas 2D rendering context to use for rendering.
	 */
	private _canvasContext: CanvasRenderingContext2D;

	/**
	 * Subject that will fire when the renderer needs to be cleaned up.
	 */
	private _onCleanup: Subject<void> = new Subject<void>();

	/**
	 * Subject used to throttle scroll or other high-rate
	 * event that need to re-render the table.
	 */
	private _lazyRenderingSchedulerSubject: Subject<void> = new Subject<void>();

	/**
	 * Subject used to throttle resize events.
	 */
	private _resizeThrottleSubject: Subject<void> = new Subject<void>();

	/**
	 * Registered key down listener.
	 */
	private _keyDownListener: (KeyboardEvent) => void;

	/**
	 * Registered listener to the mouse wheel.
	 */
	private _wheelListener: (WheelEvent) => void;

	/**
	 * Resize observer observing size changes on the container HTML element.
	 */
	private _resizeObserver: ResizeObserver;

	/**
	 * Current scroll offset.
	 */
	private _scrollOffset: IScrollOffset = {
		x: 0,
		y: 0
	};

	/**
	 * ID of the currently requested animation frame or null.
	 */
	private _requestAnimationFrameID: number | null = null;

	/**
	 * Cleanup the renderer when no more needed.
	 */
	public cleanup(): void {
		this._lazyRenderingSchedulerSubject.complete();
		this._resizeThrottleSubject.complete();

		this._unbindListeners();

		this._onCleanup.next();
		this._onCleanup.complete();
	}

	/**
	 * Initialize the renderer with the given options on the passed HTML container.
	 * @param container to initialize renderer in
	 * @param cellModel to render cells from
	 * @param options of the renderer
	 */
	public async initialize(container: HTMLElement, cellModel: ICellModel, options: IRendererOptions): Promise<void> {
		this._container = container;
		this._cellModel = cellModel;
		this._options = options;

		this._initializeRenderingCanvasElement();

		this._bindListeners();
	}

	/**
	 * Bind listeners to the window or container.
	 */
	private _bindListeners(): void {
		// Listen for keyboard events
		this._keyDownListener = (event) => this._onKeyDown(event);
		this._canvasElement.addEventListener("keydown", this._keyDownListener);

		// Listen for mouse events
		this._wheelListener = (event) => this._onWheel(event);
		this._canvasElement.addEventListener("wheel", this._wheelListener, {
			passive: true
		});

		// Listen for size changes on the container HTML element
		this._resizeObserver = new ResizeObserver((resizeEntries) => this._onResize(resizeEntries));
		this._resizeObserver.observe(this._container);

		// Throttle resize events
		this._resizeThrottleSubject.asObservable().pipe(
			takeUntil(this._onCleanup),
			throttleTime(this._options.canvas.lazyRenderingThrottleDuration, asyncScheduler, {
				leading: false,
				trailing: true
			})
		).subscribe(() => this._resizeCanvasToCurrentContainerSize());

		// Repaint when necessary (for example on scrolling)
		this._lazyRenderingSchedulerSubject.asObservable().pipe(
			takeUntil(this._onCleanup),
			throttleTime(this._options.canvas.lazyRenderingThrottleDuration, asyncScheduler, {
				leading: false,
				trailing: true
			})
		).subscribe(() => this.render());
	}

	/**
	 * Unbind listeners to the window or container.
	 */
	private _unbindListeners(): void {
		if (!!this._keyDownListener) {
			this._canvasElement.removeEventListener("keydown", this._keyDownListener);
		}
		if (!!this._wheelListener) {
			this._canvasElement.removeEventListener("wheel", this._wheelListener);
		}
		if (!!this._resizeObserver) {
			this._resizeObserver.disconnect();
		}
	}

	/**
	 * Called on a resize event on the container HTML element.
	 * @param resizeEntries that describe the resize event
	 */
	private _onResize(resizeEntries: ResizeObserverEntry[]): void {
		this._resizeThrottleSubject.next();
	}

	/**
	 * Resize the current canvas to the current container HTML element size.
	 */
	private _resizeCanvasToCurrentContainerSize(): void {
		const newBounds: DOMRect = this._container.getBoundingClientRect();

		// Re-size scroll bar offsets as well
		const tableHeight: number = this._cellModel.getHeight();
		const tableWidth: number = this._cellModel.getWidth();
		const verticalScrollProgress = this._scrollOffset.y / (tableHeight - this._canvasElement.height);
		const horizontalScrollProgress = this._scrollOffset.x / (tableWidth - this._canvasElement.width);
		this._scrollOffset.y = verticalScrollProgress * (tableHeight - newBounds.height);
		this._scrollOffset.x = horizontalScrollProgress * (tableWidth - newBounds.width);

		// Set new size to canvas
		CanvasUtil.setCanvasSize(this._canvasElement, newBounds.width, newBounds.height);

		// Schedule a repaint
		this._lazyRenderingSchedulerSubject.next();
	}

	/**
	 * Called on key down on the container.
	 * @param event that occurred
	 */
	private _onKeyDown(event: KeyboardEvent): void {
		console.log("Key down event!");
	}

	/**
	 * Called when the mouse wheel has been turned.
	 * @param event that occurred
	 */
	private _onWheel(event: WheelEvent): void {
		const scrollVertically: boolean = !event.shiftKey;

		const scrollDelta: number = ScrollUtil.determineScrollOffsetFromEvent(this._canvasElement, event);

		if (scrollVertically) {
			this._scrollToY(this._scrollOffset.y + scrollDelta);
		} else {
			this._scrollToX(this._scrollOffset.x + scrollDelta);
		}

		this._lazyRenderingSchedulerSubject.next();
	}

	/**
	 * Scroll to the given horizontal (X) position.
	 * @param offset to scroll to
	 * @returns whether the offset is out of bounds and thus corrected to the max/min value
	 */
	private _scrollToX(offset: number): boolean {
		const maxOffset: number = this._cellModel.getWidth() - this._canvasElement.width;

		if (offset < 0) {
			this._scrollOffset.x = 0;
			return true;
		} else if (offset > maxOffset) {
			this._scrollOffset.x = maxOffset;
			return true;
		} else {
			this._scrollOffset.x = offset;
			return false;
		}
	}

	/**
	 * Scroll to the given vertical (Y) position.
	 * @param offset to scroll to
	 * @returns whether the offset is out of bounds and thus corrected to the max/min value
	 */
	private _scrollToY(offset: number): boolean {
		const maxOffset: number = this._cellModel.getHeight() - this._canvasElement.height;

		if (offset < 0) {
			this._scrollOffset.y = 0;
			return true;
		} else if (offset > maxOffset) {
			this._scrollOffset.y = maxOffset;
			return true;
		} else {
			this._scrollOffset.y = offset;
			return false;
		}
	}

	/**
	 * Initialize the rendering canvas element to use.
	 */
	private _initializeRenderingCanvasElement(): void {
		const bounds: DOMRect = this._container.getBoundingClientRect();

		// The container might have children -> clear them just to make sure
		while (this._container.hasChildNodes()) {
			this._container.removeChild(this._container.lastChild);
		}

		// Create HTML canvas element
		this._canvasElement = document.createElement("canvas");
		this._canvasContext = this._canvasElement.getContext("2d");

		// Set position absolute to prevent resize events to occur due to canvas element resizing
		this._canvasElement.style.position = "absolute";

		// Set proper size based on the container HTML element size
		CanvasUtil.setCanvasSize(this._canvasElement, bounds.width, bounds.height);

		// Make it focusable (needed for key listeners for example).
		this._canvasElement.setAttribute("tabindex", "-1");

		// Append it to the container
		this._container.appendChild(this._canvasElement);
	}

	/**
	 * Get the current viewport.
	 */
	private _getViewPort(): IRectangle {
		return {
			top: this._scrollOffset.y,
			left: this._scrollOffset.x,
			width: this._canvasElement.width,
			height: this._canvasElement.height
		};
	}

	/**
	 * Calculate the scroll bar rendering context.
	 */
	private _calculateScrollBarContext(): IScrollBarRenderContext {
		// Derive scroll bar options
		const scrollBarOptions: IScrollBarOptions = this._options.canvas.scrollBar;
		const scrollBarSize: number = scrollBarOptions.size * window.devicePixelRatio;
		const minScrollBarLength: number = scrollBarOptions.minLength * window.devicePixelRatio;
		const scrollBarOffset: number = scrollBarOptions.offset * window.devicePixelRatio;

		const tableHeight: number = this._cellModel.getHeight();
		const tableWidth: number = this._cellModel.getWidth();

		// Calculate vertical scrollbar layout
		const verticalScrollBarLength = Math.max(this._canvasElement.height / tableHeight * this._canvasElement.height, minScrollBarLength);
		const verticalScrollProgress = this._scrollOffset.y / (tableHeight - this._canvasElement.height);
		const verticalScrollBarX = this._canvasElement.width - scrollBarSize - scrollBarOffset;
		const verticalScrollBarY = (this._canvasElement.height - verticalScrollBarLength) * verticalScrollProgress;

		// Calculate horizontal scrollbar layout
		const horizontalScrollBarLength = Math.max(this._canvasElement.width / tableWidth * this._canvasElement.width, minScrollBarLength);
		const horizontalScrollProgress = this._scrollOffset.x / (tableWidth - this._canvasElement.width);
		const horizontalScrollBarY = this._canvasElement.height - scrollBarSize - scrollBarOffset;
		const horizontalScrollBarX = (this._canvasElement.width - horizontalScrollBarLength) * horizontalScrollProgress;

		return {
			color: this._options.canvas.scrollBar.color,
			cornerRadius: this._options.canvas.scrollBar.cornerRadius * window.devicePixelRatio,
			vertical: {
				size: scrollBarSize,
				length: verticalScrollBarLength,
				x: verticalScrollBarX,
				y: verticalScrollBarY
			},
			horizontal: {
				size: scrollBarSize,
				length: horizontalScrollBarLength,
				x: horizontalScrollBarX,
				y: horizontalScrollBarY
			}
		};
	}

	/**
	 * Create the rendering context for the current state.
	 */
	private _createRenderingContext(): IRenderContext {
		const viewPort: IRectangle = this._getViewPort();

		const cells = this._cellModel.getCellsForRect(viewPort);
		const cellBounds: IRectangle[] = new Array(cells.length);
		for (let i = 0; i < cells.length; i++) {
			const bounds = this._cellModel.getBounds(cells[i].range);

			// Correct bounds for current scroll offsets
			bounds.top -= this._scrollOffset.y;
			bounds.left -= this._scrollOffset.x;

			cellBounds[i] = bounds;
		}

		const scrollBarContext: IScrollBarRenderContext = this._calculateScrollBarContext();

		return {
			viewPort,
			cells,
			cellBounds,
			scrollBar: scrollBarContext
		}
	}

	/**
	 * (Re)-Render the table.
	 */
	public render(): void {
		let creatingRenderingContextTime = window.performance.now();
		const renderingContext: IRenderContext = this._createRenderingContext();
		creatingRenderingContextTime = window.performance.now() - creatingRenderingContextTime;

		if (!!this._requestAnimationFrameID) {
			// Already requested animation frame that has not been executed yet -> cancel it and reschedule one
			window.cancelAnimationFrame(this._requestAnimationFrameID);
		}

		this._requestAnimationFrameID = window.requestAnimationFrame(() => {
			this._requestAnimationFrameID = null; // Mark as executed

			const ctx: CanvasRenderingContext2D = this._canvasContext;

			let renderingTime = window.performance.now();

			// Clear canvas first
			// TODO: In the future we should only clear the area that we need to repaint!
			ctx.clearRect(0, 0, renderingContext.viewPort.width, renderingContext.viewPort.height);

			CanvasRenderer._renderCells(ctx, renderingContext);
			CanvasRenderer._renderBorders(ctx, renderingContext);
			CanvasRenderer._renderScrollBars(ctx, renderingContext);

			console.log(`RENDERING: ${window.performance.now() - renderingTime}ms, CREATING RENDERING CONTEXT: ${creatingRenderingContextTime}ms`);
		});
	}

	/**
	 * Render the table cells.
	 * @param ctx to render with
	 * @param context the rendering context
	 */
	private static _renderCells(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		for (let i = 0; i < context.cells.length; i++) {
			const cell: ICell = context.cells[i];
			const bounds: IRectangle = context.cellBounds[i];

			// TODO The following stuff should be in a cell renderer implementation instead of here
			ctx.font = "12px sans-serif";
			ctx.fillStyle = "#333333";
			ctx.textBaseline = "top";

			ctx.fillText(`${cell.value}`, bounds.left, bounds.top);
		}
	}

	/**
	 * Render the borders of the table.
	 * @param ctx to render with
	 * @param context the rendering context
	 */
	private static _renderBorders(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		// TODO This needs to be re-implemented once the border model is finished

		for (let i = 0; i < context.cells.length; i++) {
			const bounds: IRectangle = context.cellBounds[i];

			ctx.strokeStyle = "#EAEAEA";

			ctx.beginPath();

			// Draw only the bottom and right border for now until we have the border model
			ctx.moveTo(bounds.left, bounds.top + bounds.height);
			ctx.lineTo(bounds.left + bounds.width, bounds.top + bounds.height);
			ctx.lineTo(bounds.left + bounds.width, bounds.top);

			ctx.stroke();
		}
	}

	/**
	 * Render the scroll bars.
	 * @param ctx to render with
	 * @param context the rendering context
	 */
	private static _renderScrollBars(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		ctx.fillStyle = `rgba(${context.scrollBar.color[0]}, ${context.scrollBar.color[1]}, ${context.scrollBar.color[2]}, ${context.scrollBar.color[3]})`;

		// Draw vertical scrollbar
		CanvasUtil.makeRoundRectPath(ctx, {
			left: context.scrollBar.vertical.x,
			top: context.scrollBar.vertical.y,
			width: context.scrollBar.vertical.size,
			height: context.scrollBar.vertical.length
		}, context.scrollBar.cornerRadius);
		ctx.fill();

		// Draw horizontal scrollbar
		CanvasUtil.makeRoundRectPath(ctx, {
			left: context.scrollBar.horizontal.x,
			top: context.scrollBar.horizontal.y,
			width: context.scrollBar.horizontal.length,
			height: context.scrollBar.horizontal.size
		}, context.scrollBar.cornerRadius);
		ctx.fill();
	}

}

/**
 * Context filled with data used to render the table.
 */
interface IRenderContext {

	/**
	 * Viewport to render.
	 */
	viewPort: IRectangle;

	/**
	 * Cells to render.
	 */
	cells: ICell[];

	/**
	 * Bounds of the cells to render.
	 */
	cellBounds: IRectangle[];

	/**
	 * Rendering context of the scrollbars.
	 */
	scrollBar: IScrollBarRenderContext;

}

/**
 * Scroll bar rendering context.
 */
interface IScrollBarRenderContext {

	/**
	 * Color of the scroll bars.
	 * Format is four floats (RGBA).
	 */
	color: number[];

	/**
	 * Radius of the scroll bar rounded corners.
	 */
	cornerRadius: number;

	/**
	 * Vertical scrollbar rendering context.
	 */
	vertical: IScrollBarAxisRenderContext;

	/**
	 * Horizontal scrollbar rendering context.
	 */
	horizontal: IScrollBarAxisRenderContext;

}

/**
 * Rendering context for a scrollbar axis (horizontal or vertical).
 */
interface IScrollBarAxisRenderContext {

	/**
	 * Length of the scroll bar.
	 */
	length: number;

	/**
	 * Size of the bar.
	 * - vertical: width of the bar
	 * - horizontal: height of the bar
	 */
	size: number;

	/**
	 * Offset from left of the scrollbar.
	 */
	x: number;

	/**
	 * Offset from top of the scrollbar.
	 */
	y: number;

}

/**
 * Description of a scrollbar scroll offset.
 */
interface IScrollOffset {

	/**
	 * Current offset from left.
	 */
	x: number;

	/**
	 * Current offset from top.
	 */
	y: number;

}
