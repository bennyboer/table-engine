import { IRectangle } from '../../util';
import { ICell } from '../../cell';
import { TableEngine } from '../../table-engine';
import { ICellRendererEventListener } from './event';

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
	render(ctx: C, cell: ICell, bounds: IRectangle): void;

	/**
	 * Get the event listeners on cells for this cell renderer.
	 */
	getEventListener(): ICellRendererEventListener | null;

	/**
	 * Get the copy value of the passed cell rendered with this renderer.
	 * This may be a HTML representation of the value (for example for copying formatting, lists, ...).
	 */
	getCopyValue(cell: ICell): string;

	/**
	 * Called when a cell is disappearing from the visible area (viewport).
	 * @param cell that is disappearing
	 */
	onDisappearing(cell: ICell): void;
}
