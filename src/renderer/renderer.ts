import {IRendererOptions} from "./options";
import {ICellModel} from "../cell/model/cell-model.interface";

/**
 * Representation of a renderer of the table engine.
 * It is responsible for rendering the table.
 */
export interface ITableEngineRenderer {

	/**
	 * Initialize the renderer with the given options on the passed HTML container.
	 * @param container to initialize renderer in
	 * @param cellModel to render cells from
	 * @param options of the renderer
	 */
	initialize(container: HTMLElement, cellModel: ICellModel, options: IRendererOptions): Promise<void>;

	/**
	 * (Re)-Render the table.
	 */
	render(): void;

}
