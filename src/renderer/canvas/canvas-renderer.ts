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
	 * Current scroll offset.
	 */
	private _scrollOffset: IScrollOffset = {
		x: 0,
		y: 0,
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
		this._container = this._createTableContainer(container);
		this._engine = engine;
		this._cellModel = engine.getCellModel();
		this._selectionModel = engine.getSelectionModel();
		this._borderModel = engine.getBorderModel();
		this._options = options;

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
	private _createTableContainer(parentContainer: HTMLElement): HTMLElement {
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
						x: this._scrollOffset.x,
						y: this._scrollOffset.y,
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
						x: this._scrollOffset.x,
						y: this._scrollOffset.y,
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
						x: this._scrollOffset.x,
						y: this._scrollOffset.y,
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
		const fixedRowsHeight: number =
			!!this._lastRenderingContext &&
			!!this._lastRenderingContext.cells.fixedRowCells
				? this._lastRenderingContext.cells.fixedRowCells.viewPortBounds
						.height
				: 0;
		const fixedColumnWidth: number =
			!!this._lastRenderingContext &&
			!!this._lastRenderingContext.cells.fixedColumnCells
				? this._lastRenderingContext.cells.fixedColumnCells
						.viewPortBounds.width
				: 0;

		if (!allowOverflow) {
			const viewPortWidth: number = !!this._lastRenderingContext
				? this._lastRenderingContext.viewPort.width
				: 0;
			const viewPortHeight: number = !!this._lastRenderingContext
				? this._lastRenderingContext.viewPort.height
				: 0;

			// Check if we are in viewport bounds -> if not return null
			if (x < 0 || y < 0 || x > viewPortWidth || y > viewPortHeight) {
				return null;
			}
		}

		if (x > fixedColumnWidth) {
			x += this._scrollOffset.x;
		}
		if (y > fixedRowsHeight) {
			y += this._scrollOffset.y;
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
		const bounds: IRectangle = this._cellModel.getBounds(targetRange);

		const fixedRows: number = Math.min(
			this.rendererOptions.view.fixedRows,
			this._cellModel.getRowCount()
		);
		const fixedColumns: number = Math.min(
			this.rendererOptions.view.fixedColumns,
			this._cellModel.getColumnCount()
		);

		if (targetRange.startRow > fixedRows) {
			bounds.top -= this._scrollOffset.y;
		}
		if (targetRange.startColumn > fixedColumns) {
			bounds.left -= this._scrollOffset.x;
		}

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

				const fixedRows: number = Math.min(
					this.rendererOptions.view.fixedRows,
					this._cellModel.getRowCount()
				);
				const fixedColumns: number = Math.min(
					this.rendererOptions.view.fixedColumns,
					this._cellModel.getColumnCount()
				);

				if (this._initialSelectionRange.startRow > fixedRows) {
					initialSelectionBounds.top -= this._scrollOffset.y;
				}
				if (this._initialSelectionRange.startColumn > fixedColumns) {
					initialSelectionBounds.left -= this._scrollOffset.x;
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

		if (
			this._scrollTo(
				this._scrollOffset.x + xScrollDiff,
				this._scrollOffset.y + yScrollDiff
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
		// Update scroll offset accordingly
		if (start.scrollVertically) {
			const fixedRowsHeight: number = !!this._lastRenderingContext.cells
				.fixedRowCells
				? this._lastRenderingContext.cells.fixedRowCells.viewPortBounds
						.height
				: 0;
			const viewPortHeight =
				this._lastRenderingContext.cells.nonFixedCells.viewPortBounds
					.height;
			const tableHeight = this._cellModel.getHeight() - fixedRowsHeight;

			// Normalize x and y coordinates for fixed rows/columns
			y -= fixedRowsHeight;
			const startY = start.startY - fixedRowsHeight;

			const curY = startY + (y - startY) + start.offsetFromScrollBarStart;
			const maxY =
				viewPortHeight -
				this._lastRenderingContext.scrollBar.vertical.length;

			if (
				this._scrollToY((curY / maxY) * (tableHeight - viewPortHeight))
			) {
				this._repaintScheduler.next();
			}
		}
		if (start.scrollHorizontally) {
			const fixedColumnWidth: number = !!this._lastRenderingContext.cells
				.fixedColumnCells
				? this._lastRenderingContext.cells.fixedColumnCells
						.viewPortBounds.width
				: 0;
			const viewPortWidth =
				this._lastRenderingContext.cells.nonFixedCells.viewPortBounds
					.width;
			const tableWidth = this._cellModel.getWidth() - fixedColumnWidth;

			// Normalize x and y coordinates for fixed rows/columns
			x -= fixedColumnWidth;
			const startX = start.startX - fixedColumnWidth;

			const curX = startX + (x - startX) + start.offsetFromScrollBarStart;
			const maxX =
				viewPortWidth -
				this._lastRenderingContext.scrollBar.horizontal.length;

			if (this._scrollToX((curX / maxX) * (tableWidth - viewPortWidth))) {
				this._repaintScheduler.next();
			}
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
					x: this._scrollOffset.x,
					y: this._scrollOffset.y,
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
		const fixedRowsHeight: number =
			!!this._lastRenderingContext &&
			!!this._lastRenderingContext.cells.fixedRowCells
				? this._lastRenderingContext.cells.fixedRowCells.viewPortBounds
						.height
				: 0;
		const fixedColumnsWidth: number =
			!!this._lastRenderingContext &&
			!!this._lastRenderingContext.cells.fixedColumnCells
				? this._lastRenderingContext.cells.fixedColumnCells
						.viewPortBounds.width
				: 0;

		const tableHeight: number =
			this._cellModel.getHeight() - fixedRowsHeight;
		const tableWidth: number =
			this._cellModel.getWidth() - fixedColumnsWidth;

		const oldViewPort: IRectangle = !!this._lastRenderingContext
			? this._lastRenderingContext.cells.nonFixedCells.viewPortBounds
			: {
					top: 0,
					left: 0,
					width: 0,
					height: 0,
			  };

		if (tableWidth > newBounds.width) {
			const oldMaxOffset = tableWidth - oldViewPort.width;
			const newMaxOffset =
				tableWidth - (newBounds.width - fixedColumnsWidth);

			this._scrollOffset.x = Math.max(
				Math.min(
					(this._scrollOffset.x * newMaxOffset) / oldMaxOffset,
					newMaxOffset
				),
				0
			);
		} else {
			this._scrollOffset.x = 0;
		}
		if (tableHeight > newBounds.height) {
			const oldMaxOffset = tableHeight - oldViewPort.height;
			const newMaxOffset =
				tableHeight - (newBounds.height - fixedRowsHeight);

			this._scrollOffset.y = Math.max(
				Math.min(
					(this._scrollOffset.y * newMaxOffset) / oldMaxOffset,
					newMaxOffset
				),
				0
			);
		} else {
			this._scrollOffset.y = 0;
		}

		// Set new size to canvas
		CanvasUtil.setCanvasSize(
			this._canvasElement,
			newBounds.width,
			newBounds.height,
			this._devicePixelRatio
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
		return {
			x: this._scrollOffset.x,
			y: this._scrollOffset.y,
		};
	}

	public getViewport(): IRectangle {
		if (!!this._lastRenderingContext) {
			return this._lastRenderingContext.viewPort;
		}

		return this._getViewPort();
	}

	public getFixedRowsHeight(): number {
		return !!this._lastRenderingContext &&
			!!this._lastRenderingContext.cells.fixedRowCells
			? this._lastRenderingContext.cells.fixedRowCells.viewPortBounds
					.height
			: 0;
	}

	public getFixedColumnsWidth(): number {
		return !!this._lastRenderingContext &&
			!!this._lastRenderingContext.cells.fixedColumnCells
			? this._lastRenderingContext.cells.fixedColumnCells.viewPortBounds
					.width
			: 0;
	}

	/**
	 * Scroll to the cell at the given row and column (if not already in the current view).
	 * @param row to scroll to
	 * @param column to scroll to
	 */
	public scrollTo(row: number, column: number): void {
		const cell: ICell = this._cellModel.getCell(row, column);
		const range: ICellRange = !!cell
			? cell.range
			: CellRange.fromSingleRowColumn(row, column);
		const bounds: IRectangle = this._cellModel.getBounds(range);

		const fixedRows: number = Math.min(
			this.rendererOptions.view.fixedRows,
			this._cellModel.getRowCount()
		);
		const fixedColumns: number = Math.min(
			this.rendererOptions.view.fixedColumns,
			this._cellModel.getColumnCount()
		);

		const fixedRowsHeight: number = !!this._lastRenderingContext.cells
			.fixedRowCells
			? this._lastRenderingContext.cells.fixedRowCells.viewPortBounds
					.height
			: 0;
		const fixedColumnsWidth: number = !!this._lastRenderingContext.cells
			.fixedColumnCells
			? this._lastRenderingContext.cells.fixedColumnCells.viewPortBounds
					.width
			: 0;

		bounds.left -= fixedColumnsWidth;
		bounds.top -= fixedRowsHeight;

		const viewPortWidth: number =
			this._lastRenderingContext.cells.nonFixedCells.viewPortBounds.width;
		const viewPortHeight: number =
			this._lastRenderingContext.cells.nonFixedCells.viewPortBounds
				.height;

		if (column >= fixedColumns) {
			const startX: number = this._scrollOffset.x;
			const endX: number = this._scrollOffset.x + viewPortWidth;

			if (bounds.left < startX) {
				// Scroll to the left
				if (this._scrollToX(bounds.left)) {
					this._repaintScheduler.next();
				}
			} else if (bounds.left + bounds.width > endX) {
				// Scroll to the right
				if (
					this._scrollToX(bounds.left + bounds.width - viewPortWidth)
				) {
					this._repaintScheduler.next();
				}
			}
		}

		if (row >= fixedRows) {
			const startY: number = this._scrollOffset.y;
			const endY: number = this._scrollOffset.y + viewPortHeight;

			if (bounds.top < startY) {
				// Scroll to the top
				if (this._scrollToY(bounds.top)) {
					this._repaintScheduler.next();
				}
			} else if (bounds.top + bounds.height > endY) {
				// Scroll to the bottom
				if (
					this._scrollToY(bounds.top + bounds.height - viewPortHeight)
				) {
					this._repaintScheduler.next();
				}
			}
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

			const newScrollOffsetX: number =
				this._scrollOffset.x +
				(switchScrollDirection ? scrollDeltaY : scrollDeltaX);
			const newScrollOffsetY: number =
				this._scrollOffset.y +
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
		const xChanged: boolean = this._scrollToXInternal(offsetX);
		const yChanged: boolean = this._scrollToYInternal(offsetY);

		const changed = xChanged || yChanged;
		if (changed) {
			this._updateOverlays(); // Update overlays (if any)
		}

		return changed;
	}

	/**
	 * Scroll to the given horizontal (X) position.
	 * @param offset to scroll to
	 * @returns whether the offset is out of bounds and thus corrected to the max/min value
	 */
	private _scrollToX(offset: number): boolean {
		const changed = this._scrollToXInternal(offset);
		if (changed) {
			this._updateOverlays(); // Update overlays (if any)
		}
		return changed;
	}

	/**
	 * Scroll to the given horizontal (X) position - internal method.
	 * @param offset to scroll to
	 *@returns whether the offset is out of bounds and thus corrected to the max/min value
	 */
	private _scrollToXInternal(offset: number): boolean {
		const fixedColumnsWidth: number = !!this._lastRenderingContext.cells
			.fixedColumnCells
			? this._lastRenderingContext.cells.fixedColumnCells.viewPortBounds
					.width
			: 0;

		const tableWidth: number =
			this._cellModel.getWidth() - fixedColumnsWidth;
		const viewPortWidth: number =
			this._lastRenderingContext.cells.nonFixedCells.viewPortBounds.width;

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
			this._scrollOffset.x = Math.round(maxOffset);
			return changed;
		} else {
			const newOffset: number = offset;
			if (newOffset !== this._scrollOffset.x) {
				this._scrollOffset.x = newOffset;
				return true;
			}

			return false;
		}
	}

	/**
	 * Scroll to the given vertical (Y) position.
	 * @param offset to scroll to
	 * @returns whether the offset changed
	 */
	private _scrollToY(offset: number): boolean {
		const changed = this._scrollToYInternal(offset);
		if (changed) {
			this._updateOverlays(); // Update overlays (if any)
		}
		return changed;
	}

	/**
	 * Scroll to the given vertical (Y) position - internal method.
	 * @param offset to scroll to
	 * @returns whether the offset changed
	 */
	private _scrollToYInternal(offset: number): boolean {
		const fixedRowsHeight: number = !!this._lastRenderingContext.cells
			.fixedRowCells
			? this._lastRenderingContext.cells.fixedRowCells.viewPortBounds
					.height
			: 0;

		const tableHeight: number =
			this._cellModel.getHeight() - fixedRowsHeight;
		const viewPortHeight: number =
			this._lastRenderingContext.cells.nonFixedCells.viewPortBounds
				.height;

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
			this._scrollOffset.y = Math.round(maxOffset);
			return changed;
		} else {
			const newOffset: number = offset;
			if (newOffset !== this._scrollOffset.y) {
				this._scrollOffset.y = newOffset;
				return true;
			}

			return false;
		}
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
		return {
			top: this._scrollOffset.y,
			left: this._scrollOffset.x,
			width:
				this._canvasElement.width / this._devicePixelRatio / this._zoom,
			height:
				this._canvasElement.height /
				this._devicePixelRatio /
				this._zoom,
		};
	}

	/**
	 * Calculate the scroll bar rendering context.
	 * @param viewPort to render scroll bar in
	 * @param fixedRowsHeight height of the fixed rows
	 * @param fixedColumnsWidth width of the fixed columns
	 */
	private _calculateScrollBarContext(
		viewPort: IRectangle,
		fixedRowsHeight: number,
		fixedColumnsWidth: number
	): IScrollBarRenderContext {
		// Derive scroll bar options
		const scrollBarOptions: IScrollBarOptions =
			this.rendererOptions.canvas.scrollBar;
		const scrollBarSize: number = scrollBarOptions.size;
		const minScrollBarLength: number = scrollBarOptions.minLength;
		const scrollBarOffset: number = scrollBarOptions.offset;
		const cornerRadius: number = scrollBarOptions.cornerRadius;

		const viewPortWidth: number = viewPort.width - fixedColumnsWidth;
		const viewPortHeight: number = viewPort.height - fixedRowsHeight;

		const tableHeight: number =
			this._cellModel.getHeight() - fixedRowsHeight;
		const tableWidth: number =
			this._cellModel.getWidth() - fixedColumnsWidth;

		const maxVerticalOffset: number = tableHeight - viewPortHeight;
		const maxHorizontalOffset: number = tableWidth - viewPortWidth;

		// Calculate vertical scrollbar layout
		let vertical: IScrollBarAxisRenderContext = null;
		if (tableHeight > viewPortHeight) {
			const length = Math.max(
				(viewPortHeight / tableHeight) * viewPortHeight,
				minScrollBarLength
			);
			const progress = this._scrollOffset.y / maxVerticalOffset;

			vertical = {
				size: scrollBarSize,
				length,
				x:
					Math.min(viewPortWidth, tableWidth) -
					scrollBarSize -
					scrollBarOffset +
					fixedColumnsWidth,
				y: (viewPortHeight - length) * progress + fixedRowsHeight,
			};
		}

		// Calculate horizontal scrollbar layout
		let horizontal: IScrollBarAxisRenderContext = null;
		if (tableWidth > viewPortWidth) {
			const length = Math.max(
				(viewPortWidth / tableWidth) * viewPortWidth,
				minScrollBarLength
			);
			const progress = this._scrollOffset.x / maxHorizontalOffset;

			horizontal = {
				size: scrollBarSize,
				length,
				x: (viewPortWidth - length) * progress + fixedColumnsWidth,
				y:
					Math.min(viewPortHeight, tableHeight) -
					scrollBarSize -
					scrollBarOffset +
					fixedRowsHeight,
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
			options: this.rendererOptions.canvas.selection,
			copyHandle: {
				isRendered: false,
			},
			inFixedCorner: [],
			inNonFixedArea: [],
			inFixedColumns: [],
			inFixedRows: [],
		};

		const isMultiSelection: boolean = selections.length > 1;

		for (const s of selections) {
			this._validateSelection(s);
			this._addInfosForSelection(
				result,
				s,
				viewPort,
				fixedRows,
				fixedColumns,
				fixedRowsHeight,
				fixedColumnsWidth,
				s === primary,
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
	 * @param fixedRows to calculate with
	 * @param fixedColumns to calculate with
	 * @param fixedRowsHeight height of the fixed rows
	 * @param fixedColumnsWidth width of the fixed columns
	 * @param isPrimary whether the selection is the primary selection
	 * @param isMultiSelection whether the selection is one of many to be rendered (true) or just one (false)
	 */
	private _addInfosForSelection(
		toAdd: ISelectionRenderContext,
		selection: ISelection,
		viewPort: IRectangle,
		fixedRows: number,
		fixedColumns: number,
		fixedRowsHeight: number,
		fixedColumnsWidth: number,
		isPrimary: boolean,
		isMultiSelection: boolean
	): void {
		const bounds: IRectangle =
			this._calculateSelectionBoundsFromCellRangeBounds(
				this._cellModel.getBounds(selection.range),
				selection.range,
				viewPort,
				fixedRows,
				fixedColumns,
				fixedRowsHeight,
				fixedColumnsWidth
			);

		let initialBounds: IRectangle | null = null;
		if (isPrimary) {
			let initialRange: ICellRange;
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

			initialBounds = this._cellModel.getBounds(initialRange);
		}

		const isStartInFixedRows: boolean =
			selection.range.startRow < fixedRows;
		const isStartInFixedColumns: boolean =
			selection.range.startColumn < fixedColumns;

		// Correct initial bounds (if any) for fixed rows/columns
		if (!!initialBounds) {
			if (isStartInFixedRows) {
				// Check distance of initial bounds to fixed rows
				const distance: number = initialBounds.top - fixedRowsHeight;
				if (distance >= 0) {
					// Correct top offset or height based on distance to fixed rows
					const initialUnderFixedRowsOffset: number =
						fixedRowsHeight -
						(initialBounds.top - this._scrollOffset.y);

					initialBounds.top = Math.max(
						initialBounds.top - this._scrollOffset.y,
						fixedRowsHeight
					);
					if (initialUnderFixedRowsOffset > 0) {
						initialBounds.height = Math.max(
							initialBounds.height - initialUnderFixedRowsOffset,
							0
						);
					}
				}
			} else {
				initialBounds.top -= this._scrollOffset.y;
			}

			if (isStartInFixedColumns) {
				// Check distance of initial bounds to fixed columns
				const distance: number = initialBounds.left - fixedColumnsWidth;
				if (distance >= 0) {
					// Correct left offset or width based on distance to fixed columns
					const initialUnderFixedColumnsOffset: number =
						fixedColumnsWidth -
						(initialBounds.left - this._scrollOffset.x);

					initialBounds.left = Math.max(
						initialBounds.left - this._scrollOffset.x,
						fixedColumnsWidth
					);
					if (initialUnderFixedColumnsOffset > 0) {
						initialBounds.width = Math.max(
							initialBounds.width -
								initialUnderFixedColumnsOffset,
							0
						);
					}
				}
			} else {
				initialBounds.left -= this._scrollOffset.x;
			}
		}

		let collectionToPushTo: ISelectionRenderInfo[];
		if (isStartInFixedRows && isStartInFixedColumns) {
			collectionToPushTo = toAdd.inFixedCorner;
		} else if (isStartInFixedRows) {
			collectionToPushTo = toAdd.inFixedRows;
		} else if (isStartInFixedColumns) {
			collectionToPushTo = toAdd.inFixedColumns;
		} else {
			collectionToPushTo = toAdd.inNonFixedArea;
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

		collectionToPushTo.push({
			bounds,
			initial: initialBounds,
			isPrimary,
			renderCopyHandle:
				isPrimary &&
				!isMultiSelection &&
				this._options.selection.copyHandle.showCopyHandle,
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
			endColumn: Math.min(fixedColumns - 1, range.endColumn),
		}).width;
		const heightInFixedRows: number = this._cellModel.getBounds({
			startRow: range.startRow,
			endRow: Math.min(fixedRows - 1, range.endRow),
			startColumn: 0,
			endColumn: 0,
		}).height;

		return {
			left: startX,
			top: startY,
			width: Math.max(
				endX - startX,
				isStartInFixedColumns ? widthInFixedColumns : 0
			),
			height: Math.max(
				endY - startY,
				isStartInFixedRows ? heightInFixedRows : 0
			),
		};
	}

	/**
	 * Create the rendering context for the current state.
	 */
	private _createRenderingContext(): IRenderContext {
		// Check if size of the table changed compared to the last rendering cycle
		if (!!this._lastRenderingContext) {
			const lastSize: ISize = this._lastRenderingContext.tableSize;

			const widthChanged: boolean =
				lastSize.width !== this._cellModel.getWidth();
			const heightChanged: boolean =
				lastSize.height !== this._cellModel.getHeight();

			let scrollChanged: boolean = false;
			if (widthChanged) {
				scrollChanged ||= this._scrollToXInternal(this._scrollOffset.x);
			}
			if (heightChanged) {
				scrollChanged ||= this._scrollToYInternal(this._scrollOffset.y);
			}

			if (scrollChanged) {
				this._updateOverlaysAfterRenderCycle = true;
			}
		}

		const viewPort: IRectangle = this._getViewPort();

		const fixedRows: number = Math.min(
			this.rendererOptions.view.fixedRows,
			this._cellModel.getRowCount()
		);
		const fixedColumns: number = Math.min(
			this.rendererOptions.view.fixedColumns,
			this._cellModel.getColumnCount()
		);

		// Calculate width and height of the fixed rows and columns
		const fixedRowsHeight: number =
			fixedRows > 0
				? this._cellModel.getRowOffset(fixedRows - 1) +
				  (this._cellModel.isRowHidden(fixedRows - 1)
						? 0.0
						: this._cellModel.getRowSize(fixedRows - 1))
				: 0;
		const fixedColumnsWidth: number =
			fixedColumns > 0
				? this._cellModel.getColumnOffset(fixedColumns - 1) +
				  (this._cellModel.isColumnHidden(fixedColumns - 1)
						? 0.0
						: this._cellModel.getColumnSize(fixedColumns - 1))
				: 0;

		const cellsInfo: ICellRenderContextCollection =
			this._createCellRenderingInfo(
				viewPort,
				fixedRows,
				fixedColumns,
				fixedRowsHeight,
				fixedColumnsWidth
			);
		const scrollBarContext: IScrollBarRenderContext =
			this._calculateScrollBarContext(
				viewPort,
				fixedRowsHeight,
				fixedColumnsWidth
			);
		const selectionContext: ISelectionRenderContext =
			this._calculateSelectionContext(
				viewPort,
				fixedRows,
				fixedColumns,
				fixedRowsHeight,
				fixedColumnsWidth
			);
		const borderContext: IBorderRenderContext =
			this._calculateBorderContext(cellsInfo);
		const resizerContext: IResizerRenderContext =
			this._calculateResizerRenderContext();

		return {
			focused: this.isFocused(),
			viewPort,
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
	 * @param cellsInfo to calculate borders for
	 */
	private _calculateBorderContext(
		cellsInfo: ICellRenderContextCollection
	): IBorderRenderContext {
		return {
			inFixedCorner: !!cellsInfo.fixedCornerCells
				? this._calculateBorderInfo(
						this._borderModel.getBorders(
							cellsInfo.fixedCornerCells.cellRange
						),
						cellsInfo.fixedCornerCells.cellRange,
						false,
						false
				  )
				: [],
			inFixedColumns: !!cellsInfo.fixedColumnCells
				? this._calculateBorderInfo(
						this._borderModel.getBorders(
							cellsInfo.fixedColumnCells.cellRange
						),
						cellsInfo.fixedColumnCells.cellRange,
						false,
						true
				  )
				: [],
			inFixedRows: !!cellsInfo.fixedRowCells
				? this._calculateBorderInfo(
						this._borderModel.getBorders(
							cellsInfo.fixedRowCells.cellRange
						),
						cellsInfo.fixedRowCells.cellRange,
						true,
						false
				  )
				: [],
			inNonFixedArea: this._calculateBorderInfo(
				this._borderModel.getBorders(cellsInfo.nonFixedCells.cellRange),
				cellsInfo.nonFixedCells.cellRange,
				true,
				true
			),
		};
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
	 * @param adjustBoundsX whether to adjust bounds due to scrolling
	 * @param adjustBoundsY whether to adjust bounds due to scrolling
	 */
	private _calculateBorderInfo(
		borders: IBorder[][],
		range: ICellRange,
		adjustBoundsX: boolean,
		adjustBoundsY: boolean
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

						// Correct bounds for current scroll offsets
						if (adjustBoundsY) {
							info.bounds.top -= this._scrollOffset.y;
						}
						if (adjustBoundsX) {
							info.bounds.left -= this._scrollOffset.x;
						}

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
		const nonFixedCellsRange: ICellRange = this._cellModel.getRangeForRect({
			left: viewPort.left + fixedColumnsWidth,
			top: viewPort.top + fixedRowsHeight,
			width: viewPort.width - fixedColumnsWidth,
			height: viewPort.height - fixedRowsHeight,
		});

		const usedCellRendererNames: Set<string> = new Set<string>();

		// Fill "normal" (non-fixed) cells first
		const nonFixedCells = this._createCellRenderArea(
			nonFixedCellsRange,
			{
				left: fixedColumnsWidth,
				top: fixedRowsHeight,
				width: viewPort.width - fixedColumnsWidth,
				height: viewPort.height - fixedRowsHeight,
			},
			true,
			true,
			usedCellRendererNames
		);

		const result: ICellRenderContextCollection = {
			nonFixedCells,
		};

		// Fill fixed columns (if any)
		if (fixedColumns > 0) {
			result.fixedColumnCells = this._createCellRenderArea(
				{
					startRow: nonFixedCellsRange.startRow - fixedRows,
					endRow: nonFixedCellsRange.endRow,
					startColumn: 0,
					endColumn: fixedColumns - 1,
				},
				{
					left: 0,
					top: fixedRowsHeight,
					width: fixedColumnsWidth,
					height: viewPort.height - fixedRowsHeight,
				},
				false,
				true,
				usedCellRendererNames
			);
		}

		// Fill fixed rows (if any)
		if (fixedRows > 0) {
			result.fixedRowCells = this._createCellRenderArea(
				{
					startRow: 0,
					endRow: fixedRows - 1,
					startColumn: nonFixedCellsRange.startColumn - fixedColumns,
					endColumn: nonFixedCellsRange.endColumn,
				},
				{
					left: fixedColumnsWidth,
					top: 0,
					width: viewPort.width - fixedColumnsWidth,
					height: fixedRowsHeight,
				},
				true,
				false,
				usedCellRendererNames
			);
		}

		// Fill fixed corner cells (if any)
		if (fixedColumns > 0 && fixedRows > 0) {
			result.fixedCornerCells = this._createCellRenderArea(
				{
					startRow: 0,
					endRow: fixedRows - 1,
					startColumn: 0,
					endColumn: fixedColumns - 1,
				},
				{
					left: 0,
					top: 0,
					width: fixedColumnsWidth,
					height: fixedRowsHeight,
				},
				false,
				false,
				usedCellRendererNames
			);
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
	 * @param adjustBoundsX whether to adjust the x bounds
	 * @param adjustBoundsY whether to adjust the y bounds
	 * @param usedCellRendererNames set of used cell renderer names
	 * @returns mapping of renderer names to all cells that need to be rendered with the renderer
	 */
	private _createCellRenderArea(
		range: ICellRange,
		viewPortBounds: IRectangle,
		adjustBoundsX: boolean,
		adjustBoundsY: boolean,
		usedCellRendererNames: Set<string>
	): ICellAreaRenderContext {
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
		if (!!oldCells.fixedRowCells && !!newCells.fixedRowCells) {
			this._cleanupCellViewportCachesForOverlappingCellRanges(
				oldCells.fixedRowCells.cellRange,
				newCells.fixedRowCells.cellRange
			);
		}
		if (!!oldCells.fixedColumnCells && !!newCells.fixedColumnCells) {
			this._cleanupCellViewportCachesForOverlappingCellRanges(
				oldCells.fixedColumnCells.cellRange,
				newCells.fixedColumnCells.cellRange
			);
		}
		if (!!oldCells.fixedCornerCells && !!newCells.fixedCornerCells) {
			this._cleanupCellViewportCachesForOverlappingCellRanges(
				oldCells.fixedCornerCells.cellRange,
				newCells.fixedCornerCells.cellRange
			);
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

		fct(this._lastRenderingContext.cells.fixedCornerCells.cellRange);
		fct(this._lastRenderingContext.cells.fixedRowCells.cellRange);
		fct(this._lastRenderingContext.cells.fixedColumnCells.cellRange);
		fct(this._lastRenderingContext.cells.nonFixedCells.cellRange);
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
		const renderingContext: IRenderContext = this._createRenderingContext();
		creatingRenderingContextTime =
			window.performance.now() - creatingRenderingContextTime;

		if (!!this._requestAnimationFrameID) {
			// Already requested animation frame that has not been executed yet -> cancel it and reschedule one
			window.cancelAnimationFrame(this._requestAnimationFrameID);
		}

		this._requestAnimationFrameID = window.requestAnimationFrame(() => {
			this._requestAnimationFrameID = null; // Mark as executed

			if (!!this._lastRenderingContext) {
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
			if (!!renderingContext.cells.fixedColumnCells) {
				CanvasRenderer._renderArea(
					ctx,
					renderingContext,
					renderingContext.cells.fixedColumnCells,
					renderingContext.borders.inFixedColumns,
					renderingContext.selection?.inFixedColumns,
					true
				);
			}
			if (!!renderingContext.cells.fixedRowCells) {
				CanvasRenderer._renderArea(
					ctx,
					renderingContext,
					renderingContext.cells.fixedRowCells,
					renderingContext.borders.inFixedRows,
					renderingContext.selection?.inFixedRows,
					true
				);
			}
			if (!!renderingContext.cells.fixedCornerCells) {
				CanvasRenderer._renderArea(
					ctx,
					renderingContext,
					renderingContext.cells.fixedCornerCells,
					renderingContext.borders.inFixedCorner,
					renderingContext.selection?.inFixedCorner,
					true
				);
			}

			// Render scrollbars
			CanvasRenderer._renderScrollBars(ctx, renderingContext);

			// Render resizing visualization (if currently resizing)
			CanvasRenderer._renderResizerVisualization(ctx, renderingContext);

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
		clipArea?: boolean
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

		if (restoreContext) {
			ctx.restore();
		}

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
		const viewPortHeight: number = !!this._lastRenderingContext
			? this._lastRenderingContext.viewPort.height
			: 0;
		const viewPortWidth: number = !!this._lastRenderingContext
			? this._lastRenderingContext.viewPort.width
			: 0;

		const fixedRowsHeight: number =
			!!this._lastRenderingContext &&
			!!this._lastRenderingContext.cells.fixedRowCells
				? this._lastRenderingContext.cells.fixedRowCells.viewPortBounds
						.height
				: 0;
		const fixedColumnsWidth: number =
			!!this._lastRenderingContext &&
			!!this._lastRenderingContext.cells.fixedColumnCells
				? this._lastRenderingContext.cells.fixedColumnCells
						.viewPortBounds.width
				: 0;

		let top: number = overlay.bounds.top;
		let height: number = overlay.bounds.height;
		const isInFixedRows: boolean = overlay.bounds.top < fixedRowsHeight;
		if (isInFixedRows) {
			// Overlaps with fixed rows
			const remaining: number = fixedRowsHeight - overlay.bounds.top;
			if (overlay.bounds.height > remaining) {
				// Not completely in fixed rows -> change height based on scroll state
				height = Math.max(height - this._scrollOffset.y, remaining);
			}
		} else {
			// Is only in scrollable area
			if (top - this._scrollOffset.y < fixedRowsHeight) {
				height -= fixedRowsHeight - (top - this._scrollOffset.y);
			}

			top = top - this._scrollOffset.y;
		}

		let left: number = overlay.bounds.left;
		let width: number = overlay.bounds.width;
		const isInFixedColumns: boolean =
			overlay.bounds.left < fixedColumnsWidth;
		if (isInFixedColumns) {
			// Overlaps with fixed columns
			const remaining: number = fixedColumnsWidth - overlay.bounds.left;
			if (overlay.bounds.width > remaining) {
				// Not completely in fixed columns -> change width based on scroll state
				width = Math.max(width - this._scrollOffset.x, remaining);
			}
		} else {
			// Is only in scrollable area
			if (left - this._scrollOffset.x < fixedColumnsWidth) {
				width -= fixedColumnsWidth - (left - this._scrollOffset.x);
			}

			left = left - this._scrollOffset.x;
		}

		const isVisible: boolean =
			height > 0 &&
			top < viewPortHeight &&
			width > 0 &&
			left < viewPortWidth;
		if (isVisible) {
			overlay.element.style.display = 'block';
			overlay.element.style.overflow = 'hidden';

			overlay.element.style.left = `${left * this.getZoom()}px`;
			overlay.element.style.top = `${top * this.getZoom()}px`;
			overlay.element.style.width = `${overlay.bounds.width}px`;
			overlay.element.style.height = `${overlay.bounds.height}px`;

			if (
				width < overlay.bounds.width ||
				height < overlay.bounds.height
			) {
				// Add clipping
				const leftClipping: number = overlay.bounds.width - width;
				const topClipping: number = overlay.bounds.height - height;

				overlay.element.style.clipPath = `inset(${topClipping}px 0 0 ${leftClipping}px)`;
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
	 * Borders completely contained in non-fixed area or fixed rows area.
	 */
	inFixedRows: IBorderInfo[][];

	/**
	 * Borders completely contained in non-fixed area or fixed columns area.
	 */
	inFixedColumns: IBorderInfo[][];

	/**
	 * Borders to be displayed above all areas.
	 */
	inFixedCorner: IBorderInfo[][];
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
	inFixedCorner: ISelectionRenderInfo[];
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
