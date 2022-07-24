import { ICanvasCellRenderer } from '../canvas-cell-renderer';
import { ICell } from '../../../../cell';
import { IRectangle, ISize } from '../../../../util';
import { ISelectionModel } from '../../../../selection';
import { TableEngine } from '../../../../table-engine';
import { IRenderContext } from '../../canvas-renderer';
import { ICellRendererEventListener } from '../../../cell';

/**
 * Spreadsheet like row/column headers.
 */
export class RowColumnHeaderRenderer implements ICanvasCellRenderer {
	/**
	 * Name of the cell renderer.
	 */
	public static readonly NAME: string = 'row-column-header';

	/**
	 * Available letters in the alphabet to use for generating column names.
	 */
	private static readonly ALPHABET: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

	/**
	 * Size of the highlight rect that is displayed when the row or column of the row/column header
	 * is currently selected.
	 */
	private static readonly HIGHLIGHT_RECT_SIZE: number = 3;

	/**
	 * Color of the highlight rect that is displayed when the row or column of the row/column header
	 * is currently selected.
	 */
	private static readonly HIGHLIGHT_RECT_COLOR: string = '#FF3366';

	/**
	 * Background color of a row/column header cell.
	 */
	private static readonly BACKGROUND_COLOR: string = '#F9F9F9';

	/**
	 * Background color of a hovered row/column header cell.
	 */
	private static readonly HOVER_BACKGROUND_COLOR: string = '#EAEAEA';

	/**
	 * The table-engines selection model.
	 */
	private _selectionModel: ISelectionModel;

	/**
	 * Reference to the table engine.
	 */
	private _engine: TableEngine;

	/**
	 * Currently hovered cell.
	 */
	private _hoveredCell: ICell | null = null;

	/**
	 * Event listeners on the cells with this cell renderer.
	 */
	private readonly _eventListener: ICellRendererEventListener = {
		onMouseMove: (event) => {
			if (event.cell !== this._hoveredCell) {
				this._hoveredCell = event.cell;
				this._engine.repaint();
			}
		},
		onMouseOut: () => {
			if (this._hoveredCell !== null) {
				this._hoveredCell = null;
				this._engine.repaint();
			}
		},
	};

	private static _cache(cell: ICell): IViewportCache {
		if (!!cell.viewportCache) {
			return cell.viewportCache as IViewportCache;
		} else {
			const cache: IViewportCache = {};
			cell.viewportCache = cache;
			return cache;
		}
	}

	/**
	 * Initialize the cell renderer.
	 * This is only called once.
	 * @param engine reference to the table-engine
	 */
	public initialize(engine: TableEngine): void {
		this._engine = engine;
		this._selectionModel = engine.getSelectionModel();
	}

	/**
	 * Get the name of the cell renderer.
	 * This must be unique.
	 */
	public getName(): string {
		return RowColumnHeaderRenderer.NAME;
	}

	/**
	 * Called before rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 * @param context of the current rendering cycle
	 */
	public before(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext
	): void {
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
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
	 * Get the event listeners on cells for this cell renderer.
	 */
	public getEventListener(): ICellRendererEventListener | null {
		return this._eventListener;
	}

	/**
	 * Get the cells value.
	 * @param row to get value for
	 * @param column to get value for
	 */
	private static _getCellValue(row: number, column: number): string | null {
		if (row === 0 && column === 0) {
			return null;
		} else if (row === 0) {
			// Generate column header
			let result: number[] = [];

			let remaining: number = column - 1;
			let firstPass: boolean = true;
			do {
				if (firstPass) {
					firstPass = false;
				} else {
					remaining -= 1;
				}

				const rest: number =
					remaining % RowColumnHeaderRenderer.ALPHABET.length;
				result.push(rest);

				remaining = Math.floor(
					remaining / RowColumnHeaderRenderer.ALPHABET.length
				);
			} while (remaining > 0);

			return result
				.reverse()
				.map((v) => RowColumnHeaderRenderer.ALPHABET[v])
				.join('');
		} else {
			// Generate row header
			return `${row}`;
		}
	}

	/**
	 * Called when there are no cells that need to be rendered with the renderer in
	 * the current viewport.
	 */
	public cleanup(): void {
		// Nothing to cleanup
	}

	/**
	 * Render the given cell in the passed bounds.
	 * @param ctx context to render with
	 * @param cell to render
	 * @param bounds to render cell in
	 */
	public render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		ctx.fillStyle =
			cell === this._hoveredCell
				? RowColumnHeaderRenderer.HOVER_BACKGROUND_COLOR
				: RowColumnHeaderRenderer.BACKGROUND_COLOR;
		ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

		const preferredSize: ISize = {
			width: 0,
			height: 0,
		};

		const value: string | null = RowColumnHeaderRenderer._getCellValue(
			cell.range.startRow,
			cell.range.startColumn
		);
		if (!!value) {
			const isRowHeader: boolean = cell.range.startColumn === 0;
			let selected: boolean;
			if (isRowHeader) {
				// Is row header
				selected = this._isRowSelected(cell.range.startRow);
				if (selected) {
					selected = true;
					ctx.fillStyle =
						RowColumnHeaderRenderer.HIGHLIGHT_RECT_COLOR;
					ctx.fillRect(
						bounds.left +
							bounds.width -
							RowColumnHeaderRenderer.HIGHLIGHT_RECT_SIZE,
						bounds.top,
						RowColumnHeaderRenderer.HIGHLIGHT_RECT_SIZE,
						bounds.height
					);
				}
			} else {
				// Is column header
				selected = this._isColumnSelected(cell.range.startColumn);
				if (selected) {
					ctx.fillStyle =
						RowColumnHeaderRenderer.HIGHLIGHT_RECT_COLOR;
					ctx.fillRect(
						bounds.left,
						bounds.top +
							bounds.height -
							RowColumnHeaderRenderer.HIGHLIGHT_RECT_SIZE,
						bounds.width,
						RowColumnHeaderRenderer.HIGHLIGHT_RECT_SIZE
					);
				}
			}

			ctx.fillStyle = '#333333'; // Foreground color

			const fontSize: number = 12;
			if (selected) {
				ctx.font = `bold ${fontSize}px sans-serif`;
			} else {
				ctx.font = `${fontSize}px sans-serif`;
			}
			const textWidth = ctx.measureText(value).width;
			ctx.fillText(
				value,
				Math.round(bounds.left + bounds.width / 2),
				Math.round(bounds.top + bounds.height / 2)
			);

			preferredSize.width = textWidth;
			preferredSize.height = fontSize;
		}

		const cache = RowColumnHeaderRenderer._cache(cell);
		cache.preferredSize = preferredSize;
	}

	/**
	 * Check if the given row index is selected.
	 * @param rowIndex to check
	 */
	private _isRowSelected(rowIndex: number): boolean {
		for (const s of this._selectionModel.getSelections()) {
			if (s.range.startRow <= rowIndex && s.range.endRow >= rowIndex) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if the given column index is selected.
	 * @param columnIndex to check
	 */
	private _isColumnSelected(columnIndex: number): boolean {
		for (const s of this._selectionModel.getSelections()) {
			if (
				s.range.startColumn <= columnIndex &&
				s.range.endColumn >= columnIndex
			) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Get the copy value of the passed cell rendered with this renderer.
	 * This may be a HTML representation of the value (for example for copying formatting, lists, ...).
	 */
	public getCopyValue(cell: ICell): string {
		return '';
	}

	/**
	 * Called when the passed cell is disappearing from the visible area (viewport).
	 * @param cell that is disappearing
	 */
	public onDisappearing(cell: ICell): void {
		// Do nothing
	}

	estimatePreferredSize(cell: ICell): ISize {
		const cache: IViewportCache = RowColumnHeaderRenderer._cache(cell);
		if (!!cache.preferredSize) {
			return cache.preferredSize;
		} else {
			return null;
		}
	}
}

interface IViewportCache {
	preferredSize?: ISize;
}
