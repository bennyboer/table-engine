import {IRectangle} from "../../util/rect";
import {ICell} from "../../cell/cell";
import {ICellModel} from "../../cell/model/cell-model.interface";
import {ISelectionModel} from "../../selection/model/selection-model.interface";

/**
 * Renderer responsible for a single cell.
 *
 * C: Rendering context used to actually render something (for example a CanvasRenderingContext2D)
 */
export interface ICellRenderer<C> {

	/**
	 * Initialize the cell renderer.
	 * This is only called once.
	 * @param cellModel of the table-engine
	 * @param selectionModel of the table-engine
	 */
	initialize(cellModel: ICellModel, selectionModel: ISelectionModel): void;

	/**
	 * Get the name of the cell renderer.
	 * This must be unique.
	 */
	getName(): string;

	/**
	 * Render the given cell in the passed bounds.
	 * @param ctx context to render with
	 * @param cell to render
	 * @param bounds to render cell in
	 */
	render(ctx: C, cell: ICell, bounds: IRectangle): void;

}
