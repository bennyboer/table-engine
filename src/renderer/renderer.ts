import {IRendererOptions} from "./options";
import {ICellModel} from "../cell/model/cell-model.interface";
import {ICellRenderer} from "./cell/cell-renderer";
import {ISelectionModel} from "../selection/model/selection-model.interface";

/**
 * Representation of a renderer of the table engine.
 * It is responsible for rendering the table.
 */
export interface ITableEngineRenderer {

	/**
	 * Initialize the renderer with the given options on the passed HTML container.
	 * @param container to initialize renderer in
	 * @param cellModel to render cells from
	 * @param selectionModel to render selection from
	 * @param options of the renderer
	 */
	initialize(container: HTMLElement, cellModel: ICellModel, selectionModel: ISelectionModel, options: IRendererOptions): Promise<void>;

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
	 * Cleanup the renderer when no more needed.
	 */
	cleanup(): void;

}
