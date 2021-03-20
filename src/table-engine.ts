import {ICellModel} from "./cell/model/cell-model.interface";
import {fillOptions, ITableEngineOptions} from "./options";
import {ITableEngineRenderer} from "./renderer/renderer";
import {RendererFactory} from "./renderer/renderer-factory";
import {Observable, Subject} from "rxjs";
import {ITableEngineEvent} from "./event/event";
import {TableEngineEventType} from "./event/event-type";
import {ICellRenderer} from "./renderer/cell/cell-renderer";

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
	private readonly _events: Subject<ITableEngineEvent> = new Subject<ITableEngineEvent>();

	/**
	 * Create table engine and initialize it on the passed
	 * container element.
	 * @param container to initialize the table engine in
	 * @param cellModel to use as cell model for the table engine
	 * @param options used to modify the default behavior of the table engine
	 */
	constructor(container: HTMLElement, cellModel: ICellModel, options?: ITableEngineOptions) {
		this._container = container;
		this._cellModel = cellModel;
		this._options = fillOptions(options);

		// Initialize renderer
		this._renderer = RendererFactory.getRendererInstance(this._options.renderer.type);
	}

	/**
	 * Initialize the table engine.
	 * This will start rendering the table.
	 */
	public async initialize(): Promise<void> {
		await this._renderer.initialize(this._container, this._cellModel, this._options.renderer);

		this._events.next({
			type: TableEngineEventType.RENDERER_READY
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
		this._renderer.registerCellRenderer(renderer);
	}

	/**
	 * Cleanup the table engine when no more needed.
	 */
	public cleanup(): void {
		this._renderer.cleanup();

		this._events.complete();
	}

}
