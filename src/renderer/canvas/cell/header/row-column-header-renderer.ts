import {ICanvasCellRenderer} from "../canvas-cell-renderer";
import {ICell} from "../../../../cell/cell";
import {IRectangle} from "../../../../util/rect";
import {ICellModel} from "../../../../cell/model/cell-model.interface";
import {ISelectionModel} from "../../../../selection/model/selection-model.interface";
import {TableEngine} from "../../../../table-engine";

/**
 * Spreadsheet like row/column headers.
 */
export class RowColumnHeaderRenderer implements ICanvasCellRenderer {

	/**
	 * Available letters in the alphabet to use for generating column names.
	 */
	private static readonly ALPHABET: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

	/**
	 * Size of the highlight rect that is displayed when the row or column of the row/column header
	 * is currently selected.
	 */
	private static readonly HIGHLIGHT_RECT_SIZE: number = 3;

	/**
	 * Color of the highlight rect that is displayed when the row or column of the row/column header
	 * is currently selected.
	 */
	private static readonly HIGHLIGHT_RECT_COLOR: string = "#FF3366";

	/**
	 * The table-engines selection model.
	 */
	private _selectionModel: ISelectionModel;

	/**
	 * Initialize the cell renderer.
	 * This is only called once.
	 * @param engine reference to the table-engine
	 */
	public initialize(engine: TableEngine): void {
		this._selectionModel = engine.getSelectionModel();
	}

	/**
	 * Get the name of the cell renderer.
	 * This must be unique.
	 */
	public getName(): string {
		return "row-column-header";
	}

	/**
	 * Called before rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 */
	public before(ctx: CanvasRenderingContext2D): void {
		// TODO Make those things customizable (Renderer options?)
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

				const rest: number = remaining % RowColumnHeaderRenderer.ALPHABET.length;
				result.push(rest);

				remaining = Math.floor(remaining / RowColumnHeaderRenderer.ALPHABET.length);
			} while (remaining > 0);

			return result.reverse()
				.map((v) => RowColumnHeaderRenderer.ALPHABET[v])
				.join("");
		} else {
			// Generate row header
			return `${row}`;
		}
	}

	/**
	 * Render the given cell in the passed bounds.
	 * @param ctx context to render with
	 * @param cell to render
	 * @param bounds to render cell in
	 */
	public render(ctx: CanvasRenderingContext2D, cell: ICell, bounds: IRectangle): void {
		ctx.fillStyle = "#F9F9F9"; // Background color
		ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

		const value: string | null = RowColumnHeaderRenderer._getCellValue(cell.range.startRow, cell.range.startColumn);
		if (!!value) {
			const isRowHeader: boolean = cell.range.startColumn === 0;
			let selected: boolean = false;
			if (isRowHeader) {
				// Is row header
				selected = this._isRowSelected(cell.range.startRow);
				if (selected) {
					selected = true;
					ctx.fillStyle = RowColumnHeaderRenderer.HIGHLIGHT_RECT_COLOR;
					ctx.fillRect(bounds.left + bounds.width - RowColumnHeaderRenderer.HIGHLIGHT_RECT_SIZE, bounds.top, RowColumnHeaderRenderer.HIGHLIGHT_RECT_SIZE, bounds.height);
				}
			} else {
				// Is column header
				selected = this._isColumnSelected(cell.range.startColumn);
				if (selected) {
					ctx.fillStyle = RowColumnHeaderRenderer.HIGHLIGHT_RECT_COLOR;
					ctx.fillRect(bounds.left, bounds.top + bounds.height - RowColumnHeaderRenderer.HIGHLIGHT_RECT_SIZE, bounds.width, RowColumnHeaderRenderer.HIGHLIGHT_RECT_SIZE);
				}
			}

			ctx.fillStyle = "#333333"; // Foreground color
			if (selected) {
				ctx.font = "bold 12px sans-serif";
			} else {
				ctx.font = "12px sans-serif";
			}
			ctx.fillText(value, Math.round(bounds.left + bounds.width / 2), Math.round(bounds.top + bounds.height / 2));
		}
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
			if (s.range.startColumn <= columnIndex && s.range.endColumn >= columnIndex) {
				return true;
			}
		}

		return false;
	}

}
