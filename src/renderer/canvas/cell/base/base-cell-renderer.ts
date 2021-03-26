import {ICanvasCellRenderer} from "../canvas-cell-renderer";
import {ICell} from "../../../../cell/cell";
import {IRectangle} from "../../../../util/rect";
import {ICellModel} from "../../../../cell/model/cell-model.interface";
import {ISelectionModel} from "../../../../selection/model/selection-model.interface";

/**
 * Basic cell renderer rendering every value as string.
 */
export class BaseCellRenderer implements ICanvasCellRenderer {

	/**
	 * Initialize the cell renderer.
	 * This is only called once.
	 * @param cellModel of the table-engine
	 * @param selectionModel of the table-engine
	 */
	public initialize(cellModel: ICellModel, selectionModel: ISelectionModel): void {
		// Nothing to do
	}

	/**
	 * Get the name of the cell renderer.
	 * This must be unique.
	 */
	public getName(): string {
		return "base";
	}

	/**
	 * Called before rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 */
	public before(ctx: CanvasRenderingContext2D): void {
		// TODO Make those things customizable (Renderer options?)
		ctx.font = "12px sans-serif";
		ctx.fillStyle = "#333333";
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
	}

	/**
	 * Called after rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 */
	public after(ctx: CanvasRenderingContext2D): void {
		// Nothing to do
	}

	/**
	 * Render the given cell in the passed bounds.
	 * @param ctx context to render with
	 * @param cell to render
	 * @param bounds to render cell in
	 */
	public render(ctx: CanvasRenderingContext2D, cell: ICell, bounds: IRectangle): void {
		if (cell.value !== null) {
			ctx.fillText(`${cell.value}`, Math.round(bounds.left + bounds.width / 2), Math.round(bounds.top + bounds.height / 2));
		}
	}

}
