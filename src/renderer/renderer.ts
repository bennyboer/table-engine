import {ICellRenderer} from "./cell/cell-renderer";
import {TableEngine} from "../table-engine";
import {IOverlayManager} from "../overlay/overlay-manager";
import {ITableEngineOptions} from "../options";

/**
 * Representation of a renderer of the table engine.
 * It is responsible for rendering the table.
 */
export interface ITableEngineRenderer extends IOverlayManager {

	/**
	 * Initialize the renderer with the given options on the passed HTML container.
	 * @param container to initialize renderer in
	 * @param engine reference to the table-engine
	 * @param options of the table engine (including renderer options)
	 */
	initialize(container: HTMLElement, engine: TableEngine, options: ITableEngineOptions): Promise<void>;

	/**
	 * (Re)-Render the table.
	 */
	render(): void;

	/**
	 * Register a cell renderer responsible for
	 * rendering a single cells value.
	 * @param renderer to register
	 */
	registerCellRenderer(renderer: ICellRenderer<any>): void;

	/**
	 * Request focus on the table.
	 */
	requestFocus(): void;

	/**
	 * Whether the table is currently focused.
	 */
	isFocused(): boolean;

	/**
	 * Set the zoom level.
	 * @param zoom level (1.0 = 100%)
	 */
	setZoom(zoom: number): void;

	/**
	 * Get the current zoom level (1.0 = 100%).
	 */
	getZoom(): number;

	/**
	 * Cleanup the renderer when no more needed.
	 */
	cleanup(): void;

	/**
	 * Scroll to the cell at the given row and column (if not already in the current view).
	 * @param row to scroll to
	 * @param column to scroll to
	 */
	scrollTo(row: number, column: number): void;

}
