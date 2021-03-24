import {ICanvasCellRenderer} from "../canvas-cell-renderer";
import {ICell} from "../../../../cell/cell";
import {IRectangle} from "../../../../util/rect";

/**
 * Spreadsheet like row/column headers.
 */
export class RowColumnHeaderRenderer implements ICanvasCellRenderer {

	/**
	 * Available letters in the alphabet to use for generating column names.
	 */
	private static readonly ALPHABET: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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
		ctx.font = "12px sans-serif";
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
			ctx.fillStyle = "#333333"; // Foreground color
			ctx.fillText(value, Math.round(bounds.left + bounds.width / 2), Math.round(bounds.top + bounds.height / 2));
		}
	}

}
