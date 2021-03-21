import {ITableEngineRenderer} from "../renderer";
import {ICellModel} from "../../cell/model/cell-model.interface";
import {IRendererOptions} from "../options";
import {asyncScheduler, Subject} from "rxjs";
import {min, takeUntil, throttleTime} from "rxjs/operators";
import {ScrollUtil} from "../util/scroll";
import {CanvasUtil} from "../util/canvas";
import {IRectangle} from "../../util/rect";
import {IScrollBarOptions} from "../options/scrollbar";
import {ICell} from "../../cell/cell";
import {ICellRenderer} from "../cell/cell-renderer";
import {ICanvasCellRenderer} from "./cell/canvas-cell-renderer";
import {BaseCellRenderer} from "./cell/base/base-cell-renderer";
import {ICellRange} from "../../cell/range/cell-range";
import {IColor} from "../../util/color";

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

	/**
	 * Current device pixel ratio to render with.
	 */
	private _devicePixelRatio: number = Math.max(window.devicePixelRatio, 1.0);

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
					offsetFromScrollBarStart: scrollVertically ? this._lastRenderingContext.scrollBar.vertical.y - y : this._lastRenderingContext.scrollBar.horizontal.x - x,
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
			(event.clientX - rect.left),
			(event.clientY - rect.top)
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
		if (!ctx) {
			return false;
		}

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
				const fixedRowsHeight: number = !!this._lastRenderingContext.cells.fixedRowCells ? this._lastRenderingContext.cells.fixedRowCells.viewPortBounds.height : 0;
				const viewPortHeight = this._lastRenderingContext.cells.nonFixedCells.viewPortBounds.height;
				const tableHeight = this._cellModel.getHeight() - fixedRowsHeight;

				const curY = this._mouseScrollDragStart.startY + (y - this._mouseScrollDragStart.startY) + this._mouseScrollDragStart.offsetFromScrollBarStart;
				const maxY = viewPortHeight - this._lastRenderingContext.scrollBar.vertical.length;

				this._scrollToY(curY / maxY * (tableHeight - viewPortHeight));
			}
			if (this._mouseScrollDragStart.scrollHorizontally) {
				const fixedColumnWidth: number = !!this._lastRenderingContext.cells.fixedColumnCells ? this._lastRenderingContext.cells.fixedColumnCells.viewPortBounds.width : 0;
				const viewPortWidth = this._lastRenderingContext.cells.nonFixedCells.viewPortBounds.width;
				const tableWidth = this._cellModel.getWidth() - fixedColumnWidth;

				const curX = this._mouseScrollDragStart.startX + (x - this._mouseScrollDragStart.startX) + this._mouseScrollDragStart.offsetFromScrollBarStart;
				const maxX = viewPortWidth - this._lastRenderingContext.scrollBar.horizontal.length;

				this._scrollToX(curX / maxX * (tableWidth - viewPortWidth));
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
		this._devicePixelRatio = Math.max(window.devicePixelRatio, 1.0);

		const newBounds: DOMRect = this._container.getBoundingClientRect();

		// Re-size scroll bar offsets as well
		const fixedRowsHeight: number = !!this._lastRenderingContext.cells.fixedRowCells ? this._lastRenderingContext.cells.fixedRowCells.viewPortBounds.height : 0;
		const fixedColumnsWidth: number = !!this._lastRenderingContext.cells.fixedColumnCells ? this._lastRenderingContext.cells.fixedColumnCells.viewPortBounds.width : 0;

		const tableHeight: number = this._cellModel.getHeight() - fixedRowsHeight;
		const tableWidth: number = this._cellModel.getWidth() - fixedColumnsWidth;

		const oldViewPort: IRectangle = this._lastRenderingContext.cells.nonFixedCells.viewPortBounds;

		if (tableWidth > newBounds.width) {
			const oldMaxOffset = (tableWidth - oldViewPort.width);
			const newMaxOffset = (tableWidth - (newBounds.width - fixedColumnsWidth));

			this._scrollOffset.x = Math.max(Math.min(this._scrollOffset.x * newMaxOffset / oldMaxOffset, newMaxOffset), 0);
		} else {
			this._scrollOffset.x = 0;
		}
		if (tableHeight > newBounds.height) {
			const oldMaxOffset = (tableHeight - oldViewPort.height);
			const newMaxOffset = (tableHeight - (newBounds.height - fixedRowsHeight));

			this._scrollOffset.y = Math.max(Math.min(this._scrollOffset.y * newMaxOffset / oldMaxOffset, newMaxOffset), 0);
		} else {
			this._scrollOffset.y = 0;
		}

		// Set new size to canvas
		CanvasUtil.setCanvasSize(this._canvasElement, newBounds.width, newBounds.height, this._devicePixelRatio);

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
		if (event.ctrlKey) {
			// The user wants to zoom the page -> Don't scroll!
			return;
		}

		const scrollDeltaY: number = ScrollUtil.determineScrollOffsetFromEvent(this._canvasElement, true, event);
		const scrollDeltaX: number = ScrollUtil.determineScrollOffsetFromEvent(this._canvasElement, false, event);

		// When shift-key is pressed, deltaY means scrolling horizontally (same for deltaX).
		const switchScrollDirection: boolean = event.shiftKey;

		const newScrollOffsetX: number = this._scrollOffset.x + (switchScrollDirection ? scrollDeltaY : scrollDeltaX);
		const newScrollOffsetY: number = this._scrollOffset.y + (switchScrollDirection ? scrollDeltaX : scrollDeltaY);

		if (this._scrollTo(newScrollOffsetX, newScrollOffsetY)) {
			this._lazyRenderingSchedulerSubject.next();
		}
	}

	/**
	 * Scroll to the given x and y offsets.
	 * @param offsetX to scroll to
	 * @param offsetY to scroll to
	 * @returns whether the offsets have been changed
	 */
	private _scrollTo(offsetX: number, offsetY: number): boolean {
		const xChanged: boolean = this._scrollToX(offsetX);
		const yChanged: boolean = this._scrollToY(offsetY);

		return xChanged || yChanged;
	}

	/**
	 * Scroll to the given horizontal (X) position.
	 * @param offset to scroll to
	 * @returns whether the offset is out of bounds and thus corrected to the max/min value
	 */
	private _scrollToX(offset: number): boolean {
		const fixedColumnsWidth: number = !!this._lastRenderingContext.cells.fixedColumnCells ? this._lastRenderingContext.cells.fixedColumnCells.viewPortBounds.width : 0;

		const tableWidth: number = this._cellModel.getWidth() - fixedColumnsWidth;
		const viewPortWidth: number = this._lastRenderingContext.cells.nonFixedCells.viewPortBounds.width;

		// Check if we're able to scroll
		if (tableWidth <= viewPortWidth) {
			return false;
		}

		const maxOffset: number = tableWidth - viewPortWidth;

		if (offset < 0) {
			const changed: boolean = this._scrollOffset.x !== 0;
			this._scrollOffset.x = 0;
			return changed;
		} else if (offset > maxOffset) {
			const changed: boolean = this._scrollOffset.x !== maxOffset;
			this._scrollOffset.x = maxOffset;
			return changed;
		} else {
			this._scrollOffset.x = offset;
			return true;
		}
	}

	/**
	 * Scroll to the given vertical (Y) position.
	 * @param offset to scroll to
	 * @returns whether the offset changed
	 */
	private _scrollToY(offset: number): boolean {
		const fixedRowsHeight: number = !!this._lastRenderingContext.cells.fixedRowCells ? this._lastRenderingContext.cells.fixedRowCells.viewPortBounds.height : 0;

		const tableHeight: number = this._cellModel.getHeight() - fixedRowsHeight;
		const viewPortHeight: number = this._lastRenderingContext.cells.nonFixedCells.viewPortBounds.height;

		// Check if we're able to scroll
		if (tableHeight <= viewPortHeight) {
			return false;
		}

		const maxOffset: number = tableHeight - viewPortHeight;

		if (offset < 0) {
			const changed: boolean = this._scrollOffset.y !== 0;
			this._scrollOffset.y = 0;
			return changed;
		} else if (offset > maxOffset) {
			const changed: boolean = this._scrollOffset.y !== maxOffset;
			this._scrollOffset.y = maxOffset;
			return changed;
		} else {
			this._scrollOffset.y = offset;
			return true;
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
			width: this._canvasElement.width / this._devicePixelRatio,
			height: this._canvasElement.height / this._devicePixelRatio
		};
	}

	/**
	 * Calculate the scroll bar rendering context.
	 * @param viewPort to render scroll bar in
	 * @param fixedRowsHeight height of the fixed rows
	 * @param fixedColumnsWidth width of the fixed columns
	 */
	private _calculateScrollBarContext(viewPort: IRectangle, fixedRowsHeight: number, fixedColumnsWidth: number): IScrollBarRenderContext {
		// Derive scroll bar options
		const scrollBarOptions: IScrollBarOptions = this._options.canvas.scrollBar;
		const scrollBarSize: number = scrollBarOptions.size;
		const minScrollBarLength: number = scrollBarOptions.minLength;
		const scrollBarOffset: number = scrollBarOptions.offset;
		const cornerRadius: number = scrollBarOptions.cornerRadius;

		const viewPortWidth: number = viewPort.width - fixedColumnsWidth;
		const viewPortHeight: number = viewPort.height - fixedRowsHeight;

		const tableHeight: number = this._cellModel.getHeight() - fixedRowsHeight;
		const tableWidth: number = this._cellModel.getWidth() - fixedColumnsWidth;

		const maxVerticalOffset: number = tableHeight - viewPortHeight;
		const maxHorizontalOffset: number = tableWidth - viewPortWidth;

		// Calculate vertical scrollbar layout
		let vertical: IScrollBarAxisRenderContext = null;
		if (tableHeight > viewPortHeight) {
			const length = Math.max(viewPortHeight / tableHeight * viewPortHeight, minScrollBarLength);
			const progress = this._scrollOffset.y / maxVerticalOffset;

			vertical = {
				size: scrollBarSize,
				length,
				x: viewPortWidth - scrollBarSize - scrollBarOffset + fixedColumnsWidth,
				y: (viewPortHeight - length) * progress + fixedRowsHeight
			};
		}

		// Calculate horizontal scrollbar layout
		let horizontal: IScrollBarAxisRenderContext = null;
		if (tableWidth > viewPortWidth) {
			const length = Math.max(viewPortWidth / tableWidth * viewPortWidth, minScrollBarLength);
			const progress = this._scrollOffset.x / maxHorizontalOffset;

			horizontal = {
				size: scrollBarSize,
				length,
				x: (viewPortWidth - length) * progress + fixedColumnsWidth,
				y: viewPortHeight - scrollBarSize - scrollBarOffset + fixedRowsHeight
			};
		}

		return {
			color: this._options.canvas.scrollBar.color,
			cornerRadius,
			vertical,
			horizontal,
		};
	}

	/**
	 * Create the rendering context for the current state.
	 */
	private _createRenderingContext(): IRenderContext {
		const viewPort: IRectangle = this._getViewPort();

		const fixedRows: number = Math.min(this._options.view.fixedRows, this._cellModel.getRowCount());
		const fixedColumns: number = Math.min(this._options.view.fixedColumns, this._cellModel.getColumnCount());

		// Calculate width and height of the fixed rows and columns
		const fixedRowsHeight: number = fixedRows > 0
			? this._cellModel.getRowOffset(fixedRows - 1) + (this._cellModel.isRowHidden(fixedRows - 1) ? 0.0 : this._cellModel.getRowSize(fixedRows - 1))
			: 0;
		const fixedColumnsWidth: number = fixedColumns > 0
			? this._cellModel.getColumnOffset(fixedColumns - 1) + (this._cellModel.isColumnHidden(fixedColumns - 1) ? 0.0 : this._cellModel.getColumnSize(fixedColumns - 1))
			: 0;

		const cellsInfo = this._createCellRenderingInfo(viewPort, fixedRows, fixedColumns, fixedRowsHeight, fixedColumnsWidth);
		const scrollBarContext: IScrollBarRenderContext = this._calculateScrollBarContext(viewPort, fixedRowsHeight, fixedColumnsWidth);

		return {
			viewPort,
			cells: cellsInfo,
			scrollBar: scrollBarContext,
			renderers: this._cellRendererLookup
		}
	}

	/**
	 * Create information used to render cells later.
	 * @param viewPort to get cells for
	 * @param fixedRows amount of fixed rows
	 * @param fixedColumns amount of fixed columns
	 * @param fixedRowsHeight height of the fixed rows
	 * @param fixedColumnsWidth width of the fixed columns
	 */
	private _createCellRenderingInfo(
		viewPort: IRectangle,
		fixedRows: number,
		fixedColumns: number,
		fixedRowsHeight: number,
		fixedColumnsWidth: number
	): ICellRenderContextCollection {
		/*
		We group cells to render per renderer name to improve rendering
		performance, as one renderer must only prepare once instead of
		everytime.
		 */

		// Fetch cell range to paint for the current viewport
		const cellRange: ICellRange = this._cellModel.getRangeForRect(viewPort);

		// Fill "normal" (non-fixed) cells first
		const nonFixedCells = this._createCellRenderArea({
			startRow: Math.min(cellRange.startRow + fixedRows, cellRange.endRow),
			endRow: cellRange.endRow,
			startColumn: Math.min(cellRange.startColumn + fixedColumns, cellRange.endColumn),
			endColumn: cellRange.endColumn
		}, {
			left: fixedColumnsWidth,
			top: fixedRowsHeight,
			width: viewPort.width - fixedColumnsWidth,
			height: viewPort.height - fixedRowsHeight
		}, true, true);

		const result: ICellRenderContextCollection = {
			nonFixedCells
		};

		// Fill fixed columns (if any)
		if (fixedColumns > 0) {
			result.fixedColumnCells = this._createCellRenderArea({
				startRow: cellRange.startRow,
				endRow: cellRange.endRow,
				startColumn: 0,
				endColumn: fixedColumns - 1
			}, {
				left: 0,
				top: fixedRowsHeight,
				width: fixedColumnsWidth,
				height: viewPort.height - fixedRowsHeight
			}, false, true);
		}

		// Fill fixed rows (if any)
		if (fixedRows > 0) {
			result.fixedRowCells = this._createCellRenderArea({
				startRow: 0,
				endRow: fixedRows - 1,
				startColumn: cellRange.startColumn,
				endColumn: cellRange.endColumn
			}, {
				left: fixedColumnsWidth,
				top: 0,
				width: viewPort.width - fixedColumnsWidth,
				height: fixedRowsHeight
			}, true, false);
		}

		// Fill fixed corner cells (if any)
		if (fixedColumns > 0 && fixedRows > 0) {
			result.fixedCornerCells = this._createCellRenderArea({
				startRow: 0,
				endRow: fixedRows - 1,
				startColumn: 0,
				endColumn: fixedColumns - 1
			}, {
				left: 0,
				top: 0,
				width: fixedColumnsWidth,
				height: fixedRowsHeight
			}, false, false);
		}

		return result;
	}

	/**
	 * Create cell area to render.
	 * @param range to create rendering lookup for
	 * @param viewPortBounds of the range
	 * @param adjustBoundsX whether to adjust the x bounds
	 * @param adjustBoundsY whether to adjust the y bounds
	 * @returns mapping of renderer names to all cells that need to be rendered with the renderer
	 */
	private _createCellRenderArea(range: ICellRange, viewPortBounds: IRectangle, adjustBoundsX: boolean, adjustBoundsY: boolean): ICellAreaRenderContext {
		const cellsPerRenderer = new Map<string, ICellRenderInfo[]>();
		const cells = this._cellModel.getCells(range);

		for (let i = 0; i < cells.length; i++) {
			const cell = cells[i];
			const bounds = this._cellModel.getBounds(cells[i].range);

			// Correct bounds for current scroll offsets
			if (adjustBoundsY) {
				bounds.top -= this._scrollOffset.y;
			}
			if (adjustBoundsX) {
				bounds.left -= this._scrollOffset.x;
			}

			let cellsToRender: ICellRenderInfo[] = cellsPerRenderer.get(cell.rendererName);
			if (!cellsToRender) {
				cellsToRender = [];
				cellsPerRenderer.set(cell.rendererName, cellsToRender);
			}

			cellsToRender.push({
				cell,
				bounds
			});
		}

		return {
			viewPortBounds: viewPortBounds,
			cellsPerRenderer
		};
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

			ctx.save();
			ctx.scale(this._devicePixelRatio, this._devicePixelRatio);

			// Render "normal" (non-fixed) cells first
			CanvasRenderer._renderCellArea(ctx, renderingContext, renderingContext.cells.nonFixedCells);
			CanvasRenderer._renderBordersPerRenderer(ctx, renderingContext, renderingContext.cells.nonFixedCells);

			// Then render fixed cells (if any).
			if (!!renderingContext.cells.fixedColumnCells) {
				CanvasRenderer._renderCellArea(ctx, renderingContext, renderingContext.cells.fixedColumnCells);
				CanvasRenderer._renderBordersPerRenderer(ctx, renderingContext, renderingContext.cells.fixedColumnCells);
			}
			if (!!renderingContext.cells.fixedRowCells) {
				CanvasRenderer._renderCellArea(ctx, renderingContext, renderingContext.cells.fixedRowCells);
				CanvasRenderer._renderBordersPerRenderer(ctx, renderingContext, renderingContext.cells.fixedRowCells);
			}
			if (!!renderingContext.cells.fixedCornerCells) {
				CanvasRenderer._renderCellArea(ctx, renderingContext, renderingContext.cells.fixedCornerCells);
				CanvasRenderer._renderBordersPerRenderer(ctx, renderingContext, renderingContext.cells.fixedCornerCells);
			}

			CanvasRenderer._renderScrollBars(ctx, renderingContext);

			ctx.restore();

			console.log(`RENDERING: ${window.performance.now() - renderingTime}ms, CREATING RENDERING CONTEXT: ${creatingRenderingContextTime}ms`);
		});
	}

	/**
	 * Render the passed cellsPerRenderer map.
	 * @param ctx to render with
	 * @param context the rendering context
	 * @param cellArea to render
	 */
	private static _renderCellArea(ctx: CanvasRenderingContext2D, context: IRenderContext, cellArea: ICellAreaRenderContext): void {
		// Clear area first
		ctx.clearRect(cellArea.viewPortBounds.left, cellArea.viewPortBounds.top, cellArea.viewPortBounds.width, cellArea.viewPortBounds.height);

		for (const [rendererName, cellsToRender] of cellArea.cellsPerRenderer.entries()) {
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
	 * Render borders for the passed cellsPerRenderer map.
	 * @param ctx to render with
	 * @param context the rendering context
	 * @param cellArea to render
	 */
	private static _renderBordersPerRenderer(ctx: CanvasRenderingContext2D, context: IRenderContext, cellArea: ICellAreaRenderContext): void {
		for (const [rendererName, cellsToRender] of cellArea.cellsPerRenderer.entries()) {
			for (const cellToRender of cellsToRender) {
				const bounds: IRectangle = cellToRender.bounds;

				ctx.strokeStyle = "#EAEAEA";
				ctx.lineWidth = 1;

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
		ctx.fillStyle = CanvasUtil.colorToStyle(context.scrollBar.color);

		// Draw vertical scrollbar (if needed)
		if (!!context.scrollBar.vertical) {
			CanvasUtil.makeRoundRectPath(ctx, {
				left: context.scrollBar.vertical.x,
				top: context.scrollBar.vertical.y,
				width: context.scrollBar.vertical.size,
				height: context.scrollBar.vertical.length
			}, context.scrollBar.cornerRadius);
			ctx.fill();
		}

		// Draw horizontal scrollbar (if needed)
		if (!!context.scrollBar.horizontal) {
			CanvasUtil.makeRoundRectPath(ctx, {
				left: context.scrollBar.horizontal.x,
				top: context.scrollBar.horizontal.y,
				width: context.scrollBar.horizontal.length,
				height: context.scrollBar.horizontal.size
			}, context.scrollBar.cornerRadius);
			ctx.fill();
		}
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
	 * Infos about all cells to render.
	 */
	cells: ICellRenderContextCollection;

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
 * Collections of all cells to render.
 */
interface ICellRenderContextCollection {

	/**
	 * "Normal" (non-fixed) cells to render.
	 */
	nonFixedCells: ICellAreaRenderContext;

	/**
	 * Fixed corner cells to render.
	 */
	fixedCornerCells?: ICellAreaRenderContext;

	/**
	 * Fixed row cells to render.
	 */
	fixedRowCells?: ICellAreaRenderContext;

	/**
	 * Fixed column cells to render.
	 */
	fixedColumnCells?: ICellAreaRenderContext;

}

/**
 * Rendering context for a cell area (fixed corner cells, fixed column cells,
 * fixed row cells, "normal" (non-fixed) cells.
 */
interface ICellAreaRenderContext {

	/**
	 * Total bounds of the cell area in the viewport.
	 */
	viewPortBounds: IRectangle;

	/**
	 * Cells to render per renderer name.
	 */
	cellsPerRenderer: Map<string, ICellRenderInfo[]>;

}

/**
 * Rendering info for a single cell.
 */
interface ICellRenderInfo {

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
	color: IColor;

	/**
	 * Radius of the scroll bar rounded corners.
	 */
	cornerRadius: number;

	/**
	 * Vertical scrollbar rendering context.
	 * Only set if a scrollbar needed.
	 */
	vertical?: IScrollBarAxisRenderContext;

	/**
	 * Horizontal scrollbar rendering context.
	 * Only set if a scrollbar is needed.
	 */
	horizontal?: IScrollBarAxisRenderContext;

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
	 * Offset from scroll bar start at the start of the drag.
	 */
	offsetFromScrollBarStart: number;

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
