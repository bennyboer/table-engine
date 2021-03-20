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
import {ICellRenderer} from "../cell/cell-renderer";
import {ICanvasCellRenderer} from "./cell/canvas-cell-renderer";
import {BaseCellRenderer} from "./cell/base/base-cell-renderer";

/**
 * Table-engine renderer using the HTML5 canvas.
 */
export class CanvasRenderer implements ITableEngineRenderer {

	/**
	 * Lookup for cell renderers by their name.
	 */
	private readonly _cellRendererLookup: Map<string, ICanvasCellRenderer> = new Map<string, ICanvasCellRenderer>();

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
	 * Registered listener to mouse down events.
	 */
	private _mouseDownListener: (MouseEvent) => void;

	/**
	 * Registered listener to mouse move events.
	 */
	private _mouseMoveListener: (MouseEvent) => void;

	/**
	 * Registered listener to mouse up events.
	 */
	private _mouseUpListener: (MouseEvent) => void;

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
	 * The last rendering context.
	 */
	private _lastRenderingContext: IRenderContext;

	/**
	 * Context of the current mouse scroll dragging.
	 */
	private _mouseScrollDragStart: IMouseScrollDragContext | null = null;

	constructor() {
		this._registerDefaultCellRenderers();
	}

	/**
	 * Register the HTML5 canvas default cell renderers.
	 */
	private _registerDefaultCellRenderers(): void {
		this.registerCellRenderer(new BaseCellRenderer());
	}

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

		this._mouseDownListener = (event) => this._onMouseDown(event);
		this._canvasElement.addEventListener("mousedown", this._mouseDownListener);

		this._mouseMoveListener = (event) => this._onMouseMove(event);
		window.addEventListener("mousemove", this._mouseMoveListener);

		this._mouseUpListener = (event) => this._onMouseUp(event);
		window.addEventListener("mouseup", this._mouseUpListener);

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
		if (!!this._mouseDownListener) {
			this._canvasElement.removeEventListener("mousedown", this._mouseDownListener);
		}
		if (!!this._mouseMoveListener) {
			window.removeEventListener("mousemove", this._mouseMoveListener);
		}
		if (!!this._mouseUpListener) {
			window.removeEventListener("mouseup", this._mouseUpListener);
		}
		if (!!this._resizeObserver) {
			this._resizeObserver.disconnect();
		}
	}

	/**
	 * Called when a mouse down event on the canvas has been registered.
	 * @param event that occurred
	 */
	private _onMouseDown(event: MouseEvent): void {
		if (!!this._lastRenderingContext) {
			const [x, y] = this._getMouseOffset(event);

			// Check if mouse if over a scroll bar
			const isOverVerticalScrollBar: boolean = CanvasRenderer._isMouseOverScrollBar(x, y, true, this._lastRenderingContext.scrollBar.vertical);
			const isOverHorizontalScrollBar: boolean = CanvasRenderer._isMouseOverScrollBar(x, y, false, this._lastRenderingContext.scrollBar.horizontal);
			if (isOverVerticalScrollBar || isOverHorizontalScrollBar) {
				const scrollVertically: boolean = isOverVerticalScrollBar;

				this._mouseScrollDragStart = {
					scrollHorizontally: !scrollVertically,
					scrollVertically,
					startX: x,
					startY: y,
					startScrollOffset: {
						x: this._scrollOffset.x,
						y: this._scrollOffset.y
					}
				};
			}
		}
	}

	/**
	 * Get the mouse events offset on the canvas.
	 * @param event to get offset for
	 */
	private _getMouseOffset(event: MouseEvent): [number, number] {
		const rect = this._canvasElement.getBoundingClientRect();

		return [
			(event.clientX - rect.left) * window.devicePixelRatio,
			(event.clientY - rect.top) * window.devicePixelRatio
		];
	}

	/**
	 * Check if the given mouse position signals being over the given scroll bar.
	 * @param x position of the mouse
	 * @param y position of the mouse
	 * @param vertical whether to check for vertical or horizontal scroll bar
	 * @param ctx of the scroll bar on a axis (horizontal, vertical)
	 */
	private static _isMouseOverScrollBar(x: number, y: number, vertical: boolean, ctx: IScrollBarAxisRenderContext): boolean {
		const width: number = vertical ? ctx.size : ctx.length;
		const height: number = vertical ? ctx.length : ctx.size;

		return x >= ctx.x && x <= ctx.x + width
			&& y >= ctx.y && y <= ctx.y + height;
	}

	/**
	 * Called when a mouse move event on the canvas has been registered.
	 * @param event that occurred
	 */
	private _onMouseMove(event: MouseEvent): void {
		const isScrollBarDragging: boolean = !!this._mouseScrollDragStart;
		if (isScrollBarDragging) {
			const [x, y] = this._getMouseOffset(event);

			// Update scroll offset accordingly
			if (this._mouseScrollDragStart.scrollVertically) {
				const yDiff = y - this._mouseScrollDragStart.startY;
				const tableHeight = this._cellModel.getHeight();

				this._scrollToY(this._mouseScrollDragStart.startScrollOffset.y + (yDiff / this._canvasElement.height * tableHeight));
			}
			if (this._mouseScrollDragStart.scrollHorizontally) {
				const xDiff = x - this._mouseScrollDragStart.startX;
				const tableWidth = this._cellModel.getWidth();

				this._scrollToX(this._mouseScrollDragStart.startScrollOffset.x + (xDiff / this._canvasElement.width * tableWidth));
			}

			this._lazyRenderingSchedulerSubject.next();
		}
	}

	/**
	 * Called when a mouse up event on the canvas has been registered.
	 * @param event that occurred
	 */
	private _onMouseUp(event: MouseEvent): void {
		this._mouseScrollDragStart = null; // Reset scroll bar dragging
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

		/*
		We group cells to render per renderer name to improve rendering
		performance, as one renderer must only prepare once instead of
		everytime.
		 */
		const cellsPerRenderer: Map<string, ICellRenderContext[]> = new Map<string, ICellRenderContext[]>();

		const cells = this._cellModel.getCellsForRect(viewPort);
		for (let i = 0; i < cells.length; i++) {
			const cell = cells[i];
			const bounds = this._cellModel.getBounds(cells[i].range);

			// Correct bounds for current scroll offsets
			bounds.top -= this._scrollOffset.y;
			bounds.left -= this._scrollOffset.x;

			let cellsToRender: ICellRenderContext[] = cellsPerRenderer.get(cell.rendererName);
			if (!cellsToRender) {
				cellsToRender = [];
				cellsPerRenderer.set(cell.rendererName, cellsToRender);
			}

			// TODO Check whether pre-allocating memory based on a guess is faster than pushing every time
			cellsToRender.push({
				cell,
				bounds
			});
		}

		const scrollBarContext: IScrollBarRenderContext = this._calculateScrollBarContext();

		return {
			viewPort,
			cellsPerRenderer,
			scrollBar: scrollBarContext,
			renderers: this._cellRendererLookup
		}
	}

	/**
	 * Register a cell renderer responsible for
	 * rendering a single cells value.
	 * @param renderer to register
	 */
	public registerCellRenderer(renderer: ICellRenderer<any>): void {
		if (this._cellRendererLookup.has(renderer.getName())) {
			throw new Error(`Cell renderer with name '${renderer.getName()}' already registered`);
		}

		this._cellRendererLookup.set(renderer.getName(), renderer as ICanvasCellRenderer);
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
			this._lastRenderingContext = renderingContext;

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
		for (const [rendererName, cellsToRender] of context.cellsPerRenderer.entries()) {
			const cellRenderer: ICanvasCellRenderer = context.renderers.get(rendererName);
			if (!cellRenderer) {
				throw new Error(`Could not find cell renderer for name '${rendererName}'`);
			}

			// Tell cell renderer that we will soon render a bunch of cells with it.
			cellRenderer.before(ctx);

			for (const cellToRender of cellsToRender) {
				cellRenderer.render(ctx, cellToRender.cell, cellToRender.bounds);
			}

			// Notify cell renderer that we have rendered all cells for this rendering cycle.
			cellRenderer.after(ctx);
		}
	}

	/**
	 * Render the borders of the table.
	 * @param ctx to render with
	 * @param context the rendering context
	 */
	private static _renderBorders(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		// TODO This needs to be re-implemented once the border model is finished

		for (const [rendererName, cellsToRender] of context.cellsPerRenderer.entries()) {
			for (const cellToRender of cellsToRender) {
				const bounds: IRectangle = cellToRender.bounds;

				ctx.strokeStyle = "#EAEAEA";

				ctx.beginPath();

				// Draw only the bottom and right border for now until we have the border model
				ctx.moveTo(bounds.left, bounds.top + bounds.height);
				ctx.lineTo(bounds.left + bounds.width, bounds.top + bounds.height);
				ctx.lineTo(bounds.left + bounds.width, bounds.top);

				ctx.stroke();
			}
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
	 * Cells to render per renderer name.
	 */
	cellsPerRenderer: Map<string, ICellRenderContext[]>;

	/**
	 * Rendering context of the scrollbars.
	 */
	scrollBar: IScrollBarRenderContext;

	/**
	 * Lookup for cell renderers.
	 */
	renderers: Map<string, ICanvasCellRenderer>;

}

/**
 * Rendering context for a single cell.
 */
interface ICellRenderContext {

	/**
	 * Cell to render.
	 */
	cell: ICell;

	/**
	 * Bounds of the cell.
	 */
	bounds: IRectangle;

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

/**
 * Context of a mouse/touch scroll dragging.
 */
interface IMouseScrollDragContext {

	/**
	 * Whether scrolling vertical.
	 */
	scrollVertically: boolean;

	/**
	 * Whether scrolling horizontally.
	 */
	scrollHorizontally: boolean;

	/**
	 * Start X-offset.
	 */
	startX: number;

	/**
	 * Start Y-offset.
	 */
	startY: number;

	/**
	 * Scroll offset to the start of the dragging.
	 */
	startScrollOffset: IScrollOffset;

}
