import { ITableEngineRenderer } from '../renderer';
import {
	BeforeDeleteEvent,
	CellModelEventType,
	CellRange,
	CellRangeUtil,
	HiddenEvent,
	ICell,
	ICellModel,
	ICellModelEvent,
	ICellRange,
} from '../../cell';
import { asyncScheduler, Subject } from 'rxjs';
import { takeUntil, throttleTime } from 'rxjs/operators';
import { CanvasUtil, ScrollUtil } from '../util';
import {
	ClipboardUtil,
	Colors,
	CopyNotification,
	CopyPerformanceWarningNotification,
	IColor,
	IPoint,
	IRectangle,
	ISize,
} from '../../util';
import {
	IResizerDoubleClickActionOptions,
	IScrollBarOptions,
	ISelectionRenderingOptions,
} from '../options';
import {
	ICellRenderer,
	ICellRendererEvent,
	ICellRendererEventListener,
	ICellRendererFocusEvent,
	ICellRendererKeyboardEvent,
	ICellRendererMouseEvent,
} from '../cell';
import { ICanvasCellRenderer } from './cell';
import { IInitialPosition, ISelection, ISelectionModel } from '../../selection';
import { TableEngine } from '../../table-engine';
import { BorderStyle, IBorder, IBorderModel, IBorderSide } from '../../border';
import { IOverlay } from '../../overlay';
import { ITableEngineOptions } from '../../options';
import { IRendererOptions } from '../renderer-options';
import { IViewportScroller, ViewportScroller } from './scroll';
import { FixedAreaUtil, IFixedAreaInfos } from './fixed-area-util';
import { IErrorOptions } from './options';
import { IParagraph } from './cell/text/line-wrap';

type CellRendererEventListenerFunction = (event: ICellRendererEvent) => void;
type CellRendererEventListenerFunctionSupplier = (
	listener: ICellRendererEventListener
) => CellRendererEventListenerFunction | null | undefined;

/**
 * Table-engine renderer using the HTML5 canvas.
 */
export class CanvasRenderer implements ITableEngineRenderer {
	/**
	 * Maximum zoom level.
	 */
	private static readonly MAX_ZOOM_LEVEL: number = 5.0;

	/**
	 * Lookup for cell renderers by their name.
	 */
	private readonly _cellRendererLookup: Map<string, ICanvasCellRenderer> =
		new Map<string, ICanvasCellRenderer>();

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
	 * Border model to draw borders from.
	 */
	private _borderModel: IBorderModel;

	/**
	 * Reference to the table-engine.
	 */
	private _engine: TableEngine;

	/**
	 * Options of the table engine.
	 */
	private _options: ITableEngineOptions;

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
	private _repaintScheduler: Subject<void> = new Subject<void>();

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
	 * Registered listener to select start events on window.
	 */
	private _selectStartListener: (Event) => void;

	/**
	 * Registered listener to mouse up events.
	 */
	private _mouseUpListener: (MouseEvent) => void;

	/**
	 * Registered listener to double click events.
	 */
	private _doubleClickListener: (MouseEvent) => void;

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
	 * Registered listener for the on focus event.
	 */
	private _focusListener: (FocusEvent) => void;

	/**
	 * Registered listener for the on blur event.
	 */
	private _blurListener: (FocusEvent) => void;

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
	 * Context of the copy-handle drag start.
	 */
	private _copyHandleDragStart: IMouseDragContext | null = null;

	/**
	 * ID of the touch starting panning.
	 */
	private _startTouchID: number | null = null;

	/**
	 * ID of the second starting zooming via pinch gesture.
	 */
	private _secondTouchID: number | null = null;

	/**
	 * Context of the current panning of the workspace (using fingers).
	 */
	private _panningStart: ITouchPanContext | null = null;

	/**
	 * Context of the current zooming using touch (pinch gesture).
	 */
	private _touchZoomContext: ITouchZoomContext | null = null;

	/**
	 * The initially selected cell range of the current selection process (if in progress).
	 */
	private _initialSelectionRange: ICellRange | null = null;

	/**
	 * The last known mouse position.
	 */
	private _lastMousePosition: IPoint | null = null;

	/**
	 * Initial cell position of the copy handle drag.
	 */
	private _copyHandleInitial: IInitialPosition | null = null;

	/**
	 * Initial position of the resizing dragging process.
	 */
	private _resizingDragStart: IResizingDragStart | null = null;

	/**
	 * Current auto-scrolling state.
	 * Auto-scrolling is used when selecting and the mouse is outside viewport bounds.
	 */
	private _autoScrollContext: IAutoScrollContext | null = null;

	/**
	 * Names of cell renderers used in the last rendering cycle.
	 */
	private _lastUsedCellRenderers: Set<string> = new Set<string>();

	/**
	 * Current zoom level (1.0 = 100%).
	 * Max zoom level is 100% as zooming out may lead
	 * to bad table scrolling performance as we need
	 * to render a lot of cells.
	 */
	private _zoom: number = 1.0;

	/**
	 * Cell range of the last hovered cell (if any).
	 */
	private _lastHoveredCellRange: ICellRange | null = null;

	/**
	 * Overlays to display over the table.
	 */
	private _overlays: IOverlay[] = [];

	/**
	 * Container for overlay HTML elements.
	 */
	private _overlayContainer: HTMLElement;

	/**
	 * Whether to update all overlays after the next rendering cycle.
	 */
	private _updateOverlaysAfterRenderCycle: boolean = false;

	/**
	 * List of overlays to update after the next rendering cycle.
	 * If this list is empty, all available overlays will be updated.
	 */
	private _overlaysToUpdateAfterRenderCycle: IOverlay[] = [];

	/**
	 * Currently focused cell position (if any).
	 */
	private _focusedCellPosition: IInitialPosition | null = null;

	/**
	 * Value of the bodys user select style property before
	 * the selection scroll prevention is enabled.
	 */
	private _beforeSelectionScrollPreventionUserSelectPropertyValue: string =
		'';

	/**
	 * Whether the selection scroll prevention is currently enabled.
	 */
	private _selectionScrollPreventionEnabled: boolean = false;

	/**
	 * Whether the cursor has been set externally and not internally
	 * from within the canvas renderer.
	 */
	private _cursorSetExternally: boolean = false;

	/**
	 * Component responsible for the scrolling logic of the table.
	 */
	private _viewportScroller: IViewportScroller;

	/**
	 * Get the renderer-specific options.
	 */
	private get rendererOptions(): IRendererOptions {
		return this._options.renderer;
	}

	/**
	 * Cleanup the renderer when no more needed.
	 */
	public cleanup(): void {
		this._repaintScheduler.complete();
		this._resizeThrottleSubject.complete();

		this._unbindListeners();

		this._onCleanup.next();
		this._onCleanup.complete();

		// Cleanup DOM
		CanvasRenderer._clearContainerChildren(this._container);
	}

	/**
	 * Initialize the renderer with the given options on the passed HTML container.
	 * @param container to initialize renderer in
	 * @param engine reference to the table-engine
	 * @param options of the renderer
	 */
	public async initialize(
		container: HTMLElement,
		engine: TableEngine,
		options: ITableEngineOptions
	): Promise<void> {
		this._container = CanvasRenderer._createTableContainer(container);
		this._engine = engine;
		this._cellModel = engine.getCellModel();
		this._selectionModel = engine.getSelectionModel();
		this._borderModel = engine.getBorderModel();
		this._options = options;

		this._viewportScroller = new ViewportScroller(this._cellModel, this);

		this._cellModel
			.events()
			.pipe(takeUntil(this._onCleanup))
			.subscribe((event) => this._onCellModelEvent(event));

		this._initializeRenderingElements();
		this._bindListeners();

		this._initializeCellRenderers();
	}

	/**
	 * Create a container Element in which the canvas and html view will later be injected.
	 * @param parentContainer the container defined by the user
	 */
	private static _createTableContainer(
		parentContainer: HTMLElement
	): HTMLElement {
		const div = document.createElement('div');
		// full size in parent
		div.style.width = '100%';
		div.style.height = '100%';
		// Allow absolute positioning within the container
		div.style.position = 'relative';
		// replace possible global styles.
		div.style.padding = '0';
		div.style.border = '0';
		// clear other children in parentContainer.
		while (parentContainer.lastChild) {
			parentContainer.removeChild(parentContainer.lastChild);
		}
		parentContainer.appendChild(div);
		return div;
	}

	/**
	 * Called before cells are deleted.
	 * @param fromIndex from index (row or column) to be deleted
	 * @param count of rows/columns to be deleted
	 * @param isRow whether rows or columns are to be deleted
	 */
	private _onBeforeDeletingCells(
		fromIndex: number,
		count: number,
		isRow: boolean
	): void {
		this._cleanupViewportCacheBeforeDeletingCells(fromIndex, count, isRow);
	}

	/**
	 * Cleanup the viewport cache for cells that are currently in the viewport
	 * and are to be deleted.
	 * @param fromIndex start index to delete cells from (row/column)
	 * @param count of rows/columns to deleted
	 * @param isRow whether to delete rows or columns
	 */
	private _cleanupViewportCacheBeforeDeletingCells(
		fromIndex: number,
		count: number,
		isRow: boolean
	): void {
		this._doForCellAreaRange((range) => {
			// Collect all cells to be deleted and clear the viewport cache
			let rangeToBeDeleted: ICellRange;
			if (isRow) {
				rangeToBeDeleted = {
					startRow: Math.max(fromIndex, range.startRow),
					endRow: Math.min(fromIndex + count - 1, range.endRow),
					startColumn: range.startColumn,
					endColumn: range.endColumn,
				};
			} else {
				rangeToBeDeleted = {
					startRow: range.startRow,
					endRow: range.endRow,
					startColumn: Math.max(fromIndex, range.startColumn),
					endColumn: Math.min(fromIndex + count - 1, range.endColumn),
				};
			}

			if (
				rangeToBeDeleted.startRow > rangeToBeDeleted.endRow ||
				rangeToBeDeleted.startColumn > rangeToBeDeleted.endColumn
			) {
				return;
			}

			// Clear viewport cache
			this._cleanupCellViewportCachesForCellRange(
				rangeToBeDeleted,
				(cellRange) =>
					CellRangeUtil.contains(cellRange, rangeToBeDeleted)
			);
		});
	}

	/**
	 * Called when cells are hidden.
	 * @param indices of rows or columns to be hidden
	 * @param isRow whether rows or columns are hidden
	 */
	private _onHiddenCells(indices: number[], isRow: boolean): void {
		this._cleanupViewportCacheDueToHidingCells(indices, isRow);
	}

	/**
	 * Cleanup viewport caches of cells that are now hidden.
	 * @param indices of rows or columns to be hidden
	 * @param isRow whether rows or columns are hidden
	 */
	private _cleanupViewportCacheDueToHidingCells(
		indices: number[],
		isRow: boolean
	): void {
		// Collect all consecutive index ranges that have been hidden
		let firstIndex: number = -1;
		let lastIndex: number = -1;
		let indexRanges: IndexRange[] = [];
		for (const index of indices) {
			if (firstIndex === -1) {
				firstIndex = index;
				lastIndex = index;
			} else if (index === lastIndex + 1) {
				lastIndex = index;
			} else {
				indexRanges.push({ from: firstIndex, to: lastIndex });

				firstIndex = index;
				lastIndex = index;
			}
		}
		indexRanges.push({ from: firstIndex, to: lastIndex });

		// Transform index ranges to cell ranges
		const maxRowIndex: number = this._cellModel.getRowCount() - 1;
		const maxColumnIndex: number = this._cellModel.getColumnCount() - 1;
		const hiddenRanges: ICellRange[] = indexRanges.map((indexRange) => ({
			startRow: isRow ? indexRange.from : 0,
			endRow: isRow ? indexRange.to : maxRowIndex,
			startColumn: isRow ? 0 : indexRange.from,
			endColumn: isRow ? maxColumnIndex : indexRange.to,
		}));

		this._doForCellAreaRange((range) => {
			for (const hiddenRange of hiddenRanges) {
				const rangeToClean: ICellRange | null = CellRangeUtil.and(
					hiddenRange,
					range
				);
				if (!!rangeToClean) {
					this._cleanupCellViewportCachesForCellRange(
						rangeToClean,
						(cellRange) =>
							!this._cellModel.isRangeVisible(cellRange),
						true
					);
				}
			}
		});
	}

	/**
	 * Called on a cell model event.
	 * @param event that occurred
	 */
	private _onCellModelEvent(event: ICellModelEvent): void {
		if (event.type === CellModelEventType.BEFORE_DELETE) {
			const e: BeforeDeleteEvent = event as BeforeDeleteEvent;
			this._onBeforeDeletingCells(e.startIndex, e.count, e.isRow);
		} else if (event.type === CellModelEventType.HIDDEN) {
			const e: HiddenEvent = event as HiddenEvent;
			this._onHiddenCells(e.indices, e.isRow);
		}
	}

	/**
	 * Initialize all cell renderers.
	 */
	private _initializeCellRenderers(): void {
		for (const cellRenderer of this._cellRendererLookup.values()) {
			cellRenderer.initialize(this._engine);
		}
	}

	/**
	 * Request focus on the table.
	 */
	public requestFocus(): void {
		this._overlayContainer.focus();
	}

	/**
	 * Whether the table is currently focused.
	 */
	public isFocused(): boolean {
		return !!this._focusedCellPosition;
	}

	/**
	 * Bind listeners to the window or container.
	 */
	private _bindListeners(): void {
		// Listen for keyboard events
		this._keyDownListener = (event) => this._onKeyDown(event);
		this._overlayContainer.addEventListener(
			'keydown',
			this._keyDownListener
		);

		this._keyUpListener = (event) => this._onKeyUp(event);
		this._overlayContainer.addEventListener('keyup', this._keyUpListener);

		// Listen for mouse events
		this._wheelListener = (event) => this._onWheel(event);
		this._overlayContainer.addEventListener('wheel', this._wheelListener, {
			passive: false,
		});

		this._mouseDownListener = (event) => this._onMouseDown(event);
		this._overlayContainer.addEventListener(
			'mousedown',
			this._mouseDownListener
		);

		this._mouseMoveListener = (event) => this._onMouseMove(event);
		window.addEventListener('mousemove', this._mouseMoveListener);

		this._selectStartListener = (event) => this._onSelectStart(event);
		window.addEventListener('selectstart', this._selectStartListener);

		this._mouseUpListener = (event) => this._onMouseUp(event);
		window.addEventListener('mouseup', this._mouseUpListener);

		this._doubleClickListener = (event) => this._onDoubleClick(event);
		this._overlayContainer.addEventListener(
			'dblclick',
			this._doubleClickListener
		);

		// Listen for touch events
		this._touchStartListener = (event) => this._onTouchStart(event);
		this._overlayContainer.addEventListener(
			'touchstart',
			this._touchStartListener
		);

		this._touchMoveListener = (event) => this._onTouchMove(event);
		window.addEventListener('touchmove', this._touchMoveListener);

		this._touchEndListener = (event) => this._onTouchEnd(event);
		window.addEventListener('touchend', this._touchEndListener);

		// Listen for size changes on the container HTML element
		this._resizeObserver = new ResizeObserver((resizeEntries) =>
			this._onResize(resizeEntries)
		);
		this._resizeObserver.observe(this._container);

		// Listen for focus and blur events
		this._focusListener = (event) => this._onFocus(event);
		this._overlayContainer.addEventListener('focus', this._focusListener);

		this._blurListener = (event) => this._onBlur(event);
		this._overlayContainer.addEventListener('blur', this._blurListener);

		// Throttle resize events
		this._resizeThrottleSubject
			.asObservable()
			.pipe(
				takeUntil(this._onCleanup),
				throttleTime(
					this.rendererOptions.canvas.lazyRenderingThrottleDuration,
					asyncScheduler,
					{
						leading: false,
						trailing: true,
					}
				)
			)
			.subscribe(() => this._onContainerResized());

		// Repaint when necessary (for example on scrolling)
		this._repaintScheduler
			.asObservable()
			.pipe(
				takeUntil(this._onCleanup),
				throttleTime(
					this.rendererOptions.canvas.lazyRenderingThrottleDuration,
					asyncScheduler,
					{
						leading: false,
						trailing: true,
					}
				)
			)
			.subscribe(() => this._render());
	}

	/**
	 * Unbind listeners to the window or container.
	 */
	private _unbindListeners(): void {
		if (!!this._keyDownListener) {
			this._overlayContainer.removeEventListener(
				'keydown',
				this._keyDownListener
			);
		}
		if (!!this._keyUpListener) {
			this._overlayContainer.removeEventListener(
				'keyup',
				this._keyUpListener
			);
		}

		if (!!this._wheelListener) {
			this._overlayContainer.removeEventListener(
				'wheel',
				this._wheelListener
			);
		}
		if (!!this._mouseDownListener) {
			this._overlayContainer.removeEventListener(
				'mousedown',
				this._mouseDownListener
			);
		}
		if (!!this._mouseMoveListener) {
			window.removeEventListener('mousemove', this._mouseMoveListener);
		}
		if (!!this._selectStartListener) {
			window.removeEventListener(
				'selectstart',
				this._selectStartListener
			);
		}
		if (!!this._mouseUpListener) {
			window.removeEventListener('mouseup', this._mouseUpListener);
		}
		if (!!this._doubleClickListener) {
			this._overlayContainer.removeEventListener(
				'dblclick',
				this._doubleClickListener
			);
		}

		if (!!this._touchStartListener) {
			this._overlayContainer.removeEventListener(
				'touchstart',
				this._touchStartListener
			);
		}
		if (!!this._touchMoveListener) {
			window.removeEventListener('touchmove', this._touchMoveListener);
		}
		if (!!this._touchEndListener) {
			window.removeEventListener('touchend', this._touchEndListener);
		}

		if (!!this._resizeObserver) {
			this._resizeObserver.disconnect();
		}

		if (!!this._focusListener) {
			this._overlayContainer.removeEventListener(
				'focus',
				this._focusListener
			);
		}
		if (!!this._blurListener) {
			this._overlayContainer.removeEventListener(
				'blur',
				this._blurListener
			);
		}
	}

	/**
	 * Called on a focus event (focus received).
	 * @param event that occurred
	 */
	private _onFocus(event: FocusEvent): void {
		// Focus initial cell
		const primary: ISelection | null = this._selectionModel.getPrimary();
		if (!!primary) {
			this._updateFocusedCell(primary.initial);
		}

		this._repaintScheduler.next();
	}

	/**
	 * Called on a blur event (focus lost).
	 * @param event that occurred
	 */
	private _onBlur(event: FocusEvent): void {
		this._updateFocusedCell(null); // Blur cell focus

		this._repaintScheduler.next();
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
			const isOverVerticalScrollBar: boolean =
				CanvasRenderer._isMouseOverScrollBar(
					x,
					y,
					true,
					this._lastRenderingContext.scrollBar.vertical
				);
			const isOverHorizontalScrollBar: boolean =
				CanvasRenderer._isMouseOverScrollBar(
					x,
					y,
					false,
					this._lastRenderingContext.scrollBar.horizontal
				);
			const resizingInfo: IResizerInfo = this._isMouseOverResizingSpace(
				x,
				y
			);
			if (isOverVerticalScrollBar || isOverHorizontalScrollBar) {
				const scrollVertically: boolean = isOverVerticalScrollBar;

				this._scrollBarDragStart = {
					scrollHorizontally: !scrollVertically,
					scrollVertically,
					startX: x,
					startY: y,
					offsetFromScrollBarStart: scrollVertically
						? this._lastRenderingContext.scrollBar.vertical.y - y
						: this._lastRenderingContext.scrollBar.horizontal.x - x,
					startScrollOffset: {
						...this._viewportScroller.getScrollOffset(),
					},
				};
			} else if (
				CanvasRenderer._isMouseOverCopyHandle(
					x,
					y,
					this._lastRenderingContext
				)
			) {
				this._copyHandleDragStart = {
					startX: x,
					startY: y,
					startScrollOffset: {
						...this._viewportScroller.getScrollOffset(),
					},
				};

				this._initialSelectionRange =
					this._selectionModel.getPrimary().range;
				this._copyHandleInitial = {
					row: this._selectionModel.getPrimary().initial.row,
					column: this._selectionModel.getPrimary().initial.column,
				};
			} else if (
				this._options.renderer.canvas.rowColumnResizing.allowResizing &&
				resizingInfo.isMouseOver
			) {
				this._resizingDragStart = {
					startX: x,
					startY: y,
					currentX: x,
					currentY: y,
					info: resizingInfo,
				};
			} else if (this._isInMouseDragMode) {
				this._mouseDragStart = {
					startX: x,
					startY: y,
					startScrollOffset: {
						...this._viewportScroller.getScrollOffset(),
					},
				};
			} else {
				const range: ICellRange = this._getCellRangeAtPoint(x, y);

				// Send event to cell renderer for the cell on the current position
				const preventDefault: boolean = this._sendEventForPosition(
					range.startRow,
					range.startColumn,
					(listener) => listener.onMouseDown,
					(e) => {
						const mouseEvent: ICellRendererMouseEvent =
							e as ICellRendererMouseEvent;
						mouseEvent.offset = { x, y };
						mouseEvent.originalEvent = event;
						return mouseEvent;
					}
				);
				if (!preventDefault) {
					this._initialSelectionRange = range;

					// Update selection (if changed)
					const updateNotNecessary: boolean =
						this._selectionModel.getSelections().length === 1 &&
						CellRangeUtil.equals(
							this._selectionModel.getPrimary().range,
							range
						);
					if (!updateNotNecessary) {
						this._updateCurrentSelection(
							this._initialSelectionRange,
							{
								row: this._initialSelectionRange.startRow,
								column: this._initialSelectionRange.startColumn,
							},
							!event.ctrlKey,
							true,
							false
						);
					}
				}
			}
		}

		this._updateSelectionScrollPrevention();
	}

	/**
	 * Send a event to the event listener given by the passed supplier for the cell
	 * with the given row and column.
	 * @param row of the cell to send event for
	 * @param column of the cell to send event for
	 * @param eventListenerSupplier to get event listener with
	 * @param eventPopulator populator for the event
	 * @returns whether the default action should be prevented
	 */
	private _sendEventForPosition(
		row: number,
		column: number,
		eventListenerSupplier: CellRendererEventListenerFunctionSupplier,
		eventPopulator: (event: ICellRendererEvent) => ICellRendererEvent
	): boolean {
		if (
			row >= this._cellModel.getRowCount() ||
			column >= this._cellModel.getColumnCount()
		) {
			return false;
		}

		const cell: ICell = this._cellModel.getCell(row, column, true);
		const listener: ICellRendererEventListener = this._cellRendererLookup
			.get(cell.rendererName)
			.getEventListener();
		if (!!listener) {
			const listenerFunction:
				| CellRendererEventListenerFunction
				| null
				| undefined = eventListenerSupplier(listener);
			if (!!listenerFunction) {
				// Create the event
				const event: ICellRendererEvent = eventPopulator({
					cell,
					preventDefault: false,
				});

				listenerFunction(event);

				return event.preventDefault;
			}
		}

		return false;
	}

	/**
	 * Get the cell range at the given point on the viewport.
	 * @param x offset
	 * @param y offset
	 * @param allowOverflow whether to allow the given x any y coordinate to overflow the current viewport (method will never return null)
	 */
	private _getCellRangeAtPoint(
		x: number,
		y: number,
		allowOverflow: boolean = true
	): ICellRange | null {
		const fixedAreaInfos = this.getFixedAreaInfos();
		const viewportSize = this.getViewportSize();
		const currentScrollOffset = this._viewportScroller.getScrollOffset();

		if (!allowOverflow) {
			// Check if we are in viewport bounds -> if not return null
			if (
				x < 0 ||
				y < 0 ||
				x > viewportSize.width ||
				y > viewportSize.height
			) {
				return null;
			}
		}

		const isInTopFixedArea: boolean = y <= fixedAreaInfos.top.size;
		const isInLeftFixedArea: boolean = x <= fixedAreaInfos.left.size;
		const isInBottomFixedArea: boolean =
			y > viewportSize.height - fixedAreaInfos.bottom.size;
		const isInRightFixedArea: boolean =
			x > viewportSize.width - fixedAreaInfos.right.size;

		if (isInBottomFixedArea) {
			const offsetFromBottom = viewportSize.height - y;
			y = fixedAreaInfos.bottom.endOffset - offsetFromBottom;
		} else if (!isInTopFixedArea) {
			y += currentScrollOffset.y;
		}

		if (isInRightFixedArea) {
			const offsetFromRight = viewportSize.width - x;
			x = fixedAreaInfos.right.endOffset - offsetFromRight;
		} else if (!isInLeftFixedArea) {
			x += currentScrollOffset.x;
		}

		const cell = this._cellModel.getCellAtOffset(x, y);
		if (!!cell) {
			return {
				startRow: cell.range.startRow,
				endRow: cell.range.endRow,
				startColumn: cell.range.startColumn,
				endColumn: cell.range.endColumn,
			};
		} else {
			return CellRange.fromSingleRowColumn(
				this._cellModel.getRowAtOffset(y),
				this._cellModel.getColumnAtOffset(x)
			);
		}
	}

	/**
	 * Update the current selection to the passed cell range.
	 * @param range to update current selection to
	 * @param initial to update current selection to
	 * @param clear whether to clear the current selection(s)
	 * @param push whether to add or update the current primary selection
	 * @param end whether the selection will no more change (for example on mouse move end)
	 */
	private _updateCurrentSelection(
		range: ICellRange,
		initial: IInitialPosition,
		clear: boolean,
		push: boolean,
		end: boolean
	): void {
		let repaint: boolean = false;

		if (clear) {
			this._selectionModel.clear();
			repaint = true;
		}

		if (push) {
			this._selectionModel.addSelection(
				{
					range,
					initial,
				},
				true,
				end
			);
			repaint = true;
		} else {
			// Only change and validate range of current primary selection
			const primary = this._selectionModel.getPrimary();
			if (!primary) {
				return;
			}

			if (
				this._selectionModel.modifySelection(
					primary,
					range,
					initial,
					true,
					end
				)
			) {
				repaint = true;
			}
		}

		if (end) {
			const primary: ISelection = this._selectionModel.getPrimary();
			this._updateFocusedCell(primary.initial);
		}

		if (repaint) {
			this._repaintScheduler.next();
		}
	}

	/**
	 * Get the mouse events offset on the canvas.
	 * @param event to get offset for
	 */
	private _getMouseOffset(event: MouseEvent | Touch): [number, number] {
		const rect = this._canvasElement.getBoundingClientRect();

		return [
			(event.clientX - rect.left) / this._zoom,
			(event.clientY - rect.top) / this._zoom,
		];
	}

	/**
	 * Check if the given mouse position signals being over the given scroll bar.
	 * @param x position of the mouse
	 * @param y position of the mouse
	 * @param vertical whether to check for vertical or horizontal scroll bar
	 * @param ctx of the scroll bar on a axis (horizontal, vertical)
	 */
	private static _isMouseOverScrollBar(
		x: number,
		y: number,
		vertical: boolean,
		ctx: IScrollBarAxisRenderContext
	): boolean {
		if (!ctx) {
			return false;
		}

		const width: number = vertical ? ctx.size : ctx.length;
		const height: number = vertical ? ctx.length : ctx.size;

		return (
			x >= ctx.x &&
			x <= ctx.x + width &&
			y >= ctx.y &&
			y <= ctx.y + height
		);
	}

	/**
	 * Check if the mouse is over the copy handle.
	 * @param x position of the mouse
	 * @param y position of the mouse
	 * @param ctx the current rendering context
	 */
	private static _isMouseOverCopyHandle(
		x: number,
		y: number,
		ctx: IRenderContext
	): boolean {
		if (!ctx || !ctx.selection) {
			return false;
		}

		// First and foremost make sure that the copy handle exists before checking
		if (!ctx.selection.copyHandle.isRendered) {
			return false;
		}

		// Check if mouse is over copy handle
		return (
			x >= ctx.selection.copyHandle.bounds.left &&
			x <=
				ctx.selection.copyHandle.bounds.left +
					ctx.selection.copyHandle.bounds.width &&
			y >= ctx.selection.copyHandle.bounds.top &&
			y <=
				ctx.selection.copyHandle.bounds.top +
					ctx.selection.copyHandle.bounds.height
		);
	}

	/**
	 * Check whether the mouse is over a resizing space in rows or columns.
	 * @param x position of the mouse
	 * @param y position of the mouse
	 */
	private _isMouseOverResizingSpace(x: number, y: number): IResizerInfo {
		const targetRange: ICellRange = this._getCellRangeAtPoint(x, y);

		// Check whether we are allowed to row/column resize at this point
		const isInRowCount: boolean =
			targetRange.startRow <
			this._options.renderer.canvas.rowColumnResizing.rowCount;
		const isInColumnCount: boolean =
			targetRange.startColumn <
			this._options.renderer.canvas.rowColumnResizing.columnCount;

		if (!isInRowCount && !isInColumnCount) {
			return { isMouseOver: false };
		}

		// Check bounds of the targetRange
		const fixedAreaInfos = this.getFixedAreaInfos();
		const viewportSize = this.getViewportSize();
		const bounds: IRectangle = this._calculateCellRangeBoundsInViewport(
			targetRange,
			viewportSize,
			fixedAreaInfos
		);

		// Determine offsets from spaces between rows or columns
		const leftXOffset: number = bounds.left;
		const rightXOffset: number = bounds.left + bounds.width;

		const topYOffset: number = bounds.top;
		const bottomYOffset: number = bounds.top + bounds.height;

		const leftXDiff: number = x - leftXOffset;
		const rightXDiff: number = rightXOffset - x;

		const topYDiff: number = y - topYOffset;
		const bottomYDiff: number = bottomYOffset - y;

		// Determine whether offsets satisfy a certain threshold to count as space between rows/columns
		const resizerSize: number =
			this._options.renderer.canvas.rowColumnResizing.resizerSize;

		let column: number = -1;
		if (isInRowCount) {
			if (rightXDiff <= resizerSize) {
				column = targetRange.endColumn;
			} else if (leftXDiff <= resizerSize) {
				column = targetRange.startColumn - 1;
			}
		}

		let row: number = -1;
		if (isInColumnCount) {
			if (bottomYDiff <= resizerSize) {
				row = targetRange.endRow;
			} else if (topYDiff <= resizerSize) {
				row = targetRange.startRow - 1;
			}
		}

		return {
			isMouseOver: row !== -1 || column != -1,
			overRow: row !== -1,
			index: row !== -1 ? row : column,
		};
	}

	resetCursor(): void {
		this._resetCursor();
		this._cursorSetExternally = false;
	}

	setCursor(cursorName: string): void {
		this._setCursor(cursorName);
		this._cursorSetExternally = true;
	}

	/**
	 * Set the cursor to show.
	 * @param cursor name to show
	 */
	private _setCursor(cursor: string): void {
		if (!this._cursorSetExternally) {
			this._container.style.cursor = cursor;
		}
	}

	/**
	 * Reset the cursor to show.
	 */
	private _resetCursor(): void {
		if (
			!this._cursorSetExternally &&
			this._container.style.cursor !== 'auto'
		) {
			this._container.style.cursor = 'auto';
		}
	}

	/**
	 * Called when a selection is started on window.
	 * @param event that occurred
	 */
	private _onSelectStart(event: Event): void {
		if (this._isDragging()) {
			// Prevent text selection outside of table when currently dragging something in the table
			event.preventDefault();
		}
	}

	/**
	 * Called when a mouse move event on the canvas has been registered.
	 * @param event that occurred
	 */
	private _onMouseMove(event: MouseEvent): void {
		if (!this._lastRenderingContext) {
			return;
		}

		const [x, y] = this._getMouseOffset(event);
		const isMainButtonDown: boolean = event.buttons === 1;

		let isHandled: boolean = false;
		let resetCursor: boolean = true;
		if (isMainButtonDown) {
			const isScrollBarDragging: boolean = !!this._scrollBarDragStart;
			const isMouseDragging: boolean = !!this._mouseDragStart;
			const isSelectionDragging: boolean = !!this._initialSelectionRange;
			const isCopyHandleDragging: boolean = !!this._copyHandleDragStart;
			const isResizerDragging: boolean = !!this._resizingDragStart;

			if (isScrollBarDragging) {
				this._onScrollBarMove(x, y, this._scrollBarDragStart);
				isHandled = true;
			} else if (isCopyHandleDragging) {
				// Determine direction to extend in (based on the current x and y coordinates and their difference to the initial selection bounds)
				const initialSelectionBounds: IRectangle =
					this._cellModel.getBounds(this._initialSelectionRange);
				const fixedAreaInfos = this.getFixedAreaInfos();
				const currentScrollOffset =
					this._viewportScroller.getScrollOffset();
				if (
					this._initialSelectionRange.startRow >
					fixedAreaInfos.top.count
				) {
					initialSelectionBounds.top -= currentScrollOffset.y;
				}
				if (
					this._initialSelectionRange.startColumn >
					fixedAreaInfos.left.count
				) {
					initialSelectionBounds.left -= currentScrollOffset.x;
				}

				let xDiff: number = 0;
				if (x < initialSelectionBounds.left) {
					xDiff = x - initialSelectionBounds.left;
				} else if (
					x >
					initialSelectionBounds.left + initialSelectionBounds.width
				) {
					xDiff =
						x -
						(initialSelectionBounds.left +
							initialSelectionBounds.width);
				}

				let yDiff: number = 0;
				if (y < initialSelectionBounds.top) {
					yDiff = y - initialSelectionBounds.top;
				} else if (
					y >
					initialSelectionBounds.top + initialSelectionBounds.height
				) {
					yDiff =
						y -
						(initialSelectionBounds.top +
							initialSelectionBounds.height);
				}

				// Check whether to extend horizontally or vertically
				const extendHorizontally: boolean =
					Math.abs(xDiff) > Math.abs(yDiff);

				// Extend selection, but only to the left, right, top and bottom and not diagonally!
				const targetRange: ICellRange = this._getCellRangeAtPoint(x, y);

				// Modify target range
				if (extendHorizontally) {
					targetRange.startRow = this._initialSelectionRange.startRow;
					targetRange.endRow = this._initialSelectionRange.endRow;

					if (xDiff > 0) {
						// Extend to right
						targetRange.startColumn =
							this._initialSelectionRange.startColumn;
					} else {
						// Extend to left
						targetRange.endColumn =
							this._initialSelectionRange.endColumn;
					}
				} else {
					targetRange.startColumn =
						this._initialSelectionRange.startColumn;
					targetRange.endColumn =
						this._initialSelectionRange.endColumn;

					if (yDiff > 0) {
						// Extend to bottom
						targetRange.startRow =
							this._initialSelectionRange.startRow;
					} else {
						// Extend to top
						targetRange.endRow = this._initialSelectionRange.endRow;
					}
				}

				this._updateCurrentSelection(
					{
						startRow: Math.min(
							this._initialSelectionRange.startRow,
							targetRange.startRow
						),
						endRow: Math.max(
							this._initialSelectionRange.endRow,
							targetRange.endRow
						),
						startColumn: Math.min(
							this._initialSelectionRange.startColumn,
							targetRange.startColumn
						),
						endColumn: Math.max(
							this._initialSelectionRange.endColumn,
							targetRange.endColumn
						),
					},
					{
						row: this._copyHandleInitial.row,
						column: this._copyHandleInitial.column,
					},
					false,
					false,
					false
				);

				// Initialize automatic scrolling when out of viewport bounds with the mouse
				const viewPortBounds: IRectangle =
					this._lastRenderingContext.viewPort;
				const outOfViewPortBoundsX: boolean =
					x < 0 || x > viewPortBounds.width;
				const outOfViewPortBoundsY: boolean =
					y < 0 || y > viewPortBounds.height;
				if (outOfViewPortBoundsX || outOfViewPortBoundsY) {
					this._updateAutoScrolling(
						outOfViewPortBoundsX
							? x < 0
								? x
								: x - viewPortBounds.width
							: 0,
						outOfViewPortBoundsY
							? y < 0
								? y
								: y - viewPortBounds.height
							: 0,
						0
					);
				} else {
					this._stopAutoScrolling();
				}

				resetCursor = false; // Do not change the copy-handle cursor
				isHandled = true;
			} else if (isResizerDragging) {
				this._resizingDragStart.currentX = x;
				this._resizingDragStart.currentY = y;

				this._repaintScheduler.next(); // Schedule repaint to render the visualization of the resizing process

				isHandled = true;
			} else if (isMouseDragging) {
				this._onViewPortMove(x, y, this._mouseDragStart);
				isHandled = true;
			} else if (isSelectionDragging) {
				// Extend selection
				const targetRange: ICellRange = this._getCellRangeAtPoint(x, y);

				this._updateCurrentSelection(
					{
						startRow: Math.min(
							this._initialSelectionRange.startRow,
							targetRange.startRow
						),
						endRow: Math.max(
							this._initialSelectionRange.endRow,
							targetRange.endRow
						),
						startColumn: Math.min(
							this._initialSelectionRange.startColumn,
							targetRange.startColumn
						),
						endColumn: Math.max(
							this._initialSelectionRange.endColumn,
							targetRange.endColumn
						),
					},
					{
						row: this._initialSelectionRange.startRow,
						column: this._initialSelectionRange.startColumn,
					},
					false,
					false,
					false
				);

				// Initialize automatic scrolling when out of viewport bounds with the mouse
				const viewPortBounds: IRectangle =
					this._lastRenderingContext.viewPort;
				const outOfViewPortBoundsX: boolean =
					x < 0 || x > viewPortBounds.width;
				const outOfViewPortBoundsY: boolean =
					y < 0 || y > viewPortBounds.height;
				if (outOfViewPortBoundsX || outOfViewPortBoundsY) {
					this._updateAutoScrolling(
						outOfViewPortBoundsX
							? x < 0
								? x
								: x - viewPortBounds.width
							: 0,
						outOfViewPortBoundsY
							? y < 0
								? y
								: y - viewPortBounds.height
							: 0,
						0
					);
				} else {
					this._stopAutoScrolling();
				}

				isHandled = true;
			}
		} else {
			if (
				CanvasRenderer._isMouseOverCopyHandle(
					x,
					y,
					this._lastRenderingContext
				)
			) {
				this._setCursor('crosshair');
				resetCursor = false;
			} else if (
				this._options.renderer.canvas.rowColumnResizing.allowResizing
			) {
				const resizingInfo: IResizerInfo =
					this._isMouseOverResizingSpace(x, y);
				if (resizingInfo.isMouseOver) {
					this._setCursor(
						resizingInfo.overRow ? 'row-resize' : 'col-resize'
					);
					resetCursor = false;
				}
			}
		}

		if (resetCursor) {
			this._resetCursor();
		}

		if (!isHandled) {
			// Send event to cell renderer for the cell on the current position
			const range: ICellRange | null = this._getCellRangeAtPoint(
				x,
				y,
				false
			);
			if (!!range) {
				if (
					!!this._lastHoveredCellRange &&
					!CellRangeUtil.equals(range, this._lastHoveredCellRange)
				) {
					// Send mouse out event
					this._sendEventForPosition(
						this._lastHoveredCellRange.startRow,
						this._lastHoveredCellRange.startColumn,
						(listener) => listener.onMouseOut,
						(e) => {
							const mouseEvent: ICellRendererMouseEvent =
								e as ICellRendererMouseEvent;
							mouseEvent.originalEvent = event;
							return mouseEvent;
						}
					);
				}

				this._lastHoveredCellRange = range;
				this._sendEventForPosition(
					range.startRow,
					range.startColumn,
					(listener) => listener.onMouseMove,
					(e) => {
						const mouseEvent: ICellRendererMouseEvent =
							e as ICellRendererMouseEvent;
						mouseEvent.offset = { x, y };
						mouseEvent.originalEvent = event;
						return mouseEvent;
					}
				);
			} else {
				if (!!this._lastHoveredCellRange) {
					// Send mouse out event
					this._sendEventForPosition(
						this._lastHoveredCellRange.startRow,
						this._lastHoveredCellRange.startColumn,
						(listener) => listener.onMouseOut,
						(e) => {
							const mouseEvent: ICellRendererMouseEvent =
								e as ICellRendererMouseEvent;
							mouseEvent.originalEvent = event;
							return mouseEvent;
						}
					);
				}
			}
		}

		this._lastMousePosition = { x, y };
	}

	/**
	 * Update or start automatic scrolling.
	 * @param xDiff horizontal offset from the viewport bounds
	 * @param yDiff vertical offset from the viewport bounds
	 * @param acceleration to apply
	 */
	private _updateAutoScrolling(
		xDiff: number,
		yDiff: number,
		acceleration: number
	): void {
		if (!!this._autoScrollContext) {
			this._autoScrollContext.xDiff = xDiff;
			this._autoScrollContext.yDiff = yDiff;
		} else {
			this._autoScrollContext = {
				animationFrameID: window.requestAnimationFrame((timestamp) =>
					this._autoScrollStep(
						timestamp,
						this._autoScrollContext.lastTimestamp
					)
				),
				lastTimestamp: window.performance.now(),
				xDiff: xDiff,
				yDiff: yDiff,
				acceleration,
			};
		}
	}

	/**
	 * Step for auto scrolling.
	 * This will scroll by a small amount in the current auto-scrolling direction.
	 * @param timestamp the current timestamp
	 * @param oldTimestamp the last timestamp
	 */
	private _autoScrollStep(timestamp: number, oldTimestamp: number): void {
		const diff: number = timestamp - oldTimestamp;
		this._autoScrollContext.lastTimestamp = timestamp;

		const baseOffsetToScroll =
			this.rendererOptions.canvas.selection.autoScrollingSpeed *
			(diff / 1000);

		const xScrollDiff: number =
			this._autoScrollContext.xDiff * baseOffsetToScroll;
		const yScrollDiff: number =
			this._autoScrollContext.yDiff * baseOffsetToScroll;

		// Accelerate (or slow)
		if (this._autoScrollContext.xDiff > 0) {
			this._autoScrollContext.xDiff = Math.max(
				this._autoScrollContext.xDiff +
					(this._autoScrollContext.acceleration * diff) / 1000,
				0
			);
		} else {
			this._autoScrollContext.xDiff = Math.min(
				this._autoScrollContext.xDiff -
					(this._autoScrollContext.acceleration * diff) / 1000,
				0
			);
		}
		if (this._autoScrollContext.yDiff > 0) {
			this._autoScrollContext.yDiff = Math.max(
				this._autoScrollContext.yDiff +
					(this._autoScrollContext.acceleration * diff) / 1000,
				0
			);
		} else {
			this._autoScrollContext.yDiff = Math.min(
				this._autoScrollContext.yDiff -
					(this._autoScrollContext.acceleration * diff) / 1000,
				0
			);
		}

		const currentScrollOffset = this._viewportScroller.getScrollOffset();
		if (
			this._scrollTo(
				currentScrollOffset.x + xScrollDiff,
				currentScrollOffset.y + yScrollDiff
			)
		) {
			this._repaintScheduler.next();
		}

		// Update selection extending when currently dragging selection
		const isSelectionDragging: boolean = !!this._initialSelectionRange;
		if (isSelectionDragging) {
			const targetRange: ICellRange = this._getCellRangeAtPoint(
				this._lastMousePosition.x,
				this._lastMousePosition.y
			);

			this._updateCurrentSelection(
				{
					startRow: Math.min(
						this._initialSelectionRange.startRow,
						targetRange.startRow
					),
					endRow: Math.max(
						this._initialSelectionRange.endRow,
						targetRange.endRow
					),
					startColumn: Math.min(
						this._initialSelectionRange.startColumn,
						targetRange.startColumn
					),
					endColumn: Math.max(
						this._initialSelectionRange.endColumn,
						targetRange.endColumn
					),
				},
				{
					row: this._initialSelectionRange.startRow,
					column: this._initialSelectionRange.startColumn,
				},
				false,
				false,
				false
			);
		}

		// Schedule next animation frame
		if (
			this._autoScrollContext.xDiff !== 0 ||
			this._autoScrollContext.yDiff !== 0
		) {
			this._autoScrollContext.animationFrameID =
				window.requestAnimationFrame((timestamp) =>
					this._autoScrollStep(
						timestamp,
						this._autoScrollContext.lastTimestamp
					)
				);
		} else {
			this._stopAutoScrolling();
		}
	}

	/**
	 * Stop automatic scrolling.
	 */
	private _stopAutoScrolling(): void {
		if (!!this._autoScrollContext) {
			window.cancelAnimationFrame(
				this._autoScrollContext.animationFrameID
			);

			this._autoScrollContext = null;
		}
	}

	/**
	 * Called when the viewport is dragged and should be moved (scroll adjustment).
	 * @param x the new x position
	 * @param y the new y position
	 * @param start of the drag
	 */
	private _onViewPortMove(
		x: number,
		y: number,
		start: IMouseDragContext
	): void {
		if (
			this._scrollTo(
				start.startScrollOffset.x + (start.startX - x),
				start.startScrollOffset.y + (start.startY - y)
			)
		) {
			this._repaintScheduler.next();
		}
	}

	/**
	 * Called when a scrollbar should be moved.
	 * @param x the new x position
	 * @param y the new y position
	 * @param start of the scrollbar drag
	 */
	private _onScrollBarMove(
		x: number,
		y: number,
		start: IScrollBarDragContext
	): void {
		const options = this._options.renderer.canvas.scrollBar;
		const drawOverFixedAreas = options.drawOverFixedAreas;

		const viewportSize = this.getViewportSize();
		const fixedAreaInfos = this.getFixedAreaInfos();
		const scrollableViewportSize: ISize = {
			width:
				viewportSize.width -
				fixedAreaInfos.left.size -
				fixedAreaInfos.right.size,
			height:
				viewportSize.height -
				fixedAreaInfos.top.size -
				fixedAreaInfos.bottom.size,
		};
		const scrollableTableSize: ISize = {
			width:
				this._cellModel.getWidth() -
				fixedAreaInfos.left.size -
				fixedAreaInfos.right.size,
			height:
				this._cellModel.getHeight() -
				fixedAreaInfos.top.size -
				fixedAreaInfos.bottom.size,
		};
		const tableSize: ISize = {
			width: this._cellModel.getWidth(),
			height: this._cellModel.getHeight(),
		};
		const scrollBarTableSize: ISize = {
			width: drawOverFixedAreas
				? tableSize.width
				: scrollableTableSize.width,
			height: drawOverFixedAreas
				? tableSize.height
				: scrollableTableSize.height,
		};
		const scrollBarViewportSize: ISize = {
			width: drawOverFixedAreas
				? viewportSize.width
				: scrollableViewportSize.width,
			height: drawOverFixedAreas
				? viewportSize.height
				: scrollableViewportSize.height,
		};

		const currentScrollOffset = this._viewportScroller.getScrollOffset();
		const updatedScrollOffset: IPoint = {
			...currentScrollOffset,
		};
		if (start.scrollVertically) {
			let startY = start.startY;
			if (!drawOverFixedAreas) {
				// Normalize x and y coordinates for fixed rows/columns
				y -= fixedAreaInfos.top.size;
				startY -= fixedAreaInfos.top.size;
			}

			const curY = startY + (y - startY) + start.offsetFromScrollBarStart;
			const maxY =
				scrollBarViewportSize.height -
				this._lastRenderingContext.scrollBar.vertical.length;

			updatedScrollOffset.y =
				(curY / maxY) *
				(scrollBarTableSize.height - scrollBarViewportSize.height);
		}
		if (start.scrollHorizontally) {
			let startX = start.startX;
			if (!drawOverFixedAreas) {
				// Normalize x and y coordinates for fixed rows/columns
				x -= fixedAreaInfos.left.size;
				startX -= fixedAreaInfos.left.size;
			}

			const curX = startX + (x - startX) + start.offsetFromScrollBarStart;
			const maxX =
				scrollBarViewportSize.width -
				this._lastRenderingContext.scrollBar.horizontal.length;

			updatedScrollOffset.x =
				(curX / maxX) *
				(scrollBarTableSize.width - scrollBarViewportSize.width);
		}

		if (
			this._viewportScroller.scrollToOffset(
				updatedScrollOffset.x,
				updatedScrollOffset.y
			)
		) {
			this._updateOverlays();
			this._repaintScheduler.next();
		}
	}

	/**
	 * Will estimate the preferred row/column size if possible
	 * using the cell renderers.
	 * @param index of the row/column to estimate size of
	 * @param isRow whether the index is a row or a column
	 */
	private _estimatePreferredRowColumnSize(
		index: number,
		isRow: boolean
	): IPreferredRowColumnSizeResult {
		const indexHidden: boolean = isRow
			? this._cellModel.isRowHidden(index)
			: this._cellModel.isColumnHidden(index);
		if (indexHidden) {
			return {
				success: false,
			};
		}

		const range: ICellRange = isRow
			? {
					startRow: index,
					endRow: index,
					startColumn: 0,
					endColumn: this._cellModel.getColumnCount() - 1,
			  }
			: {
					startRow: 0,
					endRow: this._cellModel.getRowCount() - 1,
					startColumn: index,
					endColumn: index,
			  };
		const cells: ICell[] = this._cellModel.getCells(range, {
			includeHidden: false,
		});

		let maxEstimate: number = -1;
		for (const cell of cells) {
			const onlySpansIndex: boolean =
				CellRangeUtil.isSingleRowColumnRange(cell.range) ||
				(isRow
					? cell.range.startRow === index &&
					  cell.range.endRow === index
					: cell.range.startColumn === index &&
					  cell.range.endColumn === index);

			if (onlySpansIndex) {
				const cellRenderer: ICanvasCellRenderer =
					this._getCellRendererForName(cell.rendererName);
				const preferredSize: ISize | null =
					cellRenderer.estimatePreferredSize(cell);
				if (!!preferredSize) {
					const estimate: number = isRow
						? preferredSize.height
						: preferredSize.width;
					if (maxEstimate < estimate) {
						maxEstimate = estimate;
					}
				}
			}
		}

		if (maxEstimate < 0) {
			return { success: false };
		} else {
			return {
				success: true,
				preferredSize: maxEstimate,
			};
		}
	}

	private _performDoubleClickResizerAction(
		index: number,
		isRow: boolean
	): void {
		const options: IResizerDoubleClickActionOptions =
			this._options.renderer.canvas.rowColumnResizing.doubleClickAction;

		const allowDefaultActions = options.custom(index, isRow);
		if (!allowDefaultActions) {
			return;
		}

		const useEstimate = options.useEstimate;
		const resetRowSize = options.resetRowSize;
		const resetColumnSize = options.resetColumnSize;

		let resetSize = false;
		if (useEstimate) {
			const estimationResult: IPreferredRowColumnSizeResult =
				this._estimatePreferredRowColumnSize(index, isRow);

			if (estimationResult.success) {
				if (isRow) {
					this._cellModel.resizeRows(
						[index],
						Math.max(
							estimationResult.preferredSize,
							this._options.renderer.canvas.rowColumnResizing
								.minRowSize
						)
					);
				} else {
					this._cellModel.resizeColumns(
						[index],
						Math.max(
							estimationResult.preferredSize,
							this._options.renderer.canvas.rowColumnResizing
								.minColumnSize
						)
					);
				}
			} else {
				resetSize = true; // Reset size to the fixed options instead
			}
		}

		if (resetSize) {
			// Resize given row/column to the given reset size
			if (isRow) {
				this._cellModel.resizeRows([index], resetRowSize);
			} else {
				this._cellModel.resizeColumns([index], resetColumnSize);
			}
		}
	}

	/**
	 * Called when a double click event on the canvas has been registered.
	 * @param event that occurred
	 */
	private _onDoubleClick(event: MouseEvent): void {
		if (!this._lastRenderingContext) {
			return;
		}

		const [x, y] = this._getMouseOffset(event);

		let sendEventToCellListener: boolean = true;

		const isResizingEnabled: boolean =
			this._options.renderer.canvas.rowColumnResizing.allowResizing;
		if (isResizingEnabled) {
			const resizerInfo: IResizerInfo = this._isMouseOverResizingSpace(
				x,
				y
			);
			if (resizerInfo.isMouseOver) {
				// Double click on resizer detected
				this._performDoubleClickResizerAction(
					resizerInfo.index,
					resizerInfo.overRow
				);

				sendEventToCellListener = false;
			}
		}

		if (sendEventToCellListener) {
			const range: ICellRange | null = this._getCellRangeAtPoint(
				x,
				y,
				false
			);
			if (!!range) {
				this._sendEventForPosition(
					range.startRow,
					range.startColumn,
					(listener) => listener.onDoubleClick,
					(e) => {
						const mouseEvent: ICellRendererMouseEvent =
							e as ICellRendererMouseEvent;
						mouseEvent.offset = { x, y };
						mouseEvent.originalEvent = event;
						return mouseEvent;
					}
				);
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

		const [x, y] = this._getMouseOffset(event);

		if (!!this._resizingDragStart) {
			// Determine size difference from start position
			const sizeDiff: number = this._resizingDragStart.info.overRow
				? y - this._resizingDragStart.startY
				: x - this._resizingDragStart.startX;

			// Determine new size
			const oldSize: number = this._resizingDragStart.info.overRow
				? this._cellModel.getRowSize(this._resizingDragStart.info.index)
				: this._cellModel.getColumnSize(
						this._resizingDragStart.info.index
				  );
			let newSize: number = oldSize + sizeDiff;

			// Restrict new size by the min allowed row/column sizes from options
			if (this._resizingDragStart.info.overRow) {
				if (
					newSize <
					this._options.renderer.canvas.rowColumnResizing.minRowSize
				) {
					newSize =
						this._options.renderer.canvas.rowColumnResizing
							.minRowSize;
				}
			} else {
				if (
					newSize <
					this._options.renderer.canvas.rowColumnResizing
						.minColumnSize
				) {
					newSize =
						this._options.renderer.canvas.rowColumnResizing
							.minColumnSize;
				}
			}

			// Call resizer handler to process the resizing
			if (
				this._options.renderer.canvas.rowColumnResizing.resizingHandler(
					newSize,
					this._resizingDragStart.info.overRow,
					this._resizingDragStart.info.index,
					this._cellModel,
					this._selectionModel
				)
			) {
				this._repaintScheduler.next(); // Schedule a repaint
			}

			this._resizingDragStart = null;
		} else if (!!this._initialSelectionRange) {
			// End selection extending
			if (!this._copyHandleDragStart) {
				const targetRange: ICellRange = this._getCellRangeAtPoint(x, y);

				const selectionChangedFromBeginning: boolean =
					!CellRangeUtil.equals(
						this._initialSelectionRange,
						targetRange
					);
				const isMultiSelection: boolean = event.ctrlKey;
				if (selectionChangedFromBeginning || isMultiSelection) {
					this._updateCurrentSelection(
						{
							startRow: Math.min(
								this._initialSelectionRange.startRow,
								targetRange.startRow
							),
							endRow: Math.max(
								this._initialSelectionRange.endRow,
								targetRange.endRow
							),
							startColumn: Math.min(
								this._initialSelectionRange.startColumn,
								targetRange.startColumn
							),
							endColumn: Math.max(
								this._initialSelectionRange.endColumn,
								targetRange.endColumn
							),
						},
						{
							row: this._initialSelectionRange.startRow,
							column: this._initialSelectionRange.startColumn,
						},
						false,
						false,
						true
					);
				} else {
					/*
					 * Make sure the current selection is focused.
					 * May not be the case when only selecting a single cell.
					 */
					const primary: ISelection | null =
						this._selectionModel.getPrimary();
					if (!!primary) {
						this._updateFocusedCell(primary.initial);
					}

					// Send event to cell renderer for the cell on the current position
					const range: ICellRange | null = this._getCellRangeAtPoint(
						x,
						y,
						false
					);
					if (!!range) {
						this._sendEventForPosition(
							range.startRow,
							range.startColumn,
							(listener) => listener.onMouseUp,
							(e) => {
								const mouseEvent: ICellRendererMouseEvent =
									e as ICellRendererMouseEvent;
								mouseEvent.offset = { x, y };
								mouseEvent.originalEvent = event;
								return mouseEvent;
							}
						);
					}
				}
			} else {
				this._copyHandleDragStart = null;
				this._copyHandleInitial = null;

				// Send copy event
				if (!!this._options.selection.copyHandle.copyHandler) {
					this._options.selection.copyHandle.copyHandler(
						{
							startRow: this._initialSelectionRange.startRow,
							endRow: this._initialSelectionRange.endRow,
							startColumn:
								this._initialSelectionRange.startColumn,
							endColumn: this._initialSelectionRange.endColumn,
						},
						{
							startRow:
								this._selectionModel.getPrimary().range
									.startRow,
							endRow: this._selectionModel.getPrimary().range
								.endRow,
							startColumn:
								this._selectionModel.getPrimary().range
									.startColumn,
							endColumn:
								this._selectionModel.getPrimary().range
									.endColumn,
						}
					);
				}
			}

			this._initialSelectionRange = null;
			this._stopAutoScrolling(); // Stop automatic scrolling (when in progress)
		}

		this._updateSelectionScrollPrevention();
	}

	/**
	 * Called when a touch start event occurs.
	 * @param event that occurred
	 */
	private _onTouchStart(event: TouchEvent): void {
		if (event.touches.length === 1 && !this._panningStart) {
			event.preventDefault();
			const touch: Touch = event.changedTouches[0];

			this._startTouchID = touch.identifier;

			// Stop any auto-scrolling in progress due to previous touches
			this._stopAutoScrolling();

			const [x, y] = this._getMouseOffset(touch);
			this._panningStart = {
				startX: x,
				startY: y,
				lastX: x,
				lastY: y,
				speedX: 0,
				speedY: 0,
				lastTimestamp: window.performance.now(),
				startScrollOffset: {
					...this._viewportScroller.getScrollOffset(),
				},
				isTap: true,
			};
		} else if (event.touches.length === 2 && this._secondTouchID === null) {
			this._secondTouchID = event.touches[1].identifier;

			const [x2, y2] = this._getMouseOffset(event.touches[1]);
			const [x1, y1] = this._getMouseOffset(event.touches[0]);
			this._touchZoomContext = {
				startTouchDistance: Math.hypot(x2 - x1, y2 - y1),
				startZoom: this._zoom,
			};
		}
	}

	/**
	 * Called when a touch move event occurs.
	 * @param event that occurred
	 */
	private _onTouchMove(event: TouchEvent): void {
		if (event.touches.length === 2 && this._touchZoomContext !== null) {
			// Zoom by pinching
			const [x2, y2]: number[] = this._getMouseOffset(event.touches[1]);
			const [x1, y1]: number[] = this._getMouseOffset(event.touches[0]);

			const currentFingerDistance: number = Math.hypot(x2 - x1, y2 - y1);

			this.setZoom(
				(this._touchZoomContext.startZoom * currentFingerDistance) /
					this._touchZoomContext.startTouchDistance
			);
			return;
		}

		if (!!this._panningStart && event.changedTouches.length === 1) {
			const touch: Touch = event.changedTouches[0];

			if (touch.identifier === this._startTouchID) {
				const [x, y] = this._getMouseOffset(touch);

				this._panningStart.isTap = false; // Finger moved, so this cannot be a tap event

				const currentTimestamp = window.performance.now();
				const diff =
					currentTimestamp - this._panningStart.lastTimestamp;
				this._panningStart.lastTimestamp = currentTimestamp;

				this._panningStart.speedX =
					(x - this._panningStart.lastX) / diff;
				this._panningStart.speedY =
					(y - this._panningStart.lastY) / diff;

				this._panningStart.lastX = x;
				this._panningStart.lastY = y;

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
			if (touch.identifier === this._startTouchID && this._panningStart) {
				const [x, y] = this._getMouseOffset(touch);

				this._updateAutoScrolling(
					-this._panningStart.speedX *
						this.rendererOptions.canvas.scrolling
							.touchScrollingSpeedFactor,
					-this._panningStart.speedY *
						this.rendererOptions.canvas.scrolling
							.touchScrollingSpeedFactor,
					this.rendererOptions.canvas.scrolling
						.touchScrollingAcceleration
				);

				if (
					event.changedTouches.length === 1 &&
					this._panningStart.isTap
				) {
					// Select cell at the position
					const selectionRange: ICellRange =
						this._getCellRangeAtPoint(x, y);
					this._updateCurrentSelection(
						selectionRange,
						{
							row: selectionRange.startRow,
							column: selectionRange.startColumn,
						},
						true,
						true,
						true
					);
				}

				// Stop panning
				this._panningStart = null;
			} else if (touch.identifier === this._secondTouchID) {
				this._secondTouchID = null;
				this._touchZoomContext = null;
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
	 * Called when the container HTML element is resized.
	 */
	private _onContainerResized(): void {
		this._devicePixelRatio = Math.max(window.devicePixelRatio, 1.0);

		const newBounds: DOMRect = this._container.getBoundingClientRect();

		// Re-size scroll bar offsets as well
		const fixedAreaInfos: IFixedAreaInfos = this.getFixedAreaInfos();
		const tableSize: ISize = {
			width:
				this._cellModel.getWidth() -
				fixedAreaInfos.left.size -
				fixedAreaInfos.right.size,
			height:
				this._cellModel.getHeight() -
				fixedAreaInfos.top.size -
				fixedAreaInfos.bottom.size,
		};

		const oldViewPort: IRectangle = !!this._lastRenderingContext
			? this._lastRenderingContext.cells.nonFixedCells.viewPortBounds
			: {
					top: 0,
					left: 0,
					width: 0,
					height: 0,
			  };

		// Update scroll offset
		const currentScrollOffset = this._viewportScroller.getScrollOffset();
		let updatedScrollOffset: IPoint = {
			...currentScrollOffset,
		};
		if (tableSize.width > newBounds.width) {
			const oldMaxOffset = tableSize.width - oldViewPort.width;
			const newMaxOffset =
				tableSize.width -
				(newBounds.width -
					fixedAreaInfos.left.size -
					fixedAreaInfos.right.size);

			updatedScrollOffset.x = Math.max(
				Math.min(
					(currentScrollOffset.x * newMaxOffset) / oldMaxOffset,
					newMaxOffset
				),
				0
			);
		} else {
			updatedScrollOffset.x = 0;
		}
		if (tableSize.height > newBounds.height) {
			const oldMaxOffset = tableSize.height - oldViewPort.height;
			const newMaxOffset =
				tableSize.height -
				(newBounds.height -
					fixedAreaInfos.top.size -
					fixedAreaInfos.bottom.size);

			updatedScrollOffset.y = Math.max(
				Math.min(
					(currentScrollOffset.y * newMaxOffset) / oldMaxOffset,
					newMaxOffset
				),
				0
			);
		} else {
			updatedScrollOffset.y = 0;
		}

		// Set new size to canvas
		CanvasUtil.setCanvasSize(
			this._canvasElement,
			newBounds.width,
			newBounds.height,
			this._devicePixelRatio
		);

		this._viewportScroller.scrollToOffset(
			updatedScrollOffset.x,
			updatedScrollOffset.y
		);

		// Schedule a repaint
		this._repaintScheduler.next();
	}

	/**
	 * Called on key down on the container.
	 * @param event that occurred
	 */
	private _onKeyDown(event: KeyboardEvent): void {
		const preventDefaultDueToCellRenderer: boolean =
			!!this._focusedCellPosition &&
			this._sendEventForPosition(
				this._focusedCellPosition.row,
				this._focusedCellPosition.column,
				(listener) => listener.onKeyDown,
				(e) => {
					const keyboardEvent: ICellRendererKeyboardEvent =
						e as ICellRendererKeyboardEvent;
					keyboardEvent.originalEvent = event;
					return keyboardEvent;
				}
			);

		if (preventDefaultDueToCellRenderer) {
			event.preventDefault();
			return;
		}

		switch (event.code) {
			case 'Space':
				event.preventDefault();
				this._isInMouseDragMode = true;
				break;
			case 'Tab':
			case 'Enter':
				event.preventDefault();

				if (!event.ctrlKey) {
					const axisVertical: boolean = event.code === 'Enter';

					const primary: ISelection | null =
						this._selectionModel.getPrimary();
					if (!!primary) {
						// Check if selection is only a single cell
						const cell: ICell | null = this._cellModel.getCell(
							primary.range.startRow,
							primary.range.startColumn
						);
						const isSingleCell: boolean =
							!cell ||
							CellRangeUtil.equals(primary.range, cell.range);

						if (
							isSingleCell &&
							this._selectionModel.getSelections().length === 1
						) {
							// Single cell selected -> move selection
							this._moveSelection(
								axisVertical ? 0 : event.shiftKey ? -1 : 1,
								axisVertical ? (event.shiftKey ? -1 : 1) : 0,
								false
							);
						} else {
							// Multiple cells selected -> move only initial in selection
							this._moveInitialSelection(
								axisVertical ? 0 : event.shiftKey ? -1 : 1,
								axisVertical ? (event.shiftKey ? -1 : 1) : 0
							);
						}
					}
				}
				break;
			case 'KeyA':
				if (event.ctrlKey) {
					event.preventDefault();

					// Select all cells
					this._selectAll();
				}
				break;
			case 'KeyC':
			case 'KeyX':
				if (event.ctrlKey) {
					// Copy or cut requested
					// Note that the table-engine will only handle copying and not cutting
					// The user has to define a cutting listener themself.
					event.preventDefault();

					this._copySelection();
				}
				break;
			case 'ArrowDown':
			case 'ArrowLeft':
			case 'ArrowRight':
			case 'ArrowUp':
				event.preventDefault(); // Prevent scrolling due to arrow key navigation

				const extend: boolean = event.shiftKey;
				const jump: boolean = event.ctrlKey;

				let xDiff: number = 0;
				if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
					xDiff = event.code === 'ArrowLeft' ? -1 : 1;
				}

				let yDiff: number = 0;
				if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
					yDiff = event.code === 'ArrowUp' ? -1 : 1;
				}

				if (extend) {
					this._extendSelection(xDiff, yDiff, jump);
				} else {
					this._moveSelection(xDiff, yDiff, jump);
				}
				break;
		}
	}

	/**
	 * Copy the currently selected cell values on the clipboard.
	 * Hidden rows/columns are left out.
	 */
	private async _copySelection(): Promise<void> {
		const primary: ISelection | null = this._selectionModel.getPrimary();
		if (!!primary) {
			// Check whether there is a limit to the copyable cell count for performance reasons
			const copyableCellCountLimit: number =
				this.rendererOptions.view.maxCellCountToCopy;
			if (copyableCellCountLimit >= 0) {
				const cellCountInRange: number = CellRangeUtil.size(
					primary.range
				);

				if (cellCountInRange > copyableCellCountLimit) {
					// Notify user that the amount of cells is high and may take a while to copy (performance warning)
					const notification: CopyPerformanceWarningNotification =
						new CopyPerformanceWarningNotification(
							copyableCellCountLimit,
							cellCountInRange
						);

					let copyAnyway: boolean = false;
					if (!!this.rendererOptions.notificationService) {
						copyAnyway = await Promise.race([
							new Promise<boolean>((resolve) => {
								notification.callback = (copyAnyway) =>
									resolve(copyAnyway);

								this.rendererOptions.notificationService.notify(
									notification
								);
							}),
							new Promise<boolean>((resolve) => {
								setTimeout(() => resolve(false), 60000);
							}),
						]);
					} else {
						console.warn(`[table-engine] ${notification.message}`);
					}

					if (!copyAnyway) {
						return;
					}
				}
			}

			// Build HTML table to copy
			const htmlTable: string = ClipboardUtil.buildHTMLTableForCopy(
				primary.range,
				this._cellModel,
				(cell) => {
					return this._cellRendererLookup
						.get(cell.rendererName)
						.getCopyValue(cell);
				}
			);

			// Actually copy the HTML table
			ClipboardUtil.setClipboardContent(htmlTable);

			if (!!this.rendererOptions.notificationService) {
				this.rendererOptions.notificationService.notify(
					new CopyNotification()
				);
			}
		}
	}

	/**
	 * Select all cells.
	 */
	private _selectAll(): void {
		this._selectionModel.clear();

		const firstVisibleRow: number = this._cellModel.findNextVisibleRow(0);
		const firstVisibleColumn: number =
			this._cellModel.findNextVisibleColumn(0);
		const lastVisibleRow: number = this._cellModel.findPreviousVisibleRow(
			this._cellModel.getRowCount() - 1
		);
		const lastVisibleColumn: number =
			this._cellModel.findPreviousVisibleColumn(
				this._cellModel.getColumnCount() - 1
			);

		this._selectionModel.addSelection(
			{
				range: {
					startRow: firstVisibleRow,
					endRow: lastVisibleRow,
					startColumn: firstVisibleColumn,
					endColumn: lastVisibleColumn,
				},
				initial: {
					row: firstVisibleRow,
					column: firstVisibleColumn,
				},
			},
			true,
			false
		);

		const primary: ISelection | null = this._selectionModel.getPrimary();
		if (!!primary) {
			this._updateFocusedCell(primary.initial);

			this._repaintScheduler.next();
		}
	}

	/**
	 * Update the currently focused cell position.
	 * @param position to update to (null if blurring all focus from table)
	 */
	private _updateFocusedCell(position: IInitialPosition | null): void {
		// Check if position changed
		const oldRow: number = !!this._focusedCellPosition
			? this._focusedCellPosition.row
			: -1;
		const oldColumn: number = !!this._focusedCellPosition
			? this._focusedCellPosition.column
			: -1;

		const newRow: number = !!position ? position.row : -1;
		const newColumn: number = !!position ? position.column : -1;

		const changed: boolean = newRow !== oldRow || newColumn !== oldColumn;
		if (!changed) {
			return;
		}

		// Send blur event for old focused cell
		if (!!this._focusedCellPosition) {
			this._sendEventForPosition(
				this._focusedCellPosition.row,
				this._focusedCellPosition.column,
				(listener) => listener.onBlur,
				(e) => e as ICellRendererFocusEvent
			);
		}

		if (!!position) {
			this._focusedCellPosition = {
				row: position.row,
				column: position.column,
			};

			// Send focus event
			this._sendEventForPosition(
				position.row,
				position.column,
				(listener) => listener.onFocus,
				(e) => e as ICellRendererFocusEvent
			);
		} else {
			this._focusedCellPosition = null;
		}
	}

	/**
	 * Move the current primary selection (if any).
	 * @param xDiff to move horizontally
	 * @param yDiff to move vertically
	 * @param jump whether to jump to the end in the specified direction
	 */
	private _moveSelection(xDiff: number, yDiff: number, jump: boolean): void {
		const primary: ISelection = this._selectionModel.getPrimary();
		if (!primary) {
			return; // Nothing to move
		}

		// Clear selections except the primary
		const selections: ISelection[] = this._selectionModel.getSelections();
		while (selections.length > 1) {
			if (selections[0] === primary) {
				this._selectionModel.removeSelection(selections[1]);
			} else {
				this._selectionModel.removeSelection(selections[0]);
			}
		}
		this._selectionModel.setPrimary(0);

		if (this._selectionModel.moveSelection(primary, xDiff, yDiff, jump)) {
			this._updateFocusedCell(primary.initial);

			this.scrollTo(primary.initial.row, primary.initial.column);

			this._repaintScheduler.next();
		}
	}

	/**
	 * Extend the current primary selection (if any) in the specified direction.
	 * @param xDiff to extend horizontally
	 * @param yDiff to extend vertically
	 * @param jump whether to jump to the end in the specified direction
	 */
	private _extendSelection(
		xDiff: number,
		yDiff: number,
		jump: boolean
	): void {
		const primary: ISelection = this._selectionModel.getPrimary();
		if (!primary) {
			return; // Nothing to extend
		}

		if (this._selectionModel.extendSelection(primary, xDiff, yDiff, jump)) {
			let rowToScrollTo: number = primary.initial.row;
			if (yDiff !== 0) {
				rowToScrollTo =
					yDiff < 0 ? primary.range.startRow : primary.range.endRow;
			}

			let columnToScrollTo: number = primary.initial.column;
			if (xDiff !== 0) {
				columnToScrollTo =
					xDiff < 0
						? primary.range.startColumn
						: primary.range.endColumn;
			}

			this.scrollTo(rowToScrollTo, columnToScrollTo);

			this._repaintScheduler.next();
		}
	}

	/**
	 * Move the initial selection in the current primary selection.
	 * @param xDiff to move horizontally
	 * @param yDiff to move vertically
	 */
	private _moveInitialSelection(xDiff: number, yDiff: number): void {
		if (!this._selectionModel.getPrimary()) {
			return; // Nothing to move
		}

		this._selectionModel.moveInitial(xDiff, yDiff);

		const primary = this._selectionModel.getPrimary();
		this._updateFocusedCell(primary.initial);
		this.scrollTo(primary.initial.row, primary.initial.column);

		this._repaintScheduler.next();
	}

	/**
	 * Set the zoom level.
	 * Max zoom level is 100% as zooming out may lead
	 * to bad table scrolling performance as we need
	 * to render a lot of cells.
	 * @param zoom level (1.0 = 100%)
	 */
	public setZoom(zoom: number): void {
		const newZoom: number = Math.min(
			Math.max(zoom, 1.0),
			CanvasRenderer.MAX_ZOOM_LEVEL
		);
		if (newZoom !== this._zoom) {
			this._zoom = newZoom;

			this._updateOverlaysAfterRenderCycle = true;

			this._repaintScheduler.next();
		}
	}

	/**
	 * Get the current zoom level (1.0 = 100%).
	 */
	public getZoom(): number {
		return this._zoom;
	}

	public getScrollOffset(): IPoint {
		return this._viewportScroller.getScrollOffset();
	}

	public getViewport(): IRectangle {
		if (!!this._lastRenderingContext) {
			return this._lastRenderingContext.viewPort;
		}

		return this._getViewPort();
	}

	/**
	 * Scroll to the cell at the given row and column (if not already in the current view).
	 * @param row to scroll to
	 * @param column to scroll to
	 */
	public scrollTo(row: number, column: number): void {
		if (this._viewportScroller.scrollTo(row, column)) {
			this._repaintScheduler.next();
		}
	}

	/**
	 * Called on key up on the container.
	 * @param event that occurred
	 */
	private _onKeyUp(event: KeyboardEvent): void {
		const preventDefault: boolean =
			!!this._focusedCellPosition &&
			this._sendEventForPosition(
				this._focusedCellPosition.row,
				this._focusedCellPosition.column,
				(listener) => listener.onKeyUp,
				(e) => {
					const keyboardEvent: ICellRendererKeyboardEvent =
						e as ICellRendererKeyboardEvent;
					keyboardEvent.originalEvent = event;
					return keyboardEvent;
				}
			);

		if (preventDefault) {
			event.preventDefault();
			return;
		}

		if (event.code === 'Space') {
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
			event.preventDefault();
			this.setZoom(this._zoom + (event.deltaY > 0 ? -0.25 : 0.25));
		} else {
			const scrollDeltaY: number =
				ScrollUtil.determineScrollOffsetFromEvent(
					this._canvasElement,
					true,
					event
				);
			const scrollDeltaX: number =
				ScrollUtil.determineScrollOffsetFromEvent(
					this._canvasElement,
					false,
					event
				);

			// When shift-key is pressed, deltaY means scrolling horizontally (same for deltaX).
			const switchScrollDirection: boolean = event.shiftKey;

			const currentScrollOffset =
				this._viewportScroller.getScrollOffset();
			const newScrollOffsetX: number =
				currentScrollOffset.x +
				(switchScrollDirection ? scrollDeltaY : scrollDeltaX);
			const newScrollOffsetY: number =
				currentScrollOffset.y +
				(switchScrollDirection ? scrollDeltaX : scrollDeltaY);

			if (this._scrollTo(newScrollOffsetX, newScrollOffsetY)) {
				// Prevent the default action (for example scrolling in parent component)
				event.preventDefault();

				// Schedule a table repaint
				this._repaintScheduler.next();
			}
		}
	}

	/**1
	 * Scroll to the given x and y offsets.
	 * @param offsetX to scroll to
	 * @param offsetY to scroll to
	 * @returns whether the offsets have been changed
	 */
	private _scrollTo(offsetX: number, offsetY: number): boolean {
		if (this._viewportScroller.scrollToOffset(offsetX, offsetY)) {
			this._updateOverlays(); // Update overlays (if any)
			return true;
		}

		return false;
	}

	/**
	 * Clear all child elements from the passed HTML container.
	 * @param container to clear all children from
	 */
	private static _clearContainerChildren(container: HTMLElement): void {
		while (container.hasChildNodes()) {
			container.removeChild(container.lastChild);
		}
	}

	/**
	 * Initialize the rendering elements to use.
	 */
	private _initializeRenderingElements(): void {
		const bounds: DOMRect = this._container.getBoundingClientRect();

		// The container might have children -> clear them just to make sure
		CanvasRenderer._clearContainerChildren(this._container);

		// Create HTML canvas element
		this._canvasElement = document.createElement('canvas');
		this._canvasContext = this._canvasElement.getContext('2d');

		// Set position absolute to prevent resize events to occur due to canvas element resizing
		this._canvasElement.style.position = 'absolute';

		// Set proper size based on the container HTML element size
		CanvasUtil.setCanvasSize(
			this._canvasElement,
			bounds.width,
			bounds.height
		);

		// Append it to the container
		this._container.appendChild(this._canvasElement);

		// Create overlay container
		this._overlayContainer = document.createElement('div');
		this._overlayContainer.style.position = 'absolute';
		this._overlayContainer.style.zIndex = '999';
		this._overlayContainer.style.width = '100%';
		this._overlayContainer.style.height = '100%';
		this._overlayContainer.style.overflow = 'hidden';

		// Make it focusable (needed for key listeners for example).
		this._overlayContainer.setAttribute('tabindex', '-1');
		this._overlayContainer.style.outline = 'none'; // Remove focus outline when focused

		this._container.appendChild(this._overlayContainer);
	}

	/**
	 * Get the current viewport.
	 */
	private _getViewPort(): IRectangle {
		const viewportSize: ISize = this.getViewportSize();
		const scrollOffset = this._viewportScroller.getScrollOffset();

		return {
			top: scrollOffset.y,
			left: scrollOffset.x,
			width: viewportSize.width,
			height: viewportSize.height,
		};
	}

	getViewportSize(): ISize {
		return {
			width:
				this._canvasElement.width / this._devicePixelRatio / this._zoom,
			height:
				this._canvasElement.height /
				this._devicePixelRatio /
				this._zoom,
		};
	}

	getFixedAreaInfos(): IFixedAreaInfos {
		if (!!this._lastRenderingContext) {
			return this._lastRenderingContext.fixedAreaInfos;
		}

		return FixedAreaUtil.calculateFixedAreaInfos(
			this._options.renderer.view.fixedAreas,
			this._cellModel
		);
	}

	/**
	 * Calculate the scroll bar rendering context.
	 * @param viewPort to render scroll bar in
	 * @param fixedAreaInfos infos about the fixed areas
	 */
	private _calculateScrollBarContext(
		viewPort: IRectangle,
		fixedAreaInfos: IFixedAreaInfos
	): IScrollBarRenderContext {
		// Derive scroll bar options
		const scrollBarOptions: IScrollBarOptions =
			this.rendererOptions.canvas.scrollBar;
		const scrollBarSize: number = scrollBarOptions.size;
		const minScrollBarLength: number = scrollBarOptions.minLength;
		const scrollBarOffset: number = scrollBarOptions.offset;
		const cornerRadius: number = scrollBarOptions.cornerRadius;
		const drawOverFixedAreas: boolean = scrollBarOptions.drawOverFixedAreas;

		const scrollableViewportSize: ISize = {
			width:
				viewPort.width -
				fixedAreaInfos.left.size -
				fixedAreaInfos.right.size,
			height:
				viewPort.height -
				fixedAreaInfos.top.size -
				fixedAreaInfos.bottom.size,
		};
		const scrollableTableSize: ISize = {
			width:
				this._cellModel.getWidth() -
				fixedAreaInfos.left.size -
				fixedAreaInfos.right.size,
			height:
				this._cellModel.getHeight() -
				fixedAreaInfos.top.size -
				fixedAreaInfos.bottom.size,
		};
		const scrollBarViewportSize: ISize = {
			width: drawOverFixedAreas
				? viewPort.width
				: scrollableViewportSize.width,
			height: drawOverFixedAreas
				? viewPort.height
				: scrollableViewportSize.height,
		};

		const maxVerticalOffset: number =
			scrollableTableSize.height - scrollableViewportSize.height;
		const maxHorizontalOffset: number =
			scrollableTableSize.width - scrollableViewportSize.width;

		const currentScrollOffset = this._viewportScroller.getScrollOffset();

		const xOffset = drawOverFixedAreas ? 0 : fixedAreaInfos.left.size;
		const yOffset = drawOverFixedAreas ? 0 : fixedAreaInfos.top.size;

		// Calculate vertical scrollbar layout
		let vertical: IScrollBarAxisRenderContext = null;
		if (scrollableTableSize.height > scrollableViewportSize.height) {
			const length = Math.max(
				(scrollableViewportSize.height / scrollableTableSize.height) *
					scrollBarViewportSize.height,
				minScrollBarLength
			);
			const progress = currentScrollOffset.y / maxVerticalOffset;

			vertical = {
				size: scrollBarSize,
				length,
				x:
					scrollBarViewportSize.width -
					scrollBarSize -
					scrollBarOffset +
					xOffset,
				y: (scrollBarViewportSize.height - length) * progress + yOffset,
			};
		}

		// Calculate horizontal scrollbar layout
		let horizontal: IScrollBarAxisRenderContext = null;
		if (scrollableTableSize.width > scrollableViewportSize.width) {
			const length = Math.max(
				(scrollableViewportSize.width / scrollableTableSize.width) *
					scrollBarViewportSize.width,
				minScrollBarLength
			);
			const progress = currentScrollOffset.x / maxHorizontalOffset;

			horizontal = {
				size: scrollBarSize,
				length,
				x: (scrollBarViewportSize.width - length) * progress + xOffset,
				y:
					scrollBarViewportSize.height -
					scrollBarSize -
					scrollBarOffset +
					yOffset,
			};
		}

		return {
			color: this.rendererOptions.canvas.scrollBar.color,
			cornerRadius,
			vertical,
			horizontal,
		};
	}

	/**
	 * Calculate the selection rendering context.
	 * @param viewPort to calculate selections for
	 * @param fixedAreaInfos infos about the fixed areas
	 */
	private _calculateSelectionContext(
		viewPort: IRectangle,
		fixedAreaInfos: IFixedAreaInfos
	): ISelectionRenderContext {
		const selections: ISelection[] = this._selectionModel.getSelections();
		const primary: ISelection = this._selectionModel.getPrimary();

		if (selections.length === 0) {
			return null; // We do not have a selection yet
		}

		const result: ISelectionRenderContext = {
			options: this.rendererOptions.canvas.selection,
			copyHandle: {
				isRendered: false,
			},
			inNonFixedArea: [],
		};

		const isMultiSelection: boolean = selections.length > 1;

		for (const selection of selections) {
			this._validateSelection(selection);
			this._addInfosForSelection(
				result,
				selection,
				viewPort,
				fixedAreaInfos,
				selection === primary,
				isMultiSelection
			);
		}

		return result;
	}

	/**
	 * Validate the given selection.
	 * Validation means checking whether the selection is being able to be rendered.
	 * For example when deleting the last row or column, the selection will no more
	 * be inside table bounds.
	 * @param selection to validate
	 */
	private _validateSelection(selection: ISelection): void {
		const maxRow: number = this._cellModel.getRowCount();
		const maxColumn: number = this._cellModel.getColumnCount();

		if (selection.range.endRow >= maxRow) {
			selection.range.endRow = maxRow - 1;

			if (selection.range.startRow > selection.range.endRow) {
				selection.range.startRow = selection.range.endRow;
			}
		}
		if (!!selection.initial && selection.initial.row >= maxRow) {
			selection.initial.row = maxRow - 1;
		}

		if (selection.range.endColumn >= maxColumn) {
			selection.range.endColumn = maxColumn - 1;

			if (selection.range.startColumn > selection.range.endColumn) {
				selection.range.startColumn = selection.range.endColumn;
			}
		}
		if (!!selection.initial && selection.initial.column >= maxColumn) {
			selection.initial.column = maxColumn - 1;
		}
	}

	/**
	 * Calculate the bounds for the given selection and add them to the rendering context result.
	 * @param toAdd the context to add the result to
	 * @param selection to calculate bounds for
	 * @param viewPort to calculate selections for
	 * @param fixedAreaInfos infos about the fixed areas
	 * @param isPrimary whether the selection is the primary selection
	 * @param isMultiSelection whether the selection is one of many to be rendered (true) or just one (false)
	 */
	private _addInfosForSelection(
		toAdd: ISelectionRenderContext,
		selection: ISelection,
		viewPort: IRectangle,
		fixedAreaInfos: IFixedAreaInfos,
		isPrimary: boolean,
		isMultiSelection: boolean
	): void {
		const bounds: IRectangle = this._calculateCellRangeBoundsInViewport(
			selection.range,
			{
				width: viewPort.width,
				height: viewPort.height,
			},
			fixedAreaInfos
		);

		let initialBounds: IRectangle | null = null;
		let initialRange: ICellRange | null = null;
		if (isPrimary) {
			const cellAtInitial = this._cellModel.getCell(
				selection.initial.row,
				selection.initial.column
			);
			if (!!cellAtInitial) {
				initialRange = cellAtInitial.range;
			} else {
				initialRange = CellRange.fromSingleRowColumn(
					selection.initial.row,
					selection.initial.column
				);
			}

			initialBounds = this._calculateCellRangeBoundsInViewport(
				initialRange,
				viewPort,
				fixedAreaInfos
			);
		}

		// Offset selection properly based on selection rendering options
		const offset: number = this.rendererOptions.canvas.selection.offset;
		if (offset !== 0) {
			// Correct initial
			if (!!initialBounds) {
				if (initialBounds.top === bounds.top) {
					initialBounds.top += offset;
					initialBounds.height -= offset;
				}
				if (initialBounds.left === bounds.left) {
					initialBounds.left += offset;
					initialBounds.width -= offset;
				}
				if (
					initialBounds.top + initialBounds.height ===
					bounds.top + bounds.height
				) {
					initialBounds.height -= offset;
				}
				if (
					initialBounds.left + initialBounds.width ===
					bounds.left + bounds.width
				) {
					initialBounds.width -= offset;
				}
			}

			// Correct bounds
			bounds.left += offset;
			bounds.top += offset;
			bounds.width -= offset * 2;
			bounds.height -= offset * 2;
		}

		const renderInfo: ISelectionRenderInfo = {
			bounds,
			initial: initialBounds,
			isPrimary,
			renderCopyHandle:
				isPrimary &&
				!isMultiSelection &&
				this._options.selection.copyHandle.showCopyHandle,
		};

		// Add render info to every collection for every table area that contains the selection
		const intersectingTableAreas: ITableAreaMask =
			CanvasRenderer._checkTableAreaIntersection(
				selection.range,
				fixedAreaInfos
			);
		const initialIntersectingTableAreas: ITableAreaMask = !!initialRange
			? CanvasRenderer._checkTableAreaIntersection(
					initialRange,
					fixedAreaInfos
			  )
			: {
					nonFixed: false,
					fixed: {
						left: false,
						right: false,
						top: false,
						bottom: false,
						leftTop: false,
						leftBottom: false,
						rightTop: false,
						rightBottom: false,
					},
			  };

		if (intersectingTableAreas.nonFixed) {
			if (initialIntersectingTableAreas.nonFixed) {
				toAdd.inNonFixedArea.push(renderInfo);
			} else {
				toAdd.inNonFixedArea.push({
					...renderInfo,
					initial: null,
				});
			}
		}
		if (intersectingTableAreas.fixed.top) {
			if (!toAdd.inFixedArea) {
				toAdd.inFixedArea = {};
			}
			if (!toAdd.inFixedArea.top) {
				toAdd.inFixedArea.top = [];
			}

			if (initialIntersectingTableAreas.fixed.top) {
				toAdd.inFixedArea.top.push(renderInfo);
			} else {
				toAdd.inFixedArea.top.push({
					...renderInfo,
					initial: null,
				});
			}
		}
		if (intersectingTableAreas.fixed.left) {
			if (!toAdd.inFixedArea) {
				toAdd.inFixedArea = {};
			}
			if (!toAdd.inFixedArea.left) {
				toAdd.inFixedArea.left = [];
			}

			if (initialIntersectingTableAreas.fixed.left) {
				toAdd.inFixedArea.left.push(renderInfo);
			} else {
				toAdd.inFixedArea.left.push({
					...renderInfo,
					initial: null,
				});
			}
		}
		if (intersectingTableAreas.fixed.bottom) {
			if (!toAdd.inFixedArea) {
				toAdd.inFixedArea = {};
			}
			if (!toAdd.inFixedArea.bottom) {
				toAdd.inFixedArea.bottom = [];
			}

			if (initialIntersectingTableAreas.fixed.bottom) {
				toAdd.inFixedArea.bottom.push(renderInfo);
			} else {
				toAdd.inFixedArea.bottom.push({
					...renderInfo,
					initial: null,
				});
			}
		}
		if (intersectingTableAreas.fixed.right) {
			if (!toAdd.inFixedArea) {
				toAdd.inFixedArea = {};
			}
			if (!toAdd.inFixedArea.right) {
				toAdd.inFixedArea.right = [];
			}

			if (initialIntersectingTableAreas.fixed.right) {
				toAdd.inFixedArea.right.push(renderInfo);
			} else {
				toAdd.inFixedArea.right.push({
					...renderInfo,
					initial: null,
				});
			}
		}
		if (intersectingTableAreas.fixed.leftTop) {
			if (!toAdd.inFixedArea) {
				toAdd.inFixedArea = {};
			}
			if (!toAdd.inFixedArea.leftTop) {
				toAdd.inFixedArea.leftTop = [];
			}

			if (initialIntersectingTableAreas.fixed.leftTop) {
				toAdd.inFixedArea.leftTop.push(renderInfo);
			} else {
				toAdd.inFixedArea.leftTop.push({
					...renderInfo,
					initial: null,
				});
			}
		}
		if (intersectingTableAreas.fixed.leftBottom) {
			if (!toAdd.inFixedArea) {
				toAdd.inFixedArea = {};
			}
			if (!toAdd.inFixedArea.leftBottom) {
				toAdd.inFixedArea.leftBottom = [];
			}

			if (initialIntersectingTableAreas.fixed.leftBottom) {
				toAdd.inFixedArea.leftBottom.push(renderInfo);
			} else {
				toAdd.inFixedArea.leftBottom.push({
					...renderInfo,
					initial: null,
				});
			}
		}
		if (intersectingTableAreas.fixed.rightTop) {
			if (!toAdd.inFixedArea) {
				toAdd.inFixedArea = {};
			}
			if (!toAdd.inFixedArea.rightTop) {
				toAdd.inFixedArea.rightTop = [];
			}

			if (initialIntersectingTableAreas.fixed.rightTop) {
				toAdd.inFixedArea.rightTop.push(renderInfo);
			} else {
				toAdd.inFixedArea.rightTop.push({
					...renderInfo,
					initial: null,
				});
			}
		}
		if (intersectingTableAreas.fixed.rightBottom) {
			if (!toAdd.inFixedArea) {
				toAdd.inFixedArea = {};
			}
			if (!toAdd.inFixedArea.rightBottom) {
				toAdd.inFixedArea.rightBottom = [];
			}

			if (initialIntersectingTableAreas.fixed.rightBottom) {
				toAdd.inFixedArea.rightBottom.push(renderInfo);
			} else {
				toAdd.inFixedArea.rightBottom.push({
					...renderInfo,
					initial: null,
				});
			}
		}
	}

	/**
	 * Calculate the selection bounds from the given cell range bounds.
	 * @param range cell range the bounds have been calculated with
	 * @param viewportSize to calculate selections for
	 * @param fixedAreaInfos infos about the fixed areas
	 */
	private _calculateCellRangeBoundsInViewport(
		range: ICellRange,
		viewportSize: ISize,
		fixedAreaInfos: IFixedAreaInfos
	): IRectangle {
		const bounds = this._cellModel.getBounds(range);

		let startY = bounds.top;
		let endY = bounds.top + bounds.height;
		let startX = bounds.left;
		let endX = bounds.left + bounds.width;

		const currentScrollOffset = this._viewportScroller.getScrollOffset();
		const sizeInFixedAreas: ISize = {
			width: 0,
			height: 0,
		};
		const maxStart: IPoint = {
			x: -1,
			y: -1,
		};

		if (range.startRow <= fixedAreaInfos.top.endIndex) {
			// Start of the range is in fixed rows at the top
			sizeInFixedAreas.height += this._cellModel.getBounds({
				startRow: range.startRow,
				endRow: Math.min(fixedAreaInfos.top.endIndex, range.endRow),
				startColumn: 0,
				endColumn: 0,
			}).height;
		} else if (range.startRow >= fixedAreaInfos.bottom.startIndex) {
			// Start of the range is in fixed rows at the bottom
			const offsetFromBottom = fixedAreaInfos.bottom.endOffset - startY;
			startY = viewportSize.height - offsetFromBottom;
		} else if (range.startRow > fixedAreaInfos.top.endIndex) {
			// Start of the range is in scrollable area
			startY -= currentScrollOffset.y;
		}

		if (range.endRow >= fixedAreaInfos.bottom.startIndex) {
			// End of the range is in fixed rows at the bottom
			const offsetFromBottom = fixedAreaInfos.bottom.endOffset - endY;
			endY = viewportSize.height - offsetFromBottom;

			sizeInFixedAreas.height += this._cellModel.getBounds({
				startRow: Math.max(
					fixedAreaInfos.bottom.startIndex,
					range.startRow
				),
				endRow: range.endRow,
				startColumn: 0,
				endColumn: 0,
			}).height;

			if (range.startRow < fixedAreaInfos.bottom.startIndex) {
				maxStart.y = viewportSize.height - fixedAreaInfos.bottom.size;
			}
		} else if (range.endRow > fixedAreaInfos.top.endIndex) {
			// End of the range is in scrollable area
			endY -= currentScrollOffset.y;
		}

		if (range.startColumn <= fixedAreaInfos.left.endIndex) {
			// Start of the range is in fixed columns to the left
			sizeInFixedAreas.width += this._cellModel.getBounds({
				startRow: 0,
				endRow: 0,
				startColumn: range.startColumn,
				endColumn: Math.min(
					fixedAreaInfos.left.endIndex,
					range.endColumn
				),
			}).width;
		} else if (range.startColumn >= fixedAreaInfos.right.startIndex) {
			// Start of the range is in the fixed columns to the right
			const offsetFromRight = fixedAreaInfos.right.endOffset - startX;
			startX = viewportSize.width - offsetFromRight;
		} else if (range.startColumn > fixedAreaInfos.left.endIndex) {
			// Start of the range is in scrollable area
			startX -= currentScrollOffset.x;
		}

		if (range.endColumn >= fixedAreaInfos.right.startIndex) {
			// End of the range is in the fixed columns to the right
			const offsetFromRight = fixedAreaInfos.right.endOffset - endX;
			endX = viewportSize.width - offsetFromRight;

			sizeInFixedAreas.width += this._cellModel.getBounds({
				startRow: 0,
				endRow: 0,
				startColumn: Math.max(
					fixedAreaInfos.right.startIndex,
					range.startColumn
				),
				endColumn: range.endColumn,
			}).width;

			if (range.startColumn < fixedAreaInfos.right.startIndex) {
				maxStart.x = viewportSize.width - fixedAreaInfos.right.size;
			}
		} else if (range.endColumn > fixedAreaInfos.left.endIndex) {
			// End of the range is in the scrollable area
			endX -= currentScrollOffset.x;
		}

		return {
			left: maxStart.x > -1 ? Math.min(startX, maxStart.x) : startX,
			top: maxStart.y > -1 ? Math.min(startY, maxStart.y) : startY,
			width: Math.max(endX - startX, sizeInFixedAreas.width),
			height: Math.max(endY - startY, sizeInFixedAreas.height),
		};
	}

	/**
	 * Create the rendering context for the current state.
	 */
	private _createRenderingContext(): IRenderContext | null {
		// Check if size of the table changed compared to the last rendering cycle
		if (!!this._lastRenderingContext) {
			const lastSize: ISize = this._lastRenderingContext.tableSize;

			const widthChanged: boolean =
				lastSize.width !== this._cellModel.getWidth();
			const heightChanged: boolean =
				lastSize.height !== this._cellModel.getHeight();
			const sizeChanged: boolean = widthChanged || heightChanged;

			if (sizeChanged) {
				const currentScrollOffset =
					this._viewportScroller.getScrollOffset();
				if (
					this._viewportScroller.scrollToOffset(
						currentScrollOffset.x,
						currentScrollOffset.y
					)
				) {
					this._updateOverlaysAfterRenderCycle = true;
				}
			}
		}

		const viewPort: IRectangle = this._getViewPort();

		const fixedAreaInfos: IFixedAreaInfos =
			FixedAreaUtil.calculateFixedAreaInfos(
				this._options.renderer.view.fixedAreas,
				this._cellModel
			);

		const cellsInfo: ICellRenderContextCollection | null =
			this._createCellRenderingInfo(viewPort, fixedAreaInfos);
		if (!cellsInfo) {
			return null; // No cells to display
		}

		const scrollBarContext: IScrollBarRenderContext =
			this._calculateScrollBarContext(viewPort, fixedAreaInfos);
		const selectionContext: ISelectionRenderContext =
			this._calculateSelectionContext(viewPort, fixedAreaInfos);
		const borderContext: IBorderRenderContext =
			this._calculateBorderContext(viewPort, fixedAreaInfos, cellsInfo);
		const resizerContext: IResizerRenderContext =
			this._calculateResizerRenderContext();

		return {
			focused: this.isFocused(),
			viewPort,
			fixedAreaInfos,
			tableSize: {
				width: this._cellModel.getWidth(),
				height: this._cellModel.getHeight(),
			},
			cells: cellsInfo,
			scrollBar: scrollBarContext,
			selection: selectionContext,
			borders: borderContext,
			resizer: resizerContext,
			renderers: this._cellRendererLookup,
		};
	}

	/**
	 * Calculate the border rendering context.
	 * @param viewPort of the table
	 * @param fixedAreaInfos infos about the fixed areas
	 * @param cellsInfo to calculate borders for
	 */
	private _calculateBorderContext(
		viewPort: IRectangle,
		fixedAreaInfos: IFixedAreaInfos,
		cellsInfo: ICellRenderContextCollection
	): IBorderRenderContext {
		const currentScrollOffset = this._viewportScroller.getScrollOffset();

		const result: IBorderRenderContext = {
			inNonFixedArea: this._calculateBorderInfo(
				this._borderModel.getBorders(cellsInfo.nonFixedCells.cellRange),
				cellsInfo.nonFixedCells.cellRange,
				-currentScrollOffset.x,
				-currentScrollOffset.y
			),
		};

		if (!!cellsInfo.fixedCells) {
			const fixedCells = cellsInfo.fixedCells;
			const fixedArea: IFixedAreaBorderRenderContext = {};

			if (!!fixedCells.leftTop) {
				fixedArea.leftTop = this._calculateBorderInfo(
					this._borderModel.getBorders(fixedCells.leftTop.cellRange),
					fixedCells.leftTop.cellRange,
					0,
					0
				);
			}
			if (!!fixedCells.rightTop) {
				fixedArea.rightTop = this._calculateBorderInfo(
					this._borderModel.getBorders(fixedCells.rightTop.cellRange),
					fixedCells.rightTop.cellRange,
					-fixedAreaInfos.right.startOffset +
						viewPort.width -
						fixedAreaInfos.right.size,
					0
				);
			}
			if (!!fixedCells.leftBottom) {
				fixedArea.leftBottom = this._calculateBorderInfo(
					this._borderModel.getBorders(
						fixedCells.leftBottom.cellRange
					),
					fixedCells.leftBottom.cellRange,
					0,
					-fixedAreaInfos.bottom.startOffset +
						viewPort.height -
						fixedAreaInfos.bottom.size
				);
			}
			if (!!fixedCells.rightBottom) {
				fixedArea.rightBottom = this._calculateBorderInfo(
					this._borderModel.getBorders(
						fixedCells.rightBottom.cellRange
					),
					fixedCells.rightBottom.cellRange,
					-fixedAreaInfos.right.startOffset +
						viewPort.width -
						fixedAreaInfos.right.size,
					-fixedAreaInfos.bottom.startOffset +
						viewPort.height -
						fixedAreaInfos.bottom.size
				);
			}
			if (!!fixedCells.left) {
				fixedArea.left = this._calculateBorderInfo(
					this._borderModel.getBorders(fixedCells.left.cellRange),
					fixedCells.left.cellRange,
					0,
					-currentScrollOffset.y
				);
			}
			if (!!fixedCells.top) {
				fixedArea.top = this._calculateBorderInfo(
					this._borderModel.getBorders(fixedCells.top.cellRange),
					fixedCells.top.cellRange,
					-currentScrollOffset.x,
					0
				);
			}
			if (!!fixedCells.right) {
				fixedArea.right = this._calculateBorderInfo(
					this._borderModel.getBorders(fixedCells.right.cellRange),
					fixedCells.right.cellRange,
					-fixedAreaInfos.right.startOffset +
						viewPort.width -
						fixedAreaInfos.right.size,
					-currentScrollOffset.y
				);
			}
			if (!!fixedCells.bottom) {
				fixedArea.bottom = this._calculateBorderInfo(
					this._borderModel.getBorders(fixedCells.bottom.cellRange),
					fixedCells.bottom.cellRange,
					-currentScrollOffset.x,
					-fixedAreaInfos.bottom.startOffset +
						viewPort.height -
						fixedAreaInfos.bottom.size
				);
			}

			result.inFixedAreas = fixedArea;
		}

		return result;
	}

	/**
	 * Calculate the resizer line rendering context.
	 */
	private _calculateResizerRenderContext(): IResizerRenderContext {
		const context: IResizerRenderContext = {
			showResizer: !!this._resizingDragStart,
			color: this._options.renderer.canvas.rowColumnResizing
				.resizerLineColor,
			thickness:
				this._options.renderer.canvas.rowColumnResizing
					.resizerLineThickness,
		};

		if (!!this._resizingDragStart) {
			context.isVertical = !this._resizingDragStart.info.overRow;
			context.offset = this._resizingDragStart.info.overRow
				? this._resizingDragStart.currentY
				: this._resizingDragStart.currentX;
		}

		return context;
	}

	/**
	 * Calculate the border infos for rendering borders.
	 * @param borders to calculate infos for
	 * @param range of the borders
	 * @param xBoundsAdjustment adjustment of the border x bounds
	 * @param yBoundsAdjustment adjustment of the border y bounds
	 */
	private _calculateBorderInfo(
		borders: IBorder[][],
		range: ICellRange,
		xBoundsAdjustment: number,
		yBoundsAdjustment: number
	): IBorderInfo[][] {
		const result: IBorderInfo[][] = [];

		for (let row = range.startRow; row <= range.endRow; row++) {
			const isRowHidden: boolean = this._cellModel.isRowHidden(row);
			if (!isRowHidden) {
				const borderInfos: IBorderInfo[] = [];

				for (
					let column = range.startColumn;
					column <= range.endColumn;
					column++
				) {
					const isColumnHidden: boolean =
						this._cellModel.isColumnHidden(column);
					if (!isColumnHidden) {
						const info: IBorderInfo = {
							border: borders[row - range.startRow][
								column - range.startColumn
							],
							bounds: this._cellModel.getBounds(
								CellRange.fromSingleRowColumn(row, column)
							),
						};

						// Adjust bounds
						info.bounds.top += yBoundsAdjustment;
						info.bounds.left += xBoundsAdjustment;

						borderInfos.push(info);
					}
				}

				result.push(borderInfos);
			}
		}

		return result;
	}

	/**
	 * Create information used to render cells later.
	 * @param viewPort to get cells for
	 * @param fixedAreaInfos infos about the fixed areas
	 */
	private _createCellRenderingInfo(
		viewPort: IRectangle,
		fixedAreaInfos: IFixedAreaInfos
	): ICellRenderContextCollection | null {
		/*
		We group cells to render per renderer name to improve rendering
		performance, as one renderer must only prepare once instead of
		everytime.
		 */
		const currentScrollOffset = this._viewportScroller.getScrollOffset();

		// Fetch cell range to paint for the current viewport
		let nonFixedCellsRange: ICellRange = this._cellModel.getRangeForRect({
			left: viewPort.left + fixedAreaInfos.left.size,
			top: viewPort.top + fixedAreaInfos.top.size,
			width:
				viewPort.width -
				fixedAreaInfos.left.size -
				fixedAreaInfos.right.size,
			height:
				viewPort.height -
				fixedAreaInfos.top.size -
				fixedAreaInfos.bottom.size,
		});

		// Remove fixed areas from cell range
		nonFixedCellsRange.startRow = Math.max(
			nonFixedCellsRange.startRow,
			fixedAreaInfos.top.endIndex + 1
		);
		nonFixedCellsRange.endRow = Math.min(
			nonFixedCellsRange.endRow,
			fixedAreaInfos.bottom.startIndex - 1
		);
		nonFixedCellsRange.startColumn = Math.max(
			nonFixedCellsRange.startColumn,
			fixedAreaInfos.left.endIndex + 1
		);
		nonFixedCellsRange.endColumn = Math.min(
			nonFixedCellsRange.endColumn,
			fixedAreaInfos.right.startIndex - 1
		);

		const rowCount: number = Math.max(
			0,
			nonFixedCellsRange.endRow - nonFixedCellsRange.startRow
		);
		const columnCount: number = Math.max(
			0,
			nonFixedCellsRange.endColumn - nonFixedCellsRange.startColumn
		);
		const cellCount: number = rowCount * columnCount;
		if (cellCount === 0) {
			return null; // There are no displayable scrollable cells -> error state
		}

		const usedCellRendererNames: Set<string> = new Set<string>();

		// Fill "normal" (non-fixed) cells first
		const nonFixedCells = this._createCellRenderArea(
			nonFixedCellsRange,
			{
				left: fixedAreaInfos.left.size,
				top: fixedAreaInfos.top.size,
				width:
					viewPort.width -
					fixedAreaInfos.left.size -
					fixedAreaInfos.right.size,
				height:
					viewPort.height -
					fixedAreaInfos.top.size -
					fixedAreaInfos.bottom.size,
			},
			-currentScrollOffset.x,
			-currentScrollOffset.y,
			usedCellRendererNames
		);

		const result: ICellRenderContextCollection = {
			nonFixedCells,
		};

		const fixedCells: IFixedCellAreaRenderContext = {};
		let hasFixedAreas: boolean = false;

		// Fill top fixed rows (if any)
		if (fixedAreaInfos.top.count > 0) {
			hasFixedAreas = true;
			fixedCells.top = this._createCellRenderArea(
				{
					startRow: fixedAreaInfos.top.startIndex,
					endRow: fixedAreaInfos.top.endIndex,
					startColumn: nonFixedCellsRange.startColumn,
					endColumn: nonFixedCellsRange.endColumn,
				},
				{
					left: fixedAreaInfos.left.size,
					top: fixedAreaInfos.top.startOffset,
					width:
						viewPort.width -
						fixedAreaInfos.left.size -
						fixedAreaInfos.right.size,
					height: fixedAreaInfos.top.size,
				},
				-currentScrollOffset.x,
				0,
				usedCellRendererNames
			);
		}

		// Fill bottom fixed rows (if any)
		if (fixedAreaInfos.bottom.count > 0) {
			hasFixedAreas = true;
			fixedCells.bottom = this._createCellRenderArea(
				{
					startRow: fixedAreaInfos.bottom.startIndex,
					endRow: fixedAreaInfos.bottom.endIndex,
					startColumn: nonFixedCellsRange.startColumn,
					endColumn: nonFixedCellsRange.endColumn,
				},
				{
					left: fixedAreaInfos.left.size,
					top: viewPort.height - fixedAreaInfos.bottom.size,
					width:
						viewPort.width -
						fixedAreaInfos.left.size -
						fixedAreaInfos.right.size,
					height: fixedAreaInfos.bottom.size,
				},
				-currentScrollOffset.x,
				-fixedAreaInfos.bottom.startOffset +
					viewPort.height -
					fixedAreaInfos.bottom.size,
				usedCellRendererNames
			);
		}

		// Fill left fixed columns (if any)
		if (fixedAreaInfos.left.count > 0) {
			hasFixedAreas = true;
			fixedCells.left = this._createCellRenderArea(
				{
					startRow: nonFixedCellsRange.startRow,
					endRow: nonFixedCellsRange.endRow,
					startColumn: fixedAreaInfos.left.startIndex,
					endColumn: fixedAreaInfos.left.endIndex,
				},
				{
					left: fixedAreaInfos.left.startOffset,
					top: fixedAreaInfos.top.size,
					width: fixedAreaInfos.left.size,
					height:
						viewPort.height -
						fixedAreaInfos.top.size -
						fixedAreaInfos.bottom.size,
				},
				0,
				-currentScrollOffset.y,
				usedCellRendererNames
			);
		}

		// Fill right fixed columns (if any)
		if (fixedAreaInfos.right.count > 0) {
			hasFixedAreas = true;
			fixedCells.right = this._createCellRenderArea(
				{
					startRow: nonFixedCellsRange.startRow,
					endRow: nonFixedCellsRange.endRow,
					startColumn: fixedAreaInfos.right.startIndex,
					endColumn: fixedAreaInfos.right.endIndex,
				},
				{
					left: viewPort.width - fixedAreaInfos.right.size,
					top: fixedAreaInfos.top.size,
					width: fixedAreaInfos.right.size,
					height:
						viewPort.height -
						fixedAreaInfos.top.size -
						fixedAreaInfos.bottom.size,
				},
				-fixedAreaInfos.right.startOffset +
					viewPort.width -
					fixedAreaInfos.right.size,
				-currentScrollOffset.y,
				usedCellRendererNames
			);
		}

		// Fill fixed left-top corner cells (if any)
		if (fixedAreaInfos.left.count > 0 && fixedAreaInfos.top.count > 0) {
			fixedCells.leftTop = this._createCellRenderArea(
				{
					startRow: fixedAreaInfos.top.startIndex,
					endRow: fixedAreaInfos.top.endIndex,
					startColumn: fixedAreaInfos.left.startIndex,
					endColumn: fixedAreaInfos.left.endIndex,
				},
				{
					left: fixedAreaInfos.left.startOffset,
					top: fixedAreaInfos.top.startOffset,
					width: fixedAreaInfos.left.size,
					height: fixedAreaInfos.top.size,
				},
				0,
				0,
				usedCellRendererNames
			);
		}

		// Fill fixed right-top corner cells (if any)
		if (fixedAreaInfos.right.count > 0 && fixedAreaInfos.top.count > 0) {
			fixedCells.rightTop = this._createCellRenderArea(
				{
					startRow: fixedAreaInfos.top.startIndex,
					endRow: fixedAreaInfos.top.endIndex,
					startColumn: fixedAreaInfos.right.startIndex,
					endColumn: fixedAreaInfos.right.endIndex,
				},
				{
					left: viewPort.width - fixedAreaInfos.right.size,
					top: fixedAreaInfos.top.startOffset,
					width: fixedAreaInfos.right.size,
					height: fixedAreaInfos.top.size,
				},
				-fixedAreaInfos.right.startOffset +
					viewPort.width -
					fixedAreaInfos.right.size,
				0,
				usedCellRendererNames
			);
		}

		// Fill fixed left-bottom corner cells (if any)
		if (fixedAreaInfos.left.count > 0 && fixedAreaInfos.bottom.count > 0) {
			fixedCells.leftBottom = this._createCellRenderArea(
				{
					startRow: fixedAreaInfos.bottom.startIndex,
					endRow: fixedAreaInfos.bottom.endIndex,
					startColumn: fixedAreaInfos.left.startIndex,
					endColumn: fixedAreaInfos.left.endIndex,
				},
				{
					left: fixedAreaInfos.left.startOffset,
					top: viewPort.height - fixedAreaInfos.bottom.size,
					width: fixedAreaInfos.left.size,
					height: fixedAreaInfos.bottom.size,
				},
				0,
				-fixedAreaInfos.bottom.startOffset +
					viewPort.height -
					fixedAreaInfos.bottom.size,
				usedCellRendererNames
			);
		}

		// Fill fixed right-bottom corner cells (if any)
		if (fixedAreaInfos.right.count > 0 && fixedAreaInfos.bottom.count > 0) {
			fixedCells.rightBottom = this._createCellRenderArea(
				{
					startRow: fixedAreaInfos.bottom.startIndex,
					endRow: fixedAreaInfos.bottom.endIndex,
					startColumn: fixedAreaInfos.right.startIndex,
					endColumn: fixedAreaInfos.right.endIndex,
				},
				{
					left: viewPort.width - fixedAreaInfos.right.size,
					top: viewPort.height - fixedAreaInfos.bottom.size,
					width: fixedAreaInfos.right.size,
					height: fixedAreaInfos.bottom.size,
				},
				-fixedAreaInfos.right.startOffset +
					viewPort.width -
					fixedAreaInfos.right.size,
				-fixedAreaInfos.bottom.startOffset +
					viewPort.height -
					fixedAreaInfos.bottom.size,
				usedCellRendererNames
			);
		}

		if (hasFixedAreas) {
			result.fixedCells = fixedCells;
		}

		// Cleanup cell renderers that have been used in previous rendering cycles but now not anymore
		for (const previouslyUsedCellRendererName of this
			._lastUsedCellRenderers) {
			if (!usedCellRendererNames.has(previouslyUsedCellRendererName)) {
				this._cellRendererLookup
					.get(previouslyUsedCellRendererName)
					.cleanup();
			}
		}
		this._lastUsedCellRenderers = usedCellRendererNames;

		return result;
	}

	/**
	 * Create cell area to render.
	 * @param range to create rendering lookup for
	 * @param viewPortBounds of the range
	 * @param xBoundsAdjustment adjustment of the x bounds of every cell in the range
	 * @param yBoundsAdjustment adjustment of the y bounds of every cell in the range
	 * @param usedCellRendererNames set of used cell renderer names
	 * @returns mapping of renderer names to all cells that need to be rendered with the renderer
	 */
	private _createCellRenderArea(
		range: ICellRange,
		viewPortBounds: IRectangle,
		xBoundsAdjustment: number,
		yBoundsAdjustment: number,
		usedCellRendererNames: Set<string>
	): ICellAreaRenderContext {
		const cellsPerRenderer = new Map<string, ICellRenderInfo[]>();
		const cells = this._cellModel.getCells(range);

		for (let i = 0; i < cells.length; i++) {
			const cell = cells[i];
			const bounds = this._cellModel.getBounds(cells[i].range);

			// Adjust bounds
			bounds.top += yBoundsAdjustment;
			bounds.left += xBoundsAdjustment;

			let cellsToRender: ICellRenderInfo[] = cellsPerRenderer.get(
				cell.rendererName
			);
			if (!cellsToRender) {
				cellsToRender = [];
				cellsPerRenderer.set(cell.rendererName, cellsToRender);
				usedCellRendererNames.add(cell.rendererName);
			}

			cellsToRender.push({
				cell,
				bounds,
			});
		}

		return {
			cellRange: range,
			viewPortBounds: viewPortBounds,
			cellsPerRenderer,
		};
	}

	/**
	 * Register a cell renderer responsible for
	 * rendering a single cells value.
	 * @param renderer to register
	 */
	public registerCellRenderer(renderer: ICellRenderer<any>): void {
		if (this._cellRendererLookup.has(renderer.getName())) {
			throw new Error(
				`Cell renderer with name '${renderer.getName()}' already registered`
			);
		}

		this._cellRendererLookup.set(
			renderer.getName(),
			renderer as ICanvasCellRenderer
		);
	}

	/**
	 * Get a cell renderer by its name.
	 * @param rendererName name of the renderer to get
	 */
	private _getCellRendererForName(rendererName: string): ICanvasCellRenderer {
		const cellRenderer: ICanvasCellRenderer =
			this._cellRendererLookup.get(rendererName);
		if (!cellRenderer) {
			throw new Error(
				`Could not find cell renderer for name '${rendererName}'`
			);
		}

		return cellRenderer;
	}

	/**
	 * Cleanup the cell viewport caches for cells that are out of the current viewport bounds.
	 * @param oldCells the former rendered cells
	 * @param newCells the new cells to render
	 */
	private _cleanupCellViewportCaches(
		oldCells: ICellRenderContextCollection,
		newCells: ICellRenderContextCollection
	): void {
		this._cleanupCellViewportCachesForOverlappingCellRanges(
			oldCells.nonFixedCells.cellRange,
			newCells.nonFixedCells.cellRange
		);
		if (!!oldCells.fixedCells && !!newCells.fixedCells) {
			if (!!oldCells.fixedCells.top && !!newCells.fixedCells.top) {
				this._cleanupCellViewportCachesForOverlappingCellRanges(
					oldCells.fixedCells.top.cellRange,
					newCells.fixedCells.top.cellRange
				);
			}
			if (!!oldCells.fixedCells.left && !!newCells.fixedCells.left) {
				this._cleanupCellViewportCachesForOverlappingCellRanges(
					oldCells.fixedCells.left.cellRange,
					newCells.fixedCells.left.cellRange
				);
			}
			if (!!oldCells.fixedCells.bottom && !!newCells.fixedCells.bottom) {
				this._cleanupCellViewportCachesForOverlappingCellRanges(
					oldCells.fixedCells.bottom.cellRange,
					newCells.fixedCells.bottom.cellRange
				);
			}
			if (!!oldCells.fixedCells.right && !!newCells.fixedCells.right) {
				this._cleanupCellViewportCachesForOverlappingCellRanges(
					oldCells.fixedCells.right.cellRange,
					newCells.fixedCells.right.cellRange
				);
			}
			if (
				!!oldCells.fixedCells.leftTop &&
				!!newCells.fixedCells.leftTop
			) {
				this._cleanupCellViewportCachesForOverlappingCellRanges(
					oldCells.fixedCells.leftTop.cellRange,
					newCells.fixedCells.leftTop.cellRange
				);
			}
			if (
				!!oldCells.fixedCells.rightTop &&
				!!newCells.fixedCells.rightTop
			) {
				this._cleanupCellViewportCachesForOverlappingCellRanges(
					oldCells.fixedCells.rightTop.cellRange,
					newCells.fixedCells.rightTop.cellRange
				);
			}
			if (
				!!oldCells.fixedCells.leftBottom &&
				!!newCells.fixedCells.leftBottom
			) {
				this._cleanupCellViewportCachesForOverlappingCellRanges(
					oldCells.fixedCells.leftBottom.cellRange,
					newCells.fixedCells.leftBottom.cellRange
				);
			}
			if (
				!!oldCells.fixedCells.rightBottom &&
				!!newCells.fixedCells.rightBottom
			) {
				this._cleanupCellViewportCachesForOverlappingCellRanges(
					oldCells.fixedCells.rightBottom.cellRange,
					newCells.fixedCells.rightBottom.cellRange
				);
			}
		}
	}

	/**
	 * Do something for each available cell area range.
	 * @param fct to do something with an cell area range (fixed corner, fixed rows, fixed columns, scrollable area)
	 */
	private _doForCellAreaRange(fct: (range: ICellRange) => void): void {
		if (!this._lastRenderingContext) {
			return;
		}

		const cells = this._lastRenderingContext.cells;
		if (!!cells.fixedCells) {
			const fixedCells = cells.fixedCells;

			if (!!fixedCells.rightBottom) {
				fct(fixedCells.rightBottom.cellRange);
			}
			if (!!fixedCells.rightTop) {
				fct(fixedCells.rightTop.cellRange);
			}
			if (!!fixedCells.leftBottom) {
				fct(fixedCells.leftBottom.cellRange);
			}
			if (!!fixedCells.leftTop) {
				fct(fixedCells.leftTop.cellRange);
			}
			if (!!fixedCells.bottom) {
				fct(fixedCells.bottom.cellRange);
			}
			if (!!fixedCells.right) {
				fct(fixedCells.right.cellRange);
			}
			if (!!fixedCells.top) {
				fct(fixedCells.top.cellRange);
			}
			if (!!fixedCells.left) {
				fct(fixedCells.left.cellRange);
			}
		}

		fct(cells.nonFixedCells.cellRange);
	}

	/**
	 * Cleanup the cell viewport caches for cells that are out of the AND operation between
	 * the two given cell ranges.
	 * @param oldRange the old cell range
	 * @param newRange the new cell range
	 */
	private _cleanupCellViewportCachesForOverlappingCellRanges(
		oldRange: ICellRange,
		newRange: ICellRange
	): void {
		const candidateRanges: ICellRange[] = CellRangeUtil.xor(
			oldRange,
			newRange
		);

		for (const range of candidateRanges) {
			this._cleanupCellViewportCachesForCellRange(
				range,
				(cellRange) => !CellRangeUtil.overlap(cellRange, newRange)
			);
		}
	}

	/**
	 * Cleanup all the viewport caches for all cells in the given cell range
	 * as long as they are completely invisible (merged cells might not be completely invisible).
	 * @param range to cleanup viewport caches of cells in
	 * @param mergedCellCleanupCheck check function whether to cleanup a merged cell as well
	 * @param includeHidden whether to include hidden cells in the cleanup (default=false)
	 */
	private _cleanupCellViewportCachesForCellRange(
		range: ICellRange,
		mergedCellCleanupCheck: (range) => boolean,
		includeHidden?: boolean
	): void {
		const cells: ICell[] = this._cellModel.getCells(range, {
			includeHidden,
		});

		for (const cell of cells) {
			// For merged cells make sure that the cell is completely disappeared from the viewport before clearing
			const isMergedCell: boolean = !CellRangeUtil.isSingleRowColumnRange(
				cell.range
			);
			if (isMergedCell) {
				const cleanupMergedCell: boolean = mergedCellCleanupCheck(
					cell.range
				);
				if (!cleanupMergedCell) {
					continue;
				}
			}

			// Clearing viewport cache property since the cell is no more visible
			this._getCellRendererForName(cell.rendererName).onDisappearing(
				cell
			);

			cell.viewportCache = undefined;
		}
	}

	/**
	 * Immediately render the table.
	 */
	private _render(): void {
		let creatingRenderingContextTime = window.performance.now();
		const renderingContext: IRenderContext | null =
			this._createRenderingContext();
		creatingRenderingContextTime =
			window.performance.now() - creatingRenderingContextTime;

		if (!!this._requestAnimationFrameID) {
			// Already requested animation frame that has not been executed yet -> cancel it and reschedule one
			window.cancelAnimationFrame(this._requestAnimationFrameID);
		}

		this._requestAnimationFrameID = window.requestAnimationFrame(() => {
			this._requestAnimationFrameID = null; // Mark as executed

			if (!!this._lastRenderingContext && !!renderingContext) {
				this._cleanupCellViewportCaches(
					this._lastRenderingContext.cells,
					renderingContext.cells
				);
			}
			this._lastRenderingContext = renderingContext;

			const ctx: CanvasRenderingContext2D = this._canvasContext;

			let renderingTime = window.performance.now();

			ctx.restore();
			ctx.save();

			const zoom: number = this._devicePixelRatio * this._zoom;
			ctx.scale(zoom, zoom);

			/*
			HTML5 Canvas calculates from half of a pixel which looks smoothed
			-> Fix this by offsetting by 0.5
			 */
			ctx.translate(0.5, 0.5);

			if (!!renderingContext) {
				CanvasRenderer._renderTable(ctx, renderingContext);
			} else {
				CanvasRenderer._renderError(
					ctx,
					this.getViewportSize(),
					this._options.renderer.canvas.error
				);
			}

			if (this._options.misc.debug) {
				console.log(
					`RENDERING: ${
						window.performance.now() - renderingTime
					}ms, CREATING RENDERING CONTEXT: ${creatingRenderingContextTime}ms`
				);
			}

			if (this._updateOverlaysAfterRenderCycle) {
				this._updateOverlaysAfterRenderCycle = false;

				this._updateOverlays();
			}
		});
	}

	private static _renderError(
		ctx: CanvasRenderingContext2D,
		viewportSize: ISize,
		errorOptions: IErrorOptions
	): void {
		const bounds: IRectangle = {
			left: errorOptions.padding,
			top: errorOptions.padding,
			width: viewportSize.width - errorOptions.padding * 2,
			height: viewportSize.height - errorOptions.padding * 2,
		};

		ctx.font = `${errorOptions.fontSize}px ${errorOptions.fontFamily}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		// Layout paragraph
		const paragraph: IParagraph = errorOptions.lineWrapper.wrap(
			errorOptions.tooSmallViewportMessage,
			bounds.width,
			errorOptions.lineHeight * errorOptions.fontSize,
			(str) => ctx.measureText(str).width
		);
		const paragraphHeight: number =
			paragraph.lines.length * paragraph.lineHeight;

		// Fill background
		ctx.fillStyle = Colors.toStyleStr(errorOptions.backgroundColor);
		ctx.fillRect(0, 0, viewportSize.width, viewportSize.height);

		// Draw error message
		const isOverflowing: boolean = paragraphHeight > bounds.height;
		if (isOverflowing) {
			const clippingRegion = new Path2D();
			clippingRegion.rect(
				bounds.left,
				bounds.top,
				bounds.width,
				bounds.height
			);

			ctx.save();
			ctx.clip(clippingRegion);
		}

		const xOffset: number = bounds.left + bounds.width / 2;
		let yOffset: number =
			bounds.top + (bounds.height - paragraphHeight) / 2;

		ctx.fillStyle = Colors.toStyleStr(errorOptions.textColor);
		for (const line of paragraph.lines) {
			ctx.fillText(line.text, xOffset, yOffset);

			yOffset += paragraph.lineHeight;
		}

		if (isOverflowing) {
			ctx.restore();
		}
	}

	private static _renderTable(
		ctx: CanvasRenderingContext2D,
		renderingContext: IRenderContext
	): void {
		// Render "normal" (non-fixed) cells first
		CanvasRenderer._renderArea(
			ctx,
			renderingContext,
			renderingContext.cells.nonFixedCells,
			renderingContext.borders.inNonFixedArea,
			renderingContext.selection?.inNonFixedArea,
			true
		);

		// Then render fixed cells (if any).
		if (!!renderingContext.cells.fixedCells) {
			const fixedCells = renderingContext.cells.fixedCells;

			if (!!fixedCells.left) {
				CanvasRenderer._renderArea(
					ctx,
					renderingContext,
					fixedCells.left,
					renderingContext.borders.inFixedAreas.left,
					renderingContext.selection?.inFixedArea?.left
				);
			}
			if (!!fixedCells.top) {
				CanvasRenderer._renderArea(
					ctx,
					renderingContext,
					fixedCells.top,
					renderingContext.borders.inFixedAreas.top,
					renderingContext.selection?.inFixedArea?.top
				);
			}
			if (!!fixedCells.right) {
				CanvasRenderer._renderArea(
					ctx,
					renderingContext,
					fixedCells.right,
					renderingContext.borders.inFixedAreas.right,
					renderingContext.selection?.inFixedArea?.right
				);
			}
			if (!!fixedCells.bottom) {
				CanvasRenderer._renderArea(
					ctx,
					renderingContext,
					fixedCells.bottom,
					renderingContext.borders.inFixedAreas.bottom,
					renderingContext.selection?.inFixedArea?.bottom
				);
			}
			if (!!fixedCells.leftTop) {
				CanvasRenderer._renderArea(
					ctx,
					renderingContext,
					fixedCells.leftTop,
					renderingContext.borders.inFixedAreas.leftTop,
					renderingContext.selection?.inFixedArea?.leftTop
				);
			}
			if (!!fixedCells.rightTop) {
				CanvasRenderer._renderArea(
					ctx,
					renderingContext,
					fixedCells.rightTop,
					renderingContext.borders.inFixedAreas.rightTop,
					renderingContext.selection?.inFixedArea?.rightTop
				);
			}
			if (!!fixedCells.leftBottom) {
				CanvasRenderer._renderArea(
					ctx,
					renderingContext,
					fixedCells.leftBottom,
					renderingContext.borders.inFixedAreas.leftBottom,
					renderingContext.selection?.inFixedArea?.leftBottom
				);
			}
			if (!!fixedCells.rightBottom) {
				CanvasRenderer._renderArea(
					ctx,
					renderingContext,
					fixedCells.rightBottom,
					renderingContext.borders.inFixedAreas.rightBottom,
					renderingContext.selection?.inFixedArea?.rightBottom
				);
			}
		}

		// Render scrollbars
		CanvasRenderer._renderScrollBars(ctx, renderingContext);

		// Render resizing visualization (if currently resizing)
		CanvasRenderer._renderResizerVisualization(ctx, renderingContext);
	}

	/**
	 * (Re)-Render the table.
	 */
	public render(): void {
		if (!this._lastRenderingContext) {
			this._render();
		} else {
			this._repaintScheduler.next();
		}
	}

	/**
	 * Render a specific area of the table (non-fixed cell area, fixed rows area,
	 * fixed columns area, fixed corner area).
	 * @param ctx to render with
	 * @param context the rendering context
	 * @param cellArea to render for the area
	 * @param borders to render
	 * @param selectionInfos to render for the area
	 * @param clipArea whether to clip the area so every drawing outside the area is removed
	 */
	private static _renderArea(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext,
		cellArea: ICellAreaRenderContext,
		borders: IBorderInfo[][],
		selectionInfos?: ISelectionRenderInfo[],
		clipArea: boolean = true
	): void {
		let restoreContext = false;
		if (clipArea) {
			// Clip drawing to allowed area
			const clippingRegion = new Path2D();
			clippingRegion.rect(
				cellArea.viewPortBounds.left,
				cellArea.viewPortBounds.top,
				cellArea.viewPortBounds.width,
				cellArea.viewPortBounds.height
			);
			ctx.save();
			ctx.clip(clippingRegion);
			restoreContext = true;
		}

		CanvasRenderer._renderAreaCells(ctx, context, cellArea);
		CanvasRenderer._renderBorders(ctx, context, borders);

		// Render selection that may be displayed the area
		if (!!selectionInfos) {
			CanvasRenderer._renderSelections(ctx, context, selectionInfos);
		}

		if (restoreContext) {
			ctx.restore();
		}
	}

	/**
	 * Render cells for the passed cell area.
	 * @param ctx to render with
	 * @param context the rendering context
	 * @param cellArea to render
	 */
	private static _renderAreaCells(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext,
		cellArea: ICellAreaRenderContext
	): void {
		// Clear area first
		ctx.clearRect(
			cellArea.viewPortBounds.left,
			cellArea.viewPortBounds.top,
			cellArea.viewPortBounds.width,
			cellArea.viewPortBounds.height
		);

		for (const [
			rendererName,
			cellsToRender,
		] of cellArea.cellsPerRenderer.entries()) {
			const cellRenderer: ICanvasCellRenderer =
				context.renderers.get(rendererName);
			if (!cellRenderer) {
				throw new Error(
					`Could not find cell renderer for name '${rendererName}'`
				);
			}

			if (cellsToRender.length === 0) {
				cellRenderer.cleanup();
			} else {
				// Tell cell renderer that we will soon render a bunch of cells with it.
				cellRenderer.before(ctx, context);

				for (const cellToRender of cellsToRender) {
					cellRenderer.render(
						ctx,
						cellToRender.cell,
						cellToRender.bounds
					);
				}

				// Notify cell renderer that we have rendered all cells for this rendering cycle.
				cellRenderer.after(ctx);
			}
		}
	}

	/**
	 * Render borders for the passed cellsPerRenderer map.
	 * @param ctx to render with
	 * @param context the rendering context
	 * @param borders to render
	 */
	private static _renderBorders(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext,
		borders: IBorderInfo[][]
	): void {
		for (let row = 0; row < borders.length; row++) {
			for (let column = 0; column < borders[row].length; column++) {
				const borderInfo: IBorderInfo = borders[row][column];

				const bounds: IRectangle = borderInfo.bounds;
				const border: IBorder = borderInfo.border;

				// Draw upper border only for first row
				if (row === 0) {
					if (!!border.top) {
						CanvasRenderer._applyBorderStyle(ctx, border.top);

						ctx.beginPath();
						ctx.moveTo(bounds.left, bounds.top);
						ctx.lineTo(bounds.left + bounds.width, bounds.top);
						ctx.stroke();
					}
				}

				// Draw left border only for first column
				if (column === 0) {
					if (!!border.left) {
						CanvasRenderer._applyBorderStyle(ctx, border.left);

						ctx.beginPath();
						ctx.moveTo(bounds.left, bounds.top);
						ctx.lineTo(bounds.left, bounds.top + bounds.height);
						ctx.stroke();
					}
				}

				// Draw right border
				if (!!border.right) {
					const upperCrossingBorderEnvironment =
						CanvasRenderer._determineCrossingBorderEnvironment(
							[
								border.right,
								row > 0
									? borders[row - 1][column].border.right
									: null,
							],
							[
								border.top,
								column < borders[row].length - 1
									? borders[row][column + 1].border.top
									: null,
							]
						);
					let topOffset: number =
						(upperCrossingBorderEnvironment.dominantBorderSide ===
						border.right
							? -1
							: 1) *
						(!!upperCrossingBorderEnvironment.dominantHorizontalSide
							? upperCrossingBorderEnvironment
									.dominantHorizontalSide.size / 2
							: 0);

					const lowerCrossingBorderEnvironment =
						CanvasRenderer._determineCrossingBorderEnvironment(
							[
								border.right,
								row < borders.length - 1
									? borders[row + 1][column].border.right
									: null,
							],
							[
								border.bottom,
								column < borders[row].length - 1
									? borders[row][column + 1].border.bottom
									: null,
							]
						);
					let bottomOffset: number =
						(lowerCrossingBorderEnvironment.dominantBorderSide ===
						border.right
							? -1
							: 1) *
						(!!lowerCrossingBorderEnvironment.dominantHorizontalSide
							? lowerCrossingBorderEnvironment
									.dominantHorizontalSide.size / 2
							: 0);

					CanvasRenderer._applyBorderStyle(ctx, border.right);

					ctx.beginPath();
					ctx.moveTo(
						bounds.left + bounds.width,
						bounds.top + topOffset
					);
					ctx.lineTo(
						bounds.left + bounds.width,
						bounds.top + bounds.height - bottomOffset
					);
					ctx.stroke();
				}

				// Draw lower border
				if (!!border.bottom) {
					const leftCrossingBorderEnvironment =
						CanvasRenderer._determineCrossingBorderEnvironment(
							[
								border.left,
								row < borders.length - 1
									? borders[row + 1][column].border.left
									: null,
							],
							[
								border.bottom,
								column > 0
									? borders[row][column - 1].border.bottom
									: null,
							]
						);
					let leftOffset: number =
						(leftCrossingBorderEnvironment.dominantBorderSide ===
						border.bottom
							? -1
							: 1) *
						(!!leftCrossingBorderEnvironment.dominantVerticalSide
							? leftCrossingBorderEnvironment.dominantVerticalSide
									.size / 2
							: 0);

					const rightCrossingBorderEnvironment =
						CanvasRenderer._determineCrossingBorderEnvironment(
							[
								border.right,
								row < borders.length - 1
									? borders[row + 1][column].border.right
									: null,
							],
							[
								border.bottom,
								column < borders[row].length - 1
									? borders[row][column + 1].border.bottom
									: null,
							]
						);
					let rightOffset: number =
						(rightCrossingBorderEnvironment.dominantBorderSide ===
						border.bottom
							? -1
							: 1) *
						(!!rightCrossingBorderEnvironment.dominantVerticalSide
							? rightCrossingBorderEnvironment
									.dominantVerticalSide.size / 2
							: 0);

					CanvasRenderer._applyBorderStyle(ctx, border.bottom);

					ctx.beginPath();
					ctx.moveTo(
						bounds.left + leftOffset,
						bounds.top + bounds.height
					);
					ctx.lineTo(
						bounds.left + bounds.width - rightOffset,
						bounds.top + bounds.height
					);
					ctx.stroke();
				}
			}
		}

		// Clear line dash setting
		ctx.setLineDash([]);
	}

	/**
	 * Determine the environment describing crossing border sides.
	 * @param verticalSides border sides running vertically
	 * @param horizontalSides border sides running horizontally
	 */
	private static _determineCrossingBorderEnvironment(
		verticalSides: IBorderSide[],
		horizontalSides: IBorderSide[]
	): ICrossingBorderEnvironment {
		return {
			dominantBorderSide: CanvasRenderer._determineDominantBorderSide([
				...verticalSides,
				...horizontalSides,
			]),
			dominantHorizontalSide:
				CanvasRenderer._determineDominantBorderSide(horizontalSides),
			dominantVerticalSide:
				CanvasRenderer._determineDominantBorderSide(verticalSides),
		};
	}

	/**
	 * Determine the dominant border side among the passed.
	 * @param sides to determine dominant border side in
	 */
	private static _determineDominantBorderSide(
		sides: IBorderSide[]
	): IBorderSide {
		let dominant: IBorderSide = null;
		for (const side of sides) {
			if (!side) {
				continue;
			}

			if (!dominant) {
				dominant = side;
			} else if (side.size > dominant.size) {
				dominant = side;
			} else if (side.size === dominant.size) {
				// Has same size -> let the color density decide (higher density wins)
				if (dominant.isDefault) {
					dominant = side;
				} else if (
					!side.isDefault &&
					CanvasRenderer._calculateColorDensity(side.color) <
						CanvasRenderer._calculateColorDensity(dominant.color)
				) {
					dominant = side;
				}
			}
		}

		return dominant;
	}

	/**
	 * Calculate the density of the passed color.
	 * @param color to calculate density for
	 */
	private static _calculateColorDensity(color: IColor): number {
		return (
			((color.red << 16) + (color.green << 8) + color.blue) * color.alpha
		);
	}

	/**
	 * Apply the border style of the passed border side.
	 * @param ctx to apply style to
	 * @param side to get style from
	 */
	private static _applyBorderStyle(
		ctx: CanvasRenderingContext2D,
		side: IBorderSide
	): void {
		ctx.strokeStyle = Colors.toStyleStr(side.color);
		ctx.lineWidth = side.size;
		ctx.lineCap = 'butt';

		if (side.style === BorderStyle.SOLID) {
			ctx.setLineDash([]);
		} else if (side.style === BorderStyle.DOTTED) {
			ctx.setLineDash([side.size, side.size]);
		} else if (side.style === BorderStyle.DASHED) {
			ctx.setLineDash([5 * side.size, 5 * side.size]);
		}
	}

	/**
	 * Render the scroll bars.
	 * @param ctx to render with
	 * @param context the rendering context
	 */
	private static _renderResizerVisualization(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext
	): void {
		if (!context.resizer.showResizer) {
			return;
		}

		// Setup drawing context
		ctx.strokeStyle = Colors.toStyleStr(context.resizer.color);
		ctx.lineWidth = context.resizer.thickness;

		// Draw line
		ctx.beginPath();

		if (context.resizer.isVertical) {
			ctx.moveTo(context.resizer.offset, 0);
			ctx.lineTo(context.resizer.offset, context.viewPort.height);
		} else {
			ctx.moveTo(0, context.resizer.offset);
			ctx.lineTo(context.viewPort.width, context.resizer.offset);
		}

		ctx.stroke();
	}

	/**
	 * Render the scroll bars.
	 * @param ctx to render with
	 * @param context the rendering context
	 */
	private static _renderScrollBars(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext
	): void {
		ctx.fillStyle = Colors.toStyleStr(context.scrollBar.color);

		// Draw vertical scrollbar (if needed)
		if (!!context.scrollBar.vertical) {
			CanvasUtil.makeRoundRectPath(
				ctx,
				{
					left: context.scrollBar.vertical.x,
					top: context.scrollBar.vertical.y,
					width: context.scrollBar.vertical.size,
					height: context.scrollBar.vertical.length,
				},
				context.scrollBar.cornerRadius
			);
			ctx.fill();
		}

		// Draw horizontal scrollbar (if needed)
		if (!!context.scrollBar.horizontal) {
			CanvasUtil.makeRoundRectPath(
				ctx,
				{
					left: context.scrollBar.horizontal.x,
					top: context.scrollBar.horizontal.y,
					width: context.scrollBar.horizontal.length,
					height: context.scrollBar.horizontal.size,
				},
				context.scrollBar.cornerRadius
			);
			ctx.fill();
		}
	}

	/**
	 * Render the selections.
	 * @param ctx to render with
	 * @param context the rendering context
	 * @param infos rendering infos about selection rectangles to draw
	 */
	private static _renderSelections(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext,
		infos: ISelectionRenderInfo[]
	): void {
		ctx.fillStyle = Colors.toStyleStr(
			context.focused
				? context.selection.options.secondary.backgroundColor
				: context.selection.options.secondary.backgroundColorUnfocused
		);
		ctx.strokeStyle = Colors.toStyleStr(
			context.focused
				? context.selection.options.secondary.borderColor
				: context.selection.options.secondary.borderColorUnfocused
		);
		ctx.lineWidth = context.selection.options.borderSize;

		for (const info of infos) {
			if (info.isPrimary) {
				ctx.fillStyle = Colors.toStyleStr(
					context.focused
						? context.selection.options.primary.backgroundColor
						: context.selection.options.primary
								.backgroundColorUnfocused
				);
				ctx.strokeStyle = Colors.toStyleStr(
					context.focused
						? context.selection.options.primary.borderColor
						: context.selection.options.primary.borderColorUnfocused
				);

				if (!!info.initial) {
					// Fill area over initial (if necessary)
					if (info.initial.top - info.bounds.top > 0) {
						ctx.fillRect(
							info.bounds.left,
							info.bounds.top,
							info.bounds.width,
							info.initial.top - info.bounds.top
						);
					}

					// Fill area left of initial (if necessary)
					if (info.initial.left - info.bounds.left > 0) {
						ctx.fillRect(
							info.bounds.left,
							info.initial.top,
							info.initial.left - info.bounds.left,
							info.initial.height
						);
					}

					// Fill area under initial (if necessary)
					const underHeight: number =
						info.bounds.top +
						info.bounds.height -
						(info.initial.top + info.initial.height);
					if (underHeight > 0) {
						ctx.fillRect(
							info.bounds.left,
							info.initial.top + info.initial.height,
							info.bounds.width,
							underHeight
						);
					}

					// Fill area right of initial (if necessary)
					const rightWidth: number =
						info.bounds.left +
						info.bounds.width -
						(info.initial.left + info.initial.width);
					if (rightWidth > 0) {
						ctx.fillRect(
							info.initial.left + info.initial.width,
							info.initial.top,
							rightWidth,
							info.initial.height
						);
					}
				} else {
					ctx.fillRect(
						info.bounds.left,
						info.bounds.top,
						info.bounds.width,
						info.bounds.height
					);
				}

				// Stroke
				ctx.strokeRect(
					info.bounds.left,
					info.bounds.top,
					info.bounds.width,
					info.bounds.height
				);

				// Render copy handle (if enabled)
				if (info.renderCopyHandle) {
					const copyHandleSize: number =
						context.selection.options.copyHandle.size;
					const copyHandlePadding: number =
						context.selection.options.copyHandle.padding;

					const copyHandleX: number =
						info.bounds.left +
						info.bounds.width -
						copyHandleSize / 2;
					const copyHandleY: number =
						info.bounds.top +
						info.bounds.height -
						copyHandleSize / 2;

					// Fill padding rectangle first
					ctx.fillStyle = Colors.toStyleStr(Colors.WHITE);
					ctx.fillRect(
						copyHandleX - copyHandlePadding,
						copyHandleY - copyHandlePadding,
						copyHandleSize + copyHandlePadding,
						copyHandleSize + copyHandlePadding
					);

					// Fill copy-handle rectangle next
					ctx.fillStyle = Colors.toStyleStr(
						context.focused
							? context.selection.options.primary.borderColor
							: context.selection.options.primary
									.borderColorUnfocused
					);
					ctx.fillRect(
						copyHandleX,
						copyHandleY,
						copyHandleSize,
						copyHandleSize
					);

					context.selection.copyHandle.isRendered = true;
					context.selection.copyHandle.bounds = {
						top: copyHandleY,
						left: copyHandleX,
						width: copyHandleSize,
						height: copyHandleSize,
					};
				}

				// Reset colors
				ctx.fillStyle = Colors.toStyleStr(
					context.focused
						? context.selection.options.secondary.backgroundColor
						: context.selection.options.secondary
								.backgroundColorUnfocused
				);
				ctx.strokeStyle = Colors.toStyleStr(
					context.focused
						? context.selection.options.secondary.borderColor
						: context.selection.options.secondary
								.borderColorUnfocused
				);
			} else {
				ctx.fillRect(
					info.bounds.left,
					info.bounds.top,
					info.bounds.width,
					info.bounds.height
				);
				ctx.strokeRect(
					info.bounds.left,
					info.bounds.top,
					info.bounds.width,
					info.bounds.height
				);
			}
		}
	}

	/**
	 * Add an overlay.
	 * @param overlay to add
	 */
	public addOverlay(overlay: IOverlay): void {
		this._overlays.push(overlay);

		// Add overlay to overlay container
		this._overlayContainer.appendChild(overlay.element);

		// Set initial styles
		overlay.element.style.position = 'absolute';

		// Initially layout the overlay element
		this._layoutOverlay(overlay);
	}

	/**
	 * Update the given overlay.
	 * @param overlay to update
	 */
	public updateOverlay(overlay: IOverlay): void {
		// Schedule an overlay update for the passed overlay
		this._updateOverlaysAfterRenderCycle = true;
		this._overlaysToUpdateAfterRenderCycle.push(overlay);
	}

	/**
	 * Update all overlays.
	 */
	private _updateOverlays(): void {
		const toUpdate: IOverlay[] =
			this._overlaysToUpdateAfterRenderCycle.length > 0
				? this._overlaysToUpdateAfterRenderCycle
				: this.getOverlays();

		for (const overlay of toUpdate) {
			this._layoutOverlay(overlay);
		}

		if (this._overlaysToUpdateAfterRenderCycle.length > 0) {
			this._overlaysToUpdateAfterRenderCycle.length = 0;
		}
	}

	/**
	 * Layout the given overlay properly.
	 * @param overlay to layout
	 */
	private _layoutOverlay(overlay: IOverlay): void {
		const viewportSize: ISize = this.getViewportSize();
		const fixedAreaInfos: IFixedAreaInfos = this.getFixedAreaInfos();
		const currentScrollOffset = this._viewportScroller.getScrollOffset();

		let startY: number = overlay.bounds.top;
		let endY: number = overlay.bounds.top + overlay.bounds.height;

		let top: number = startY;
		let startYInScrollableArea: boolean = false;
		if (startY >= fixedAreaInfos.bottom.startOffset) {
			const offsetFromBottom = fixedAreaInfos.bottom.endOffset - startY;
			startY = viewportSize.height - offsetFromBottom;
			top = startY;
		} else if (startY >= fixedAreaInfos.top.size) {
			startY = Math.max(
				Math.min(
					startY - currentScrollOffset.y,
					viewportSize.height - fixedAreaInfos.bottom.size
				),
				fixedAreaInfos.top.size
			);
			top -= currentScrollOffset.y;
			startYInScrollableArea = true;
		}
		if (endY >= fixedAreaInfos.bottom.startOffset) {
			const offsetFromBottom = fixedAreaInfos.bottom.endOffset - endY;
			endY = viewportSize.height - offsetFromBottom;

			if (startYInScrollableArea) {
				startY = Math.min(
					startY,
					viewportSize.height - fixedAreaInfos.bottom.size
				);
				top = startY;
			}
		} else if (endY >= fixedAreaInfos.top.size) {
			endY = Math.max(
				Math.min(
					endY - currentScrollOffset.y,
					viewportSize.height - fixedAreaInfos.bottom.size
				),
				fixedAreaInfos.top.size
			);
		}
		let height: number = endY - startY;

		let startX: number = overlay.bounds.left;
		let endX: number = overlay.bounds.left + overlay.bounds.width;

		let left: number = overlay.bounds.left;
		let startXInScrollableArea: boolean = false;
		if (startX >= fixedAreaInfos.right.startOffset) {
			const offsetFromRight = fixedAreaInfos.right.endOffset - startX;
			startX = viewportSize.width - offsetFromRight;
			left = startX;
		} else if (startX >= fixedAreaInfos.left.size) {
			startX = Math.max(
				Math.min(
					startX - currentScrollOffset.x,
					viewportSize.width - fixedAreaInfos.right.size
				),
				fixedAreaInfos.left.size
			);
			left -= currentScrollOffset.x;
			startXInScrollableArea = true;
		}
		if (endX >= fixedAreaInfos.right.startOffset) {
			const offsetFromRight = fixedAreaInfos.right.endOffset - endX;
			endX = viewportSize.width - offsetFromRight;

			if (startXInScrollableArea) {
				startX = Math.min(
					startX,
					viewportSize.width - fixedAreaInfos.right.size
				);
				left = startX;
			}
		} else if (endX >= fixedAreaInfos.left.size) {
			endX = Math.max(
				Math.min(
					endX - currentScrollOffset.x,
					viewportSize.width - fixedAreaInfos.right.size
				),
				fixedAreaInfos.left.size
			);
		}
		let width: number = endX - startX;

		const isVisible: boolean =
			height > 0 &&
			top < viewportSize.height &&
			width > 0 &&
			left < viewportSize.width;
		if (isVisible) {
			overlay.element.style.display = 'block';
			overlay.element.style.overflow = 'hidden';

			overlay.element.style.left = `${left * this.getZoom()}px`;
			overlay.element.style.top = `${top * this.getZoom()}px`;
			overlay.element.style.width = `${overlay.bounds.width}px`;
			overlay.element.style.height = `${overlay.bounds.height}px`;

			const clipLeft: boolean = left < startX;
			const clipRight: boolean = left + overlay.bounds.width > endX;
			const clipTop: boolean = top < startY;
			const clipBottom: boolean = top + overlay.bounds.height > endY;
			if (clipLeft || clipRight || clipTop || clipBottom) {
				const leftClipping: number = clipLeft ? startX - left : 0;
				const rightClipping: number = clipRight
					? left + overlay.bounds.width - endX
					: 0;
				const topClipping: number = clipTop ? startY - top : 0;
				const bottomClipping: number = clipBottom
					? top + overlay.bounds.height - endY
					: 0;

				overlay.element.style.clipPath = `inset(${topClipping}px ${rightClipping}px ${bottomClipping}px ${leftClipping}px)`;
			} else if (overlay.element.style.clipPath.length > 0) {
				overlay.element.style.clipPath = '';
			}

			if (this.getZoom() > 1) {
				overlay.element.style.transform = `scale(${this.getZoom()})`;
				overlay.element.style.transformOrigin = 'left top';
			} else if (overlay.element.style.transform.length > 0) {
				overlay.element.style.transform = '';
				overlay.element.style.transformOrigin = '';
			}
		} else {
			overlay.element.style.display = 'none';
		}
	}

	/**
	 * Remove the passed overlay.
	 * @param overlay to remove
	 */
	public removeOverlay(overlay: IOverlay): void {
		const index = this._overlays.indexOf(overlay);
		if (index > -1) {
			this._overlays.splice(index, 1);
			this._overlayContainer.removeChild(overlay.element);
		}
	}

	/**
	 * Get all available overlays.
	 */
	public getOverlays(): IOverlay[] {
		return this._overlays;
	}

	/**
	 * Update the selection scroll prevention.
	 * Selection scroll prevention is used to prevent the page from scrolling
	 * when the user drags (mouse down + mouse move) the cursor out of the
	 * viewport. Normally the page would scroll in that direction which we
	 * do not want when we are actually dragging something in the table around.
	 */
	private _updateSelectionScrollPrevention() {
		const enablePrevention: boolean = this._isDragging();
		const isCurrentlyEnabled: boolean =
			this._selectionScrollPreventionEnabled;

		if (enablePrevention && !isCurrentlyEnabled) {
			this._beforeSelectionScrollPreventionUserSelectPropertyValue =
				document.body.style.userSelect;
			document.body.style.userSelect = 'none';
			this._selectionScrollPreventionEnabled = true;
		} else if (!enablePrevention && isCurrentlyEnabled) {
			document.body.style.userSelect =
				this._beforeSelectionScrollPreventionUserSelectPropertyValue;
			this._selectionScrollPreventionEnabled = false;
		}
	}

	/**
	 * Check whether something is currently being dragged (mouse down + mouse move) inside the table.
	 */
	private _isDragging(): boolean {
		const isScrollBarDragging: boolean = !!this._scrollBarDragStart;
		const isMouseDragging: boolean = !!this._mouseDragStart;
		const isSelectionDragging: boolean = !!this._initialSelectionRange;
		const isCopyHandleDragging: boolean = !!this._copyHandleDragStart;
		const isResizerDragging: boolean = !!this._resizingDragStart;

		return (
			isScrollBarDragging ||
			isMouseDragging ||
			isSelectionDragging ||
			isCopyHandleDragging ||
			isResizerDragging
		);
	}

	/**
	 * Check with which areas of the table the passed range intersects.
	 * @param range to check intersections with all table areas
	 * @param fixedAreaInfos infos about the fixed areas of the table
	 */
	private static _checkTableAreaIntersection(
		range: ICellRange,
		fixedAreaInfos: IFixedAreaInfos
	): ITableAreaMask {
		return {
			nonFixed: CellRangeUtil.overlap(range, {
				startRow: fixedAreaInfos.top.endIndex + 1,
				endRow: fixedAreaInfos.bottom.startIndex - 1,
				startColumn: fixedAreaInfos.left.endIndex + 1,
				endColumn: fixedAreaInfos.right.startIndex - 1,
			}),
			fixed: {
				top:
					fixedAreaInfos.top.count > 0
						? CellRangeUtil.overlap(range, {
								startRow: fixedAreaInfos.top.startIndex,
								endRow: fixedAreaInfos.top.endIndex,
								startColumn: fixedAreaInfos.left.endIndex + 1,
								endColumn: fixedAreaInfos.right.startIndex - 1,
						  })
						: false,
				bottom:
					fixedAreaInfos.bottom.count > 0
						? CellRangeUtil.overlap(range, {
								startRow: fixedAreaInfos.bottom.startIndex,
								endRow: fixedAreaInfos.bottom.endIndex,
								startColumn: fixedAreaInfos.left.endIndex + 1,
								endColumn: fixedAreaInfos.right.startIndex - 1,
						  })
						: false,
				left:
					fixedAreaInfos.left.count > 0
						? CellRangeUtil.overlap(range, {
								startRow: fixedAreaInfos.top.endIndex + 1,
								endRow: fixedAreaInfos.bottom.startIndex - 1,
								startColumn: fixedAreaInfos.left.startIndex,
								endColumn: fixedAreaInfos.left.endIndex,
						  })
						: false,
				right:
					fixedAreaInfos.right.count > 0
						? CellRangeUtil.overlap(range, {
								startRow: fixedAreaInfos.top.endIndex + 1,
								endRow: fixedAreaInfos.bottom.startIndex - 1,
								startColumn: fixedAreaInfos.right.startIndex,
								endColumn: fixedAreaInfos.right.endIndex,
						  })
						: false,
				leftTop:
					fixedAreaInfos.left.count > 0 &&
					fixedAreaInfos.top.count > 0
						? CellRangeUtil.overlap(range, {
								startRow: fixedAreaInfos.top.startIndex,
								endRow: fixedAreaInfos.top.endIndex,
								startColumn: fixedAreaInfos.left.startIndex,
								endColumn: fixedAreaInfos.left.endIndex,
						  })
						: false,
				leftBottom:
					fixedAreaInfos.left.count > 0 &&
					fixedAreaInfos.bottom.count > 0
						? CellRangeUtil.overlap(range, {
								startRow: fixedAreaInfos.bottom.startIndex,
								endRow: fixedAreaInfos.bottom.endIndex,
								startColumn: fixedAreaInfos.left.startIndex,
								endColumn: fixedAreaInfos.left.endIndex,
						  })
						: false,
				rightTop:
					fixedAreaInfos.right.count > 0 &&
					fixedAreaInfos.top.count > 0
						? CellRangeUtil.overlap(range, {
								startRow: fixedAreaInfos.top.startIndex,
								endRow: fixedAreaInfos.top.endIndex,
								startColumn: fixedAreaInfos.right.startIndex,
								endColumn: fixedAreaInfos.right.endIndex,
						  })
						: false,
				rightBottom:
					fixedAreaInfos.right.count > 0 &&
					fixedAreaInfos.bottom.count > 0
						? CellRangeUtil.overlap(range, {
								startRow: fixedAreaInfos.bottom.startIndex,
								endRow: fixedAreaInfos.bottom.endIndex,
								startColumn: fixedAreaInfos.right.startIndex,
								endColumn: fixedAreaInfos.right.endIndex,
						  })
						: false,
			},
		};
	}
}

/**
 * Context filled with data used to render the table.
 */
export interface IRenderContext {
	/**
	 * Whether the table is focused.
	 */
	focused: boolean;

	/**
	 * Viewport to render.
	 */
	viewPort: IRectangle;

	/**
	 * Infos about the fixed areas in the viewport.
	 */
	fixedAreaInfos: IFixedAreaInfos;

	/**
	 * Full size of the table.
	 */
	tableSize: ISize;

	/**
	 * Infos about all cells to render.
	 */
	cells: ICellRenderContextCollection;

	/**
	 * Rendering context of the scrollbars.
	 */
	scrollBar: IScrollBarRenderContext;

	/**
	 * Rendering context of the selections.
	 */
	selection?: ISelectionRenderContext;

	/**
	 * Rendering context of the borders.
	 */
	borders: IBorderRenderContext;

	/**
	 * Rendering context of the resizer visualization (when resizing rows/columns).
	 */
	resizer: IResizerRenderContext;

	/**
	 * Lookup for cell renderers.
	 */
	renderers: Map<string, ICanvasCellRenderer>;
}

/**
 * Rendering context of borders.
 */
interface IBorderRenderContext {
	/**
	 * Borders completely contained in the non-fixed area.
	 */
	inNonFixedArea: IBorderInfo[][];

	/**
	 * Borders completely contained in the fixed areas (if any).
	 */
	inFixedAreas?: IFixedAreaBorderRenderContext;
}

/**
 * Border rendering context in fixed areas.
 */
interface IFixedAreaBorderRenderContext {
	top?: IBorderInfo[][];
	left?: IBorderInfo[][];
	bottom?: IBorderInfo[][];
	right?: IBorderInfo[][];

	leftTop?: IBorderInfo[][];
	rightTop?: IBorderInfo[][];
	leftBottom?: IBorderInfo[][];
	rightBottom?: IBorderInfo[][];
}

/**
 * Infos used to draw borders.
 */
interface IBorderInfo {
	/**
	 * Bounds of the cell to paint borders for.
	 */
	bounds: IRectangle;

	/**
	 * Border to paint for the cell.
	 */
	border: IBorder;
}

/**
 * Rendering context of selections.
 */
interface ISelectionRenderContext {
	/**
	 * Selection options.
	 */
	options: ISelectionRenderingOptions;

	/**
	 * Rendering info for the copy handle.
	 */
	copyHandle: ICopyHandleRenderingInfo;

	/**
	 * Selections rectangles completely contained in the non-fixed area.
	 */
	inNonFixedArea: ISelectionRenderInfo[];

	/**
	 * Selection rectangles completely contained in the fixed areas.
	 */
	inFixedArea?: IFixedAreaSelectionRenderInfo;
}

/**
 * Selection rectangles completely contained in the fixed areas.
 */
interface IFixedAreaSelectionRenderInfo {
	top?: ISelectionRenderInfo[];
	left?: ISelectionRenderInfo[];
	bottom?: ISelectionRenderInfo[];
	right?: ISelectionRenderInfo[];

	leftTop?: ISelectionRenderInfo[];
	leftBottom?: ISelectionRenderInfo[];
	rightTop?: ISelectionRenderInfo[];
	rightBottom?: ISelectionRenderInfo[];
}

/**
 * Rendering information about the copy handle.
 */
interface ICopyHandleRenderingInfo {
	/**
	 * Whether the copy-handle is rendered (visible).
	 */
	isRendered: boolean;

	/**
	 * Bounds of the copy-handle in the viewport.
	 */
	bounds?: IRectangle;
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
	 * Bounds of the initial cell (only available when this is the primary selection)
	 * relative to the parent bounds in this info.
	 */
	initial?: IRectangle;

	/**
	 * Bounds of the rectangle on the viewport.
	 */
	bounds: IRectangle;

	/**
	 * Whether the copy-handle should be rendered.
	 */
	renderCopyHandle: boolean;
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
	 * Collection of all fixed area cells to render.
	 */
	fixedCells?: IFixedCellAreaRenderContext;
}

/**
 * Collection of all fixed area cells to render.
 */
interface IFixedCellAreaRenderContext {
	/**
	 * Left fixed columns.
	 */
	left?: ICellAreaRenderContext;

	/**
	 * Top fixed rows.
	 */
	top?: ICellAreaRenderContext;

	/**
	 * Right fixed columns.
	 */
	right?: ICellAreaRenderContext;

	/**
	 * Bottom fixed rows.
	 */
	bottom?: ICellAreaRenderContext;

	/**
	 * Fixed corner area to the left-top.
	 */
	leftTop?: ICellAreaRenderContext;

	/**
	 * Fixed corner area to the right-top.
	 */
	rightTop?: ICellAreaRenderContext;

	/**
	 * Fixed corner area to the left-bottom.
	 */
	leftBottom?: ICellAreaRenderContext;

	/**
	 * Fixed corner area to the right-bottom.
	 */
	rightBottom?: ICellAreaRenderContext;
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
	 * Displayed cell range in the area.
	 */
	cellRange: ICellRange;

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

/**
 * Context holding info about a current touch zooming via pinch gesture.
 */
interface ITouchZoomContext {
	/**
	 * Initial distance between the two fingers.
	 */
	startTouchDistance: number;

	/**
	 * Zoom level when zooming has started.
	 */
	startZoom: number;
}

/**
 * Context holding info about a workspace dragging via touch.
 */
interface ITouchPanContext extends IMouseDragContext {
	/**
	 * Whether the panning did not move and is thus a tap event.
	 */
	isTap: boolean;

	/**
	 * Last x position.
	 */
	lastX: number;

	/**
	 * Last y position.
	 */
	lastY: number;

	/**
	 * Current speed in x direction.
	 */
	speedX: number;

	/**
	 * Current speed in y direction.
	 */
	speedY: number;

	/**
	 * Last movement timestamp.
	 */
	lastTimestamp: number;
}

/**
 * Context describing the current auto-scrolling state.
 */
interface IAutoScrollContext {
	/**
	 * ID of the current animation frame requested.
	 */
	animationFrameID: number;

	/**
	 * Last timestamp (in milliseconds) for the automatic scrolling animation.
	 */
	lastTimestamp: number;

	/**
	 * Last x-diff value.
	 */
	xDiff: number;

	/**
	 * Last y-diff value.
	 */
	yDiff: number;

	/**
	 * Acceleration per second (may be negative (slowing) or positive (accelerating))
	 */
	acceleration: number;
}

/**
 * Environment of crossing borders.
 */
interface ICrossingBorderEnvironment {
	/**
	 * Reference to the dominant border side.
	 */
	dominantBorderSide: IBorderSide;

	/**
	 * Reference to the dominant horizontal border side.
	 */
	dominantHorizontalSide: IBorderSide;

	/**
	 * Reference to the dominant horizontal border side.
	 */
	dominantVerticalSide: IBorderSide;
}

interface IResizingDragStart {
	/**
	 * The start x coordinate.
	 */
	startX: number;

	/**
	 * The start y coordinate.
	 */
	startY: number;

	/**
	 * The current x-coordinate.
	 */
	currentX: number;

	/**
	 * The current y-coordinate.
	 */
	currentY: number;

	/**
	 * Initial info of the resizer.
	 */
	info: IResizerInfo;
}

/**
 * Info about a row/column resizer.
 */
interface IResizerInfo {
	/**
	 * Whether the mouse is over a resizer.
	 */
	isMouseOver: boolean;

	/**
	 * Whether the resizer is resizing rows or columns.
	 */
	overRow?: boolean;

	/**
	 * Index of the row/column resizing.
	 */
	index?: number;
}

/**
 * Render context for the resizer (if any).
 */
interface IResizerRenderContext {
	/**
	 * Whether to render a resizer visualization.
	 */
	showResizer: boolean;

	/**
	 * Whether the resizer line is to be drawn vertically or horizontally.
	 */
	isVertical?: boolean;

	/**
	 * Offset of the resizer line.
	 */
	offset?: number;

	/**
	 * Color of the resizer line.
	 */
	color: IColor;

	/**
	 * Thickness of the resizer line.
	 */
	thickness: number;
}

/**
 * Range of indices.
 */
interface IndexRange {
	/**
	 * First index in the range.
	 */
	from: number;

	/**
	 * Second index in the range.
	 */
	to: number;
}

interface IPreferredRowColumnSizeResult {
	success: boolean;
	preferredSize?: number;
}

interface ITableAreaMask {
	nonFixed: boolean;
	fixed: {
		left: boolean;
		right: boolean;
		top: boolean;
		bottom: boolean;
		leftTop: boolean;
		rightTop: boolean;
		leftBottom: boolean;
		rightBottom: boolean;
	};
}
