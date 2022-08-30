import { ICell } from '../../../../cell';
import { Colors, IRectangle, ISize } from '../../../../util';
import { IRenderContext } from '../../canvas-renderer';
import {
	CellRendererEventListenerType,
	ICellRendererMouseEvent,
} from '../../../cell';
import { AbstractCanvasCellRenderer } from '../abstract-canvas-cell-renderer';
import {
	fillOptions,
	IRowColumnHeaderCellRendererOptions,
} from './header-cell-renderer-options';

/**
 * Spreadsheet like row/column headers.
 */
export class RowColumnHeaderRenderer extends AbstractCanvasCellRenderer<
	any,
	IRowColumnHeaderCellRendererOptions,
	IViewportCache
> {
	/**
	 * Name of the cell renderer.
	 */
	public static readonly NAME: string = 'row-column-header';

	/**
	 * Available letters in the alphabet to use for generating column names.
	 */
	private static readonly ALPHABET: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

	/**
	 * Currently hovered cell.
	 */
	private _hoveredCell: ICell | null = null;

	constructor(options?: IRowColumnHeaderCellRendererOptions) {
		super(RowColumnHeaderRenderer.NAME, fillOptions(options));

		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_MOVE,
			(event) => this._onMouseMove(event as ICellRendererMouseEvent)
		);
		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_OUT,
			(event) => this._onMouseOut(event as ICellRendererMouseEvent)
		);
	}

	estimatePreferredSize(cell: ICell): ISize {
		return this.cache(cell).preferredSize;
	}

	private _onMouseMove(event: ICellRendererMouseEvent): void {
		if (event.cell !== this._hoveredCell) {
			this._hoveredCell = event.cell;
			this.repaint();
		}
	}

	private _onMouseOut(_event: ICellRendererMouseEvent): void {
		if (this._hoveredCell !== null) {
			this._hoveredCell = null;
			this.repaint();
		}
	}

	getDefaultViewportCache(): IViewportCache {
		return {};
	}

	mergeOptions(
		defaultOptions: IRowColumnHeaderCellRendererOptions,
		cellOptions: IRowColumnHeaderCellRendererOptions
	): IRowColumnHeaderCellRendererOptions {
		return defaultOptions;
	}

	getOptionsFromCell(
		cell: ICell
	): IRowColumnHeaderCellRendererOptions | null {
		return null;
	}

	before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
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
		const value: string | null = RowColumnHeaderRenderer._getCellValue(
			cell.range.startRow,
			cell.range.startColumn
		);
		const options = this.options(cell);
		const cache = this.cache(cell);

		ctx.fillStyle = Colors.toStyleStr(
			cell === this._hoveredCell
				? options.hoveredBackgroundColor
				: options.backgroundColor
		);
		ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

		const preferredSize: ISize = {
			width: 0,
			height: 0,
		};

		if (!!value) {
			const isRowHeader: boolean = cell.range.startColumn === 0;
			let selected: boolean;
			if (isRowHeader) {
				// Is row header
				selected = this._isRowSelected(cell.range.startRow);
				if (selected) {
					selected = true;
					ctx.fillStyle = Colors.toStyleStr(
						options.highlightBorderColor
					);
					ctx.fillRect(
						bounds.left +
							bounds.width -
							options.highlightBorderSize,
						bounds.top,
						options.highlightBorderSize,
						bounds.height
					);
				}
			} else {
				// Is column header
				selected = this._isColumnSelected(cell.range.startColumn);
				if (selected) {
					ctx.fillStyle = Colors.toStyleStr(
						options.highlightBorderColor
					);
					ctx.fillRect(
						bounds.left,
						bounds.top +
							bounds.height -
							options.highlightBorderSize,
						bounds.width,
						options.highlightBorderSize
					);
				}
			}

			ctx.fillStyle = '#333333'; // Foreground color

			const fontSize: number = options.fontSize;
			const fontFamily: string = options.fontFamily;
			if (selected) {
				ctx.font = `bold ${fontSize}px ${fontFamily}`;
			} else {
				ctx.font = `${fontSize}px ${fontFamily}`;
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

		cache.preferredSize = preferredSize;
	}

	/**
	 * Check if the given row index is selected.
	 * @param rowIndex to check
	 */
	private _isRowSelected(rowIndex: number): boolean {
		for (const s of this.engine.getSelectionModel().getSelections()) {
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
		for (const s of this.engine.getSelectionModel().getSelections()) {
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
}

interface IViewportCache {
	preferredSize?: ISize;
}
