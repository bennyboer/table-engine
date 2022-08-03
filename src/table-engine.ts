import { ICellModel } from './cell';
import { fillOptions, ITableEngineOptions } from './options';
import {
	ICellRenderer,
	IFixedAreaInfos,
	ITableEngineRenderer,
	RendererFactory,
} from './renderer';
import { Observable, Subject } from 'rxjs';
import { ITableEngineEvent, TableEngineEventType } from './event';
import { ISelectionModel, SelectionModel } from './selection';
import { BorderModel, IBorderModel } from './border';
import { IOverlayManager } from './overlay';
import { IPoint, IRectangle } from './util';

/**
 * Entry point of the table engine library.
 */
export class TableEngine {
	/**
	 * HTML element used as container to the table engine.
	 */
	private readonly _container: HTMLElement;

	/**
	 * Cell model of the table engine.
	 */
	private readonly _cellModel: ICellModel;

	/**
	 * Selection model of the table engine.
	 */
	private readonly _selectionModel: ISelectionModel;

	/**
	 * Border model of the table engine.
	 */
	private readonly _borderModel: IBorderModel;

	/**
	 * Options customizing the table-engine behavior.
	 */
	private readonly _options: ITableEngineOptions;

	/**
	 * Renderer to use for rendering the table.
	 */
	private readonly _renderer: ITableEngineRenderer;

	/**
	 * Subject that will emit events when something meaningful happens in the table engine.
	 */
	private readonly _events: Subject<ITableEngineEvent> =
		new Subject<ITableEngineEvent>();

	/**
	 * Whether the engine is already initialized.
	 */
	private _isInitialized: boolean = false;

	/**
	 * Create table engine and initialize it on the passed
	 * container element.
	 * @param container to initialize the table engine in
	 * @param cellModel to use as cell model for the table engine
	 * @param options used to modify the default behavior of the table engine
	 */
	constructor(
		container: HTMLElement,
		cellModel: ICellModel,
		options?: ITableEngineOptions
	) {
		this._container = container;
		this._cellModel = cellModel;

		// Initialize options
		this._options = fillOptions(options);

		// Initialize selection model
		this._selectionModel = new SelectionModel(
			this._cellModel,
			this._options
		);

		// Initialize border model
		this._borderModel = new BorderModel(this._cellModel, this._options);

		// Initialize renderer
		this._renderer = RendererFactory.getRendererInstance(
			this._options.renderer.type
		);
	}

	/**
	 * Initialize the table engine.
	 * This will start rendering the table.
	 */
	public async initialize(): Promise<void> {
		// Initialize renderer
		await this._renderer.initialize(this._container, this, this._options);
		this._isInitialized = true;

		this._events.next({
			type: TableEngineEventType.RENDERER_READY,
		});

		this.repaint();
	}

	/**
	 * Repaint the table manually.
	 * You might need to do that for example after changing the table-engine options (fixed rows, fixed columns, ...).
	 */
	public repaint(): void {
		this._renderer.render();
	}

	/**
	 * Request focus on the table.
	 */
	public requestFocus(): void {
		this._renderer.requestFocus();
	}

	/**
	 * Check whether the table is currently focused.
	 */
	public isFocused(): boolean {
		return this._renderer.isFocused();
	}

	/**
	 * Scroll to the given row and column.
	 * @param row to scroll to
	 * @param column to scroll to
	 */
	public scrollTo(row: number, column: number): void {
		this._renderer.scrollTo(row, column);
	}

	/**
	 * Set the zoom level.
	 * @param zoom level (1.0 = 100%)
	 */
	public setZoom(zoom: number): void {
		this._renderer.setZoom(zoom);
	}

	/**
	 * Set the cursor to currently display when hovering the render container.
	 * @param cursorName to display
	 */
	public setCursor(cursorName: string): void {
		this._renderer.setCursor(cursorName);
	}

	/**
	 * Reset the cursor that is currently displayed when hovering the render container.
	 */
	public resetCursor(): void {
		this._renderer.resetCursor();
	}

	/**
	 * Get the current zoom level of the table (1.0 = 100%).
	 */
	public getZoom(): number {
		return this._renderer.getZoom();
	}

	public getScrollOffset(): IPoint {
		return this._renderer.getScrollOffset();
	}

	public getViewport(): IRectangle {
		return this._renderer.getViewport();
	}

	public getFixedAreaInfos(): IFixedAreaInfos {
		return this._renderer.getFixedAreaInfos();
	}

	/**
	 * Get the table engines options.
	 */
	public getOptions(): ITableEngineOptions {
		return this._options;
	}

	/**
	 * Get the table engines cell model.
	 */
	public getCellModel(): ICellModel {
		return this._cellModel;
	}

	/**
	 * Get the table engines selection model.
	 */
	public getSelectionModel(): ISelectionModel {
		return this._selectionModel;
	}

	/**
	 * Get the table engines border model.
	 */
	public getBorderModel(): IBorderModel {
		return this._borderModel;
	}

	/**
	 * Get the overlay manager of the table-engine.
	 */
	public getOverlayManager(): IOverlayManager {
		return this._renderer;
	}

	/**
	 * Get an observable of table engine events.
	 */
	public getEventsObservable(): Observable<ITableEngineEvent> {
		return this._events.asObservable();
	}

	/**
	 * Register a cell renderer.
	 * @param renderer to register
	 */
	public registerCellRenderer(renderer: ICellRenderer<any>): void {
		if (this._isInitialized) {
			throw new Error(
				'Cannot register renderers when table-engine is already initialized'
			);
		}

		this._renderer.registerCellRenderer(renderer);
	}

	/**
	 * Cleanup the table engine when no more needed.
	 */
	public cleanup(): void {
		this._renderer.cleanup();
		this._cellModel.cleanup();

		this._events.complete();
	}
}
