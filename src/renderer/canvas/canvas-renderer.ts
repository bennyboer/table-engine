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
import {CellRange, ICellRange} from "../../cell/range/cell-range";
import {IColor} from "../../util/color";
import {ISelectionModel} from "../../selection/model/selection-model.interface";
import {IInitialPosition, ISelection} from "../../selection/selection";

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
	 * Selection model to draw selections for.
	 */
	private _selectionModel: ISelectionModel;

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
	 * Registered key up listener.
	 */
	private _keyUpListener: (KeyboardEvent) => void;

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
	 * Registered listener to touch start events.
	 */
	private _touchStartListener: (TouchEvent) => void;

	/**
	 * Registered listener to touch move events.
	 */
	private _touchMoveListener: (TouchEvent) => void;

	/**
	 * Registered listener to touch end events.
	 */
	private _touchEndListener: (TouchEvent) => void;

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
	private _scrollBarDragStart: IScrollBarDragContext | null = null;

	/**
	 * Current device pixel ratio to render with.
	 */
	private _devicePixelRatio: number = Math.max(window.devicePixelRatio, 1.0);

	/**
	 * Whether the mouse drag mode is enabled when the space key is pressed.
	 */
	private _isInMouseDragMode: boolean = false;

	/**
	 * Context of the current mouse dragging.
	 * Can be enabled via pressing space and mouse events.
	 */
	private _mouseDragStart: IMouseDragContext | null = null;

	/**
	 * ID of the touch starting panning.
	 */
	private _startTouchID: number | null = null;

	/**
	 * Context of the current panning of the workspace (using fingers).
	 */
	private _panningStart: IMouseDragContext | null = null;

	/**
	 * The initially selected cell range of the current selection process (if in progress).
	 */
	private _initialSelectionRange: ICellRange | null;

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
	 * @param selectionModel to render selection from
	 * @param options of the renderer
	 */
	public async initialize(container: HTMLElement, cellModel: ICellModel, selectionModel: ISelectionModel, options: IRendererOptions): Promise<void> {
		this._container = container;
		this._cellModel = cellModel;
		this._selectionModel = selectionModel;
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

		this._keyUpListener = (event) => this._onKeyUp(event);
		this._canvasElement.addEventListener("keyup", this._keyUpListener);

		// Listen for mouse events
		this._wheelListener = (event) => this._onWheel(event);
		this._canvasElement.addEventListener("wheel", this._wheelListener, {
			passive: false
		});

		this._mouseDownListener = (event) => this._onMouseDown(event);
		this._canvasElement.addEventListener("mousedown", this._mouseDownListener);

		this._mouseMoveListener = (event) => this._onMouseMove(event);
		window.addEventListener("mousemove", this._mouseMoveListener);

		this._mouseUpListener = (event) => this._onMouseUp(event);
		window.addEventListener("mouseup", this._mouseUpListener);

		// Listen for touch events
		this._touchStartListener = (event) => this._onTouchStart(event);
		this._canvasElement.addEventListener("touchstart", this._touchStartListener);

		this._touchMoveListener = (event) => this._onTouchMove(event);
		window.addEventListener("touchmove", this._touchMoveListener);

		this._touchEndListener = (event) => this._onTouchEnd(event);
		window.addEventListener("touchend", this._touchEndListener);

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
		if (!!this._keyUpListener) {
			this._canvasElement.removeEventListener("keyup", this._keyUpListener);
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

		if (!!this._touchStartListener) {
			this._canvasElement.removeEventListener("touchstart", this._touchStartListener);
		}
		if (!!this._touchMoveListener) {
			window.removeEventListener("touchmove", this._touchMoveListener);
		}
		if (!!this._touchEndListener) {
			window.removeEventListener("touchend", this._touchEndListener);
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
		if (!this._lastRenderingContext) {
			return;
		}

		const isMainButtonDown: boolean = event.buttons === 1;
		if (isMainButtonDown) {
			const [x, y] = this._getMouseOffset(event);

			// Check if mouse if over a scroll bar
			const isOverVerticalScrollBar: boolean = CanvasRenderer._isMouseOverScrollBar(x, y, true, this._lastRenderingContext.scrollBar.vertical);
			const isOverHorizontalScrollBar: boolean = CanvasRenderer._isMouseOverScrollBar(x, y, false, this._lastRenderingContext.scrollBar.horizontal);
			if (isOverVerticalScrollBar || isOverHorizontalScrollBar) {
				const scrollVertically: boolean = isOverVerticalScrollBar;

				this._scrollBarDragStart = {
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
			} else if (this._isInMouseDragMode) {
				this._mouseDragStart = {
					startX: x,
					startY: y,
					startScrollOffset: {
						x: this._scrollOffset.x,
						y: this._scrollOffset.y
					}
				};
			} else {
				// Update selection
				this._initialSelectionRange = this._getCellRangeAtPoint(x, y);
				this._updateCurrentSelection(this._initialSelectionRange, {
					row: this._initialSelectionRange.startRow,
					column: this._initialSelectionRange.startColumn,
				});
			}
		}
	}

	/**
	 * Get the cell range at the given point on the viewport.
	 * @param x offset
	 * @param y offset
	 */
	private _getCellRangeAtPoint(x: number, y: number): ICellRange {
		const fixedRowsHeight: number = !!this._lastRenderingContext.cells.fixedRowCells ? this._lastRenderingContext.cells.fixedRowCells.viewPortBounds.height : 0;
		const fixedColumnWidth: number = !!this._lastRenderingContext.cells.fixedColumnCells ? this._lastRenderingContext.cells.fixedColumnCells.viewPortBounds.width : 0;

		if (x > fixedColumnWidth) {
			x += this._scrollOffset.x;
		}
		if (y > fixedRowsHeight) {
			y += this._scrollOffset.y;
		}

		const cell = this._cellModel.getCellAtOffset(x, y);
		if (!!cell) {
			return cell.range;
		} else {
			return CellRange.fromSingleRowColumn(this._cellModel.getRowAtOffset(y), this._cellModel.getColumnAtOffset(x));
		}
	}

	/**
	 * Update the current selection to the passed cell range.
	 * @param range to update current selection to
	 * @param initial to update current selection to
	 */
	private _updateCurrentSelection(range: ICellRange, initial: IInitialPosition): void {
		this._selectionModel.clear();
		this._selectionModel.addSelection({
			range,
			initial
		}, true);

		this._lazyRenderingSchedulerSubject.next();
	}

	/**
	 * Get the mouse events offset on the canvas.
	 * @param event to get offset for
	 */
	private _getMouseOffset(event: MouseEvent | Touch): [number, number] {
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
		const isMainButtonDown: boolean = event.buttons === 1;
		if (isMainButtonDown) {
			const isScrollBarDragging: boolean = !!this._scrollBarDragStart;
			const isMouseDragging: boolean = !!this._mouseDragStart;

			const [x, y] = this._getMouseOffset(event);

			if (isScrollBarDragging) {
				this._onScrollBarMove(x, y, this._scrollBarDragStart);
			} else if (isMouseDragging) {
				this._onViewPortMove(x, y, this._mouseDragStart);
			} else {
				// Extend selection
				const targetRange: ICellRange = this._getCellRangeAtPoint(x, y);

				this._updateCurrentSelection({
					startRow: Math.min(this._initialSelectionRange.startRow, targetRange.startRow),
					endRow: Math.max(this._initialSelectionRange.endRow, targetRange.endRow),
					startColumn: Math.min(this._initialSelectionRange.startColumn, targetRange.startColumn),
					endColumn: Math.max(this._initialSelectionRange.endColumn, targetRange.endColumn),
				}, {
					row: this._initialSelectionRange.startRow,
					column: this._initialSelectionRange.startColumn,
				});
			}
		}
	}

	/**
	 * Called when the viewport is dragged and should be moved (scroll adjustment).
	 * @param x the new x position
	 * @param y the new y position
	 * @param start of the drag
	 */
	private _onViewPortMove(x: number, y: number, start: IMouseDragContext): void {
		if (this._scrollTo(
			start.startScrollOffset.x + (start.startX - x),
			start.startScrollOffset.y + (start.startY - y)
		)) {
			this._lazyRenderingSchedulerSubject.next();
		}
	}

	/**
	 * Called when a scrollbar should be moved.
	 * @param x the new x position
	 * @param y the new y position
	 * @param start of the scrollbar drag
	 */
	private _onScrollBarMove(x: number, y: number, start: IScrollBarDragContext): void {
		// Update scroll offset accordingly
		if (start.scrollVertically) {
			const fixedRowsHeight: number = !!this._lastRenderingContext.cells.fixedRowCells ? this._lastRenderingContext.cells.fixedRowCells.viewPortBounds.height : 0;
			const viewPortHeight = this._lastRenderingContext.cells.nonFixedCells.viewPortBounds.height;
			const tableHeight = this._cellModel.getHeight() - fixedRowsHeight;

			// Normalize x and y coordinates for fixed rows/columns
			y -= fixedRowsHeight;
			const startY = start.startY - fixedRowsHeight;

			const curY = startY + (y - startY) + start.offsetFromScrollBarStart;
			const maxY = viewPortHeight - this._lastRenderingContext.scrollBar.vertical.length;

			if (this._scrollToY(curY / maxY * (tableHeight - viewPortHeight))) {
				this._lazyRenderingSchedulerSubject.next();
			}
		}
		if (start.scrollHorizontally) {
			const fixedColumnWidth: number = !!this._lastRenderingContext.cells.fixedColumnCells ? this._lastRenderingContext.cells.fixedColumnCells.viewPortBounds.width : 0;
			const viewPortWidth = this._lastRenderingContext.cells.nonFixedCells.viewPortBounds.width;
			const tableWidth = this._cellModel.getWidth() - fixedColumnWidth;

			// Normalize x and y coordinates for fixed rows/columns
			x -= fixedColumnWidth;
			const startX = start.startX - fixedColumnWidth;

			const curX = startX + (x - startX) + start.offsetFromScrollBarStart;
			const maxX = viewPortWidth - this._lastRenderingContext.scrollBar.horizontal.length;

			if (this._scrollToX(curX / maxX * (tableWidth - viewPortWidth))) {
				this._lazyRenderingSchedulerSubject.next();
			}
		}
	}

	/**
	 * Called when a mouse up event on the canvas has been registered.
	 * @param event that occurred
	 */
	private _onMouseUp(event: MouseEvent): void {
		this._scrollBarDragStart = null; // Reset scroll bar dragging
		this._mouseDragStart = null; // Reset workspace dragging via mouse/touch
	}

	/**
	 * Called when a touch start event occurs.
	 * @param event that occurred
	 */
	private _onTouchStart(event: TouchEvent): void {
		if (event.touches.length === 1 && !this._panningStart) {
			const touch: Touch = event.changedTouches[0];

			this._startTouchID = touch.identifier;

			const [x, y] = this._getMouseOffset(touch);

			this._panningStart = {
				startX: x,
				startY: y,
				startScrollOffset: {
					x: this._scrollOffset.x,
					y: this._scrollOffset.y
				}
			};
			event.preventDefault();
		}
	}

	/**
	 * Called when a touch move event occurs.
	 * @param event that occurred
	 */
	private _onTouchMove(event: TouchEvent): void {
		if (!!this._panningStart && event.changedTouches.length === 1) {
			const touch: Touch = event.changedTouches[0];

			if (touch.identifier === this._startTouchID) {
				const [x, y] = this._getMouseOffset(touch);

				this._onViewPortMove(x, y, this._panningStart);
			}
		}
	}

	/**
	 * Called when a touch end event occurs.
	 * @param event that occurred
	 */
	private _onTouchEnd(event: TouchEvent): void {
		for (let i = 0; i < event.changedTouches.length; i++) {
			const touch: Touch = event.changedTouches[i];
			if (touch.identifier === this._startTouchID) {
				// Stop panning
				this._panningStart = null;
			}
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
		if (event.code === "Space") {
			event.preventDefault();
			this._isInMouseDragMode = true;
		} else if (event.code === "Tab") {
			// TODO This needs to be reworked - just for testing
			event.preventDefault();
			const primary = this._selectionModel.getPrimary();
			if (!!primary) {
				primary.initial.column++;
			}
			this._lazyRenderingSchedulerSubject.next();
		} else if (event.code === "Enter") {
			// TODO This needs to be reworked - just for testing
			const primary = this._selectionModel.getPrimary();
			if (!!primary) {
				primary.initial.row++;
			}
			this._lazyRenderingSchedulerSubject.next();
		}
	}

	/**
	 * Called on key up on the container.
	 * @param event that occurred
	 */
	private _onKeyUp(event: KeyboardEvent): void {
		if (event.code === "Space") {
			this._isInMouseDragMode = false;
		}
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

		event.preventDefault();

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

	/**1
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
	 * Calculate the selection rendering context.
	 * @param viewPort to calculate selections for
	 * @param fixedRows to calculate with
	 * @param fixedColumns to calculate with
	 * @param fixedRowsHeight height of the fixed rows
	 * @param fixedColumnsWidth width of the fixed columns
	 */
	private _calculateSelectionContext(
		viewPort: IRectangle,
		fixedRows: number,
		fixedColumns: number,
		fixedRowsHeight: number,
		fixedColumnsWidth: number
	): ISelectionRenderContext {
		const selections: ISelection[] = this._selectionModel.getSelections();
		const primary: ISelection = this._selectionModel.getPrimary();

		if (selections.length === 0) {
			return null; // We do not have a selection yet
		}

		const result: ISelectionRenderContext = {
			other: [],
			inNonFixedArea: [],
			inFixedColumns: [],
			inFixedRows: []
		};

		for (const s of selections) {
			this._addInfosForSelection(
				result,
				primary,
				viewPort,
				fixedRows,
				fixedColumns,
				fixedRowsHeight,
				fixedColumnsWidth,
				s === primary
			);
		}

		return result;
	}

	/**
	 * Calculate the bounds for the given selection and add them to the rendering context result.
	 * @param toAdd the context to add the result to
	 * @param selection to calculate bounds for
	 * @param viewPort to calculate selections for
	 * @param fixedRows to calculate with
	 * @param fixedColumns to calculate with
	 * @param fixedRowsHeight height of the fixed rows
	 * @param fixedColumnsWidth width of the fixed columns
	 * @param isPrimary whether the selection is the primary selection
	 */
	private _addInfosForSelection(
		toAdd: ISelectionRenderContext,
		selection: ISelection,
		viewPort: IRectangle,
		fixedRows: number,
		fixedColumns: number,
		fixedRowsHeight: number,
		fixedColumnsWidth: number,
		isPrimary: boolean
	): void {
		const bounds: IRectangle = this._calculateSelectionBoundsFromCellRangeBounds(
			this._cellModel.getBounds(selection.range),
			selection.range,
			viewPort,
			fixedRows,
			fixedColumns,
			fixedRowsHeight,
			fixedColumnsWidth
		);

		const initialBounds: IRectangle | null = isPrimary ? this._calculateSelectionBoundsFromCellRangeBounds(
			this._cellModel.getBounds(CellRange.fromSingleRowColumn(selection.initial.row, selection.initial.column)),
			selection.range,
			viewPort,
			fixedRows,
			fixedColumns,
			fixedRowsHeight,
			fixedColumnsWidth
		) : null;

		const isStartInFixedRows: boolean = selection.range.startRow < fixedRows;
		const isStartInFixedColumns: boolean = selection.range.startColumn < fixedColumns;

		let collectionToPushTo: ISelectionRenderInfo[];
		if (isStartInFixedRows && isStartInFixedColumns) {
			collectionToPushTo = toAdd.other;
		} else if (isStartInFixedRows) {
			collectionToPushTo = toAdd.inFixedRows;
		} else if (isStartInFixedColumns) {
			collectionToPushTo = toAdd.inFixedColumns;
		} else {
			collectionToPushTo = toAdd.inNonFixedArea;
		}

		collectionToPushTo.push({
			bounds,
			initial: initialBounds,
			isPrimary
		});
	}

	/**
	 * Calculate the selection bounds from the given cell range bounds.
	 * @param bounds cell bounds to calculate selection bounds with
	 * @param range cell range the bounds have been calculated with
	 * @param viewPort to calculate selections for
	 * @param fixedRows to calculate with
	 * @param fixedColumns to calculate with
	 * @param fixedRowsHeight height of the fixed rows
	 * @param fixedColumnsWidth width of the fixed columns
	 */
	private _calculateSelectionBoundsFromCellRangeBounds(
		bounds: IRectangle,
		range: ICellRange,
		viewPort: IRectangle,
		fixedRows: number,
		fixedColumns: number,
		fixedRowsHeight: number,
		fixedColumnsWidth: number
	): IRectangle {
		let startY = bounds.top;
		let endY = bounds.top + bounds.height;
		let startX = bounds.left;
		let endX = bounds.left + bounds.width;

		if (range.startRow >= fixedRows) {
			startY -= this._scrollOffset.y;
		}
		if (range.endRow >= fixedRows) {
			endY -= this._scrollOffset.y;
		}
		if (range.startColumn >= fixedColumns) {
			startX -= this._scrollOffset.x;
		}
		if (range.endColumn >= fixedColumns) {
			endX -= this._scrollOffset.x;
		}

		const isStartInFixedRows: boolean = range.startRow < fixedRows;
		const isStartInFixedColumns: boolean = range.startColumn < fixedColumns;

		const widthInFixedColumns: number = this._cellModel.getBounds({
			startRow: 0,
			endRow: 0,
			startColumn: range.startColumn,
			endColumn: Math.min(fixedColumns - 1, range.endColumn)
		}).width;
		const heightInFixedRows: number = this._cellModel.getBounds({
			startRow: range.startRow,
			endRow: Math.min(fixedRows - 1, range.endRow),
			startColumn: 0,
			endColumn: 0
		}).height;

		return {
			left: startX,
			top: startY,
			width: Math.max(endX - startX, isStartInFixedColumns ? widthInFixedColumns : 0),
			height: Math.max(endY - startY, isStartInFixedRows ? heightInFixedRows : 0)
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
		const selectionContext: ISelectionRenderContext = this._calculateSelectionContext(viewPort, fixedRows, fixedColumns, fixedRowsHeight, fixedColumnsWidth);

		return {
			viewPort,
			cells: cellsInfo,
			scrollBar: scrollBarContext,
			selection: selectionContext,
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
			CanvasRenderer._renderArea(ctx, renderingContext, renderingContext.cells.nonFixedCells, renderingContext.selection?.inNonFixedArea);

			// Then render fixed cells (if any).
			if (!!renderingContext.cells.fixedColumnCells) {
				CanvasRenderer._renderArea(ctx, renderingContext, renderingContext.cells.fixedColumnCells, renderingContext.selection.inFixedColumns);
			}
			if (!!renderingContext.cells.fixedRowCells) {
				CanvasRenderer._renderArea(ctx, renderingContext, renderingContext.cells.fixedRowCells, renderingContext.selection.inFixedRows);
			}
			if (!!renderingContext.cells.fixedCornerCells) {
				CanvasRenderer._renderArea(ctx, renderingContext, renderingContext.cells.fixedCornerCells, renderingContext.selection.other);
			}

			// Render scrollbars
			CanvasRenderer._renderScrollBars(ctx, renderingContext);

			ctx.restore();

			console.log(`RENDERING: ${window.performance.now() - renderingTime}ms, CREATING RENDERING CONTEXT: ${creatingRenderingContextTime}ms`);
		});
	}

	/**
	 * Render a specific area of the table (non-fixed cell area, fixed rows area,
	 * fixed columns area, fixed corner area).
	 * @param ctx to render with
	 * @param context the rendering context
	 * @param cellArea to render for the area
	 * @param selectionInfos to render for the area
	 */
	private static _renderArea(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext,
		cellArea: ICellAreaRenderContext,
		selectionInfos?: ISelectionRenderInfo[]
	): void {
		CanvasRenderer._renderAreaCells(ctx, context, cellArea);
		CanvasRenderer._renderBordersPerRenderer(ctx, context, cellArea);

		// Render selection that may be displayed the area
		if (!!selectionInfos) {
			CanvasRenderer._renderSelections(ctx, context, selectionInfos);
		}
	}

	/**
	 * Render cells for the passed cell area.
	 * @param ctx to render with
	 * @param context the rendering context
	 * @param cellArea to render
	 */
	private static _renderAreaCells(ctx: CanvasRenderingContext2D, context: IRenderContext, cellArea: ICellAreaRenderContext): void {
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

	/**
	 * Render the selections.
	 * @param ctx to render with
	 * @param context the rendering context
	 * @param infos rendering infos about selection rectangles to draw
	 */
	private static _renderSelections(ctx: CanvasRenderingContext2D, context: IRenderContext, infos: ISelectionRenderInfo[]): void {
		// TODO Colors and line width to rendering configuration
		const primarySelectionBorderColor: IColor = {red: 41, green: 180, blue: 255, alpha: 1.0};
		const primarySelectionBackgroundColor: IColor = {red: 30, green: 120, blue: 180, alpha: 0.2};
		const secondarySelectionBorderColor: IColor = {red: 50, green: 50, blue: 50, alpha: 0.4};
		const secondarySelectionBackgroundColor: IColor = {red: 50, green: 50, blue: 50, alpha: 0.2};
		const selectionBorderSize: number = 2;

		ctx.fillStyle = CanvasUtil.colorToStyle(secondarySelectionBackgroundColor);
		ctx.strokeStyle = CanvasUtil.colorToStyle(secondarySelectionBorderColor);
		ctx.lineWidth = selectionBorderSize;

		for (const info of infos) {
			if (info.isPrimary) {
				ctx.fillStyle = CanvasUtil.colorToStyle(primarySelectionBackgroundColor);
				ctx.strokeStyle = CanvasUtil.colorToStyle(primarySelectionBorderColor);

				// Fill area over initial (if necessary)
				if (info.bounds.top - info.initial.top > 0) {
					ctx.fillRect(info.bounds.left, info.bounds.top, info.bounds.width, info.bounds.top - info.initial.top);
				}

				// Fill area left of initial (if necessary)
				if (info.bounds.left - info.initial.left > 0) {
					ctx.fillRect(info.bounds.left, info.initial.top + (info.bounds.top - info.initial.top), info.bounds.left - info.initial.left, info.initial.height);
				}

				// Fill area right of initial (if necessary)
				if ((info.bounds.left + info.bounds.width) - (info.initial.left + info.initial.width) > 0) {
					ctx.fillRect(info.initial.left + info.initial.width, info.initial.top + (info.bounds.top - info.initial.top), (info.bounds.left + info.bounds.width) - (info.initial.left + info.initial.width), info.initial.height);
				}

				// Fill area under initial (if necessary)
				if ((info.bounds.top + info.bounds.height) - (info.initial.top + info.initial.height) > 0) {
					ctx.fillRect(info.bounds.left, info.initial.top + info.initial.height, info.bounds.width, (info.bounds.top + info.bounds.height) - (info.initial.top + info.initial.height));
				}

				// Stroke
				ctx.strokeRect(info.bounds.left, info.bounds.top, info.bounds.width, info.bounds.height);

				// Reset colors
				ctx.fillStyle = CanvasUtil.colorToStyle(secondarySelectionBackgroundColor);
				ctx.strokeStyle = CanvasUtil.colorToStyle(secondarySelectionBorderColor);
			} else {
				ctx.fillRect(info.bounds.left, info.bounds.top, info.bounds.width, info.bounds.height);
				ctx.strokeRect(info.bounds.left, info.bounds.top, info.bounds.width, info.bounds.height);
			}
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
	 * Rendering context of the selectiojns.
	 */
	selection?: ISelectionRenderContext;

	/**
	 * Lookup for cell renderers.
	 */
	renderers: Map<string, ICanvasCellRenderer>;

}

/**
 * Rendering context of selections.
 */
interface ISelectionRenderContext {

	/**
	 * Selections rectangles completely contained in the non-fixed area.
	 */
	inNonFixedArea: ISelectionRenderInfo[];

	/**
	 * Selection rectangles completely contained in non-fixed area or fixed rows area.
	 */
	inFixedRows: ISelectionRenderInfo[];

	/**
	 * Selection rectangle completely contained in non-fixed area or fixed columns area.
	 */
	inFixedColumns: ISelectionRenderInfo[];

	/**
	 * Selection rectangles to be displayed above all areas.
	 */
	other: ISelectionRenderInfo[];

}

/**
 * Rendering info about one selection.
 */
interface ISelectionRenderInfo {

	/**
	 * Whether the selection is the primary selection.
	 */
	isPrimary: boolean;

	/**
	 * Bounds of the initial cell (only available when this is the primary selection.
	 */
	initial?: IRectangle;

	/**
	 * Bounds of the rectangle on the viewport.
	 */
	bounds: IRectangle;

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
interface IScrollBarDragContext {

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

/**
 * Context holding info about a workspace dragging via mouse/touch.
 */
interface IMouseDragContext {

	/**
	 * Start x-offset.
	 */
	startX: number;

	/**
	 * Start y-offset.
	 */
	startY: number;

	/**
	 * Scroll offset to the start of the dragging.
	 */
	startScrollOffset: IScrollOffset;

}
