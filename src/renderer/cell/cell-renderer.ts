import {IRectangle} from "../../util/rect";
import {ICell} from "../../cell/cell";
import {TableEngine} from "../../table-engine";
import {ICellRendererEventListener} from "./event/cell-renderer-event-listener";

/**
 * Renderer responsible for a single cell.
 *
 * C: Rendering context used to actually render something (for example a CanvasRenderingContext2D)
 */
export interface ICellRenderer<C> {

	/**
	 * Initialize the cell renderer.
	 * This is only called once.
	 * @param engine reference to the table-engine
	 */
	initialize(engine: TableEngine): void;

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
	render(ctx: C, cell: ICell, bounds: IRectangle): void

	/**
	 * Get the event listeners on cells for this cell renderer.
	 */
	getEventListener(): ICellRendererEventListener | null;

	/**
	 * Get the copy value of the passed cell rendered with this renderer.
	 * This may be a HTML representation of the value (for example for copying formatting, lists, ...).
	 */
	getCopyValue(cell: ICell): string;

}
