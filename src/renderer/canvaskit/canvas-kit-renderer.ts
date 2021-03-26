import {ITableEngineRenderer} from "../renderer";
import {IRendererOptions} from "../options";
import {ICellModel} from "../../cell/model/cell-model.interface";
import CanvasKitInit, {CanvasKit, Surface, Canvas} from "canvaskit-wasm";
import {IRectangle} from "../../util/rect";
import {ICell} from "../../cell/cell";
import {asyncScheduler, Subject} from "rxjs";
import {takeUntil, throttleTime} from "rxjs/operators";
import {IScrollBarOptions} from "../options/scrollbar";
import {CanvasUtil} from "../util/canvas";
import {ScrollUtil} from "../util/scroll";
import {ICellRenderer} from "../cell/cell-renderer";
import {ISelectionModel} from "../../selection/model/selection-model.interface";
import {TableEngine} from "../../table-engine";

/**
 * Renderer of the table engine leveraging Skia CanvasKit.
 */
export class CanvasKitRenderer implements ITableEngineRenderer {

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
	 * Skia CanvasKit reference to render with.
	 */
	private _canvasKit: CanvasKit;

	/**
	 * CanvasKit surface we're able to draw on.
	 */
	private _surface: Surface;

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
	 * Current scroll offset on the horizontal axis.
	 */
	private _scrollOffsetX: number = 0;

	/**
	 * Current scroll offset on the vertical axis.
	 */
	private _scrollOffsetY: number = 0;

	/**
	 * Initialize the renderer with the given options on the passed HTML container.
	 * @param container to initialize renderer in
	 * @param engine reference to the table-engine
	 * @param options of the renderer
	 */
	public async initialize(container: HTMLElement, engine: TableEngine, options: IRendererOptions): Promise<void> {
		this._container = container;
		this._cellModel = engine.getCellModel();
		this._options = options;

		this._initializeRenderingCanvasElement();
		await this._initializeCanvasKit();

		this._bindListeners();
	}

	/**
	 * Scroll to the cell at the given row and column (if not already in the current view).
	 * @param row to scroll to
	 * @param column to scroll to
	 */
	public scrollTo(row: number, column: number): void {
		// TODO
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
			throttleTime(this._options.canvasKit.lazyRenderingThrottleDuration, asyncScheduler, {
				leading: false,
				trailing: true
			})
		).subscribe(() => this._resizeCanvasToCurrentContainerSize());

		// Repaint when necessary (for example on scrolling)
		this._lazyRenderingSchedulerSubject.asObservable().pipe(
			takeUntil(this._onCleanup),
			throttleTime(this._options.canvasKit.lazyRenderingThrottleDuration, asyncScheduler, {
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
		const bounds: DOMRect = this._container.getBoundingClientRect();
		CanvasUtil.setCanvasSize(this._canvasElement, bounds.width, bounds.height);

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

		const scrollDelta: number = ScrollUtil.determineScrollOffsetFromEvent(this._canvasElement, true, event);

		if (scrollVertically) {
			this._scrollToY(this._scrollOffsetY + scrollDelta);
		} else {
			this._scrollToX(this._scrollOffsetX + scrollDelta);
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
			this._scrollOffsetX = 0;
			return true;
		} else if (offset > maxOffset) {
			this._scrollOffsetX = maxOffset;
			return true;
		} else {
			this._scrollOffsetX = offset;
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
			this._scrollOffsetY = 0;
			return true;
		} else if (offset > maxOffset) {
			this._scrollOffsetY = maxOffset;
			return true;
		} else {
			this._scrollOffsetY = offset;
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
		this._canvasElement.style.position = "absolute"; // Ignore resize events due to canvas element resizing

		// Set proper size based on the container HTML element size
		CanvasUtil.setCanvasSize(this._canvasElement, bounds.width, bounds.height);

		// Make it focusable (needed for key listeners for example).
		this._canvasElement.setAttribute("tabindex", "-1");

		// Append it to the container
		this._container.appendChild(this._canvasElement);
	}

	/**
	 * Initialize Skia CanvasKit.
	 */
	private async _initializeCanvasKit(): Promise<void> {
		const canvasKitInitializer = (CanvasKitInit as any);

		this._canvasKit = await canvasKitInitializer({
			locateFile: (file: string) => `${this._options.canvasKit.canvasKitLibBinURL}${file}`
		});

		this._surface = this._canvasKit.MakeCanvasSurface(this._canvasElement);
	}

	/**
	 * (Re)-Render the table.
	 */
	public render(): void {
		const kit = this._canvasKit;

		/*
		FETCHING CELLS AND CELL BOUNDS
		 */
		let fetchingTime = window.performance.now();

		const viewPort: IRectangle = {
			top: this._scrollOffsetY,
			left: this._scrollOffsetX,
			width: this._canvasElement.width,
			height: this._canvasElement.height
		};
		const cells = this._cellModel.getCellsForRect(viewPort);
		const cellBounds: IRectangle[] = new Array(cells.length);
		for (let i = 0; i < cells.length; i++) {
			const bounds = this._cellModel.getBounds(cells[i].range);

			// Correct bounds for current scroll offsets
			bounds.top -= this._scrollOffsetY;
			bounds.left -= this._scrollOffsetX;

			cellBounds[i] = bounds;
		}

		/*
		LAYOUT SCROLLBARS
		 */
		const scrollBarOptions: IScrollBarOptions = this._options.canvasKit.scrollBar;
		const scrollBarSize: number = scrollBarOptions.size * window.devicePixelRatio;
		const minScrollBarLength: number = scrollBarOptions.minLength * window.devicePixelRatio;
		const scrollBarOffset: number = scrollBarOptions.offset * window.devicePixelRatio;

		const verticalScrollBarLength = Math.max(this._canvasElement.height / this._cellModel.getHeight() * this._canvasElement.height, minScrollBarLength);
		const verticalScrollProgress = this._scrollOffsetY / (this._cellModel.getHeight() - this._canvasElement.height);
		const verticalScrollBarX = this._canvasElement.width - scrollBarSize - scrollBarOffset;
		const verticalScrollBarY = (this._canvasElement.height - verticalScrollBarLength) * verticalScrollProgress;

		const horizontalScrollBarLength = Math.max(this._canvasElement.width / this._cellModel.getWidth() * this._canvasElement.width, minScrollBarLength);
		const horizontalScrollProgress = this._scrollOffsetX / (this._cellModel.getWidth() - this._canvasElement.width);
		const horizontalScrollBarY = this._canvasElement.height - scrollBarSize - scrollBarOffset;
		const horizontalScrollBarX = (this._canvasElement.width - horizontalScrollBarLength) * horizontalScrollProgress;
		fetchingTime = window.performance.now() - fetchingTime;

		/*
		LAYING OUT/PREPARING RENDERING
		 */
		let layoutTime = window.performance.now();

		const testBorderPaint = new kit.Paint();
		testBorderPaint.setColor(kit.Color4f(0.8, 0.8, 0.8, 1.0));
		testBorderPaint.setStyle(kit.PaintStyle.Stroke);
		testBorderPaint.setAntiAlias(true);

		const font = new kit.Font(null, 12);
		const fontPaint = new kit.Paint();
		fontPaint.setColor(kit.Color4f(0, 0, 0, 1.0));
		fontPaint.setStyle(kit.PaintStyle.Fill);
		fontPaint.setAntiAlias(true);

		const scrollBarPaint = new kit.Paint();
		scrollBarPaint.setColor(kit.Color4f(scrollBarOptions.color.red, scrollBarOptions.color.green, scrollBarOptions.color.blue, scrollBarOptions.color.alpha));
		scrollBarPaint.setStyle(kit.PaintStyle.Fill);
		scrollBarPaint.setAntiAlias(true);

		layoutTime = window.performance.now() - layoutTime;

		this._requestAnimationFrame((canvas: Canvas) => {
			let totalRendering = window.performance.now();
			canvas.clear(kit.TRANSPARENT);

			// Draw cells and borders
			for (let i = 0; i < cells.length; i++) {
				const cell: ICell = cells[i];
				const bounds: IRectangle = cellBounds[i];

				canvas.drawText(`${cell.value}`, bounds.left, bounds.top + 12, fontPaint, font);
				canvas.drawRect(kit.XYWHRect(bounds.left, bounds.top, bounds.width, bounds.height), testBorderPaint);
			}

			// Draw scroll bars
			canvas.drawRRect(kit.RRectXY(kit.XYWHRect(verticalScrollBarX, verticalScrollBarY, scrollBarSize, verticalScrollBarLength), scrollBarOptions.cornerRadius, scrollBarOptions.cornerRadius), scrollBarPaint);
			canvas.drawRRect(kit.RRectXY(kit.XYWHRect(horizontalScrollBarX, horizontalScrollBarY, horizontalScrollBarLength, scrollBarSize), scrollBarOptions.cornerRadius, scrollBarOptions.cornerRadius), scrollBarPaint);

			let onlyRendering = window.performance.now() - totalRendering;

			// Delete objects
			let deletingObjects = window.performance.now();
			testBorderPaint.delete();
			scrollBarPaint.delete();
			font.delete();
			fontPaint.delete();

			console.log(`FETCHING: ${fetchingTime}ms, LAYOUT: ${layoutTime}ms, RENDERING: ${onlyRendering}ms, DELETING OBJECTS: ${window.performance.now() - deletingObjects}ms, TOTAL RENDERING: ${window.performance.now() - totalRendering}ms`);
		});
	}

	/**
	 * Draw once with the provided function.
	 * @param drawFct to execute
	 */
	private _requestAnimationFrame(drawFct: (Canvas) => void): void {
		(this._surface as any).requestAnimationFrame(drawFct);
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

		this._surface.dispose();
		this._surface.delete();
	}

	/**
	 * Register a cell renderer responsible for
	 * rendering a single cells value.
	 * @param renderer to register
	 */
	public registerCellRenderer(renderer: ICellRenderer<any>): void {
		// TODO
	}

	isFocused(): boolean {
		return false;
	}

	requestFocus(): void {
	}

}
