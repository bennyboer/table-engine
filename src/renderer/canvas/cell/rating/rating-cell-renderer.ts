import {ICanvasCellRenderer} from "../canvas-cell-renderer";
import {IRenderContext} from "../../canvas-renderer";
import {ICell} from "../../../../cell/cell";
import {ICellRendererEventListener} from "../../../cell/event/cell-renderer-event-listener";
import {TableEngine} from "../../../../table-engine";
import {IRectangle} from "../../../../util/rect";
import {fillOptions, IRatingCellRendererOptions} from "./rating-cell-renderer-options";
import {IRatingCellRendererValue} from "./rating-cell-renderer-value";
import {IPoint} from "../../../../util/point";
import {Colors} from "../../../../util/colors";

/**
 * Cell renderer rendering a rating visualization using a row of stars.
 */
export class RatingCellRenderer implements ICanvasCellRenderer {

	/**
	 * Name of the cell renderer.
	 */
	public static readonly NAME: string = "rating";

	/**
	 * Options of the cell renderer.
	 */
	private readonly _options: IRatingCellRendererOptions;

	/**
	 * Reference to the table engine.
	 */
	private _engine: TableEngine;

	constructor(options?: IRatingCellRendererOptions) {
		this._options = fillOptions(options);
	}

	/**
	 * Get the value for this cell renderer for the given cell.
	 * @param cell to get cell renderer value for
	 */
	private static _value(cell: ICell): IRatingCellRendererValue {
		const isSpecialValue: boolean = !!cell.value && typeof cell.value === "object" && "rating" in cell.value;

		if (isSpecialValue) {
			return cell.value as IRatingCellRendererValue;
		} else {
			return {
				rating: cell.value
			};
		}
	}

	public after(ctx: CanvasRenderingContext2D): void {
		// Nothing to do after rendering all cells with this renderer
	}

	public before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		ctx.fillStyle = Colors.toStyleStr(this._options.color);
	}

	public cleanup(): void {
		// Nothing to cleanup
	}

	public getCopyValue(cell: ICell): string {
		return `${RatingCellRenderer._value(cell).rating}`;
	}

	public getEventListener(): ICellRendererEventListener | null {
		return null; // TODO Make cell renderer editable if set in options
	}

	public getName(): string {
		return RatingCellRenderer.NAME;
	}

	public initialize(engine: TableEngine): void {
		this._engine = engine;
	}

	public onDisappearing(cell: ICell): void {
		// Nothing to do when a cell disappears from the viewport
	}

	public render(ctx: CanvasRenderingContext2D, cell: ICell, bounds: IRectangle): void {
		if (!cell.value) {
			return;
		}

		const value: IRatingCellRendererValue = RatingCellRenderer._value(cell);

		let savedContext: boolean = false;

		let starCount: number = this._options.starCount;
		let maxValue: number = this._options.maxValue;
		let spacing: number = this._options.spacing;
		let padding: number = this._options.padding;
		if (!!value.options) {
			if (value.options.starCount !== undefined && value.options.starCount !== null) {
				starCount = value.options.starCount;
			}
			if (value.options.maxValue !== undefined && value.options.maxValue !== null) {
				maxValue = value.options.maxValue;
			}
			if (value.options.spacing !== undefined && value.options.spacing !== null) {
				spacing = value.options.spacing;
			}
			if (value.options.padding !== undefined && value.options.padding !== null) {
				padding = value.options.padding;
			}
			if (!!value.options.color) {
				if (!savedContext) {
					savedContext = true;
					ctx.save();
				}

				ctx.fillStyle = Colors.toStyleStr(value.options.color);
			}
		}

		// Render stars
		const sizePerStar: number = Math.min((bounds.width - padding * 2) / starCount, bounds.height - padding * 2);
		const totalWidth: number = sizePerStar * starCount;

		const xOffset: number = bounds.left + Math.round((bounds.width - totalWidth) / 2);
		const yOffset: number = bounds.top + Math.round((bounds.height - sizePerStar) / 2);

		for (let i = 0; i < starCount; i++) {
			RatingCellRenderer._renderStar(ctx, {
				x: xOffset + sizePerStar * i,
				y: yOffset
			}, sizePerStar - spacing);
		}

		if (savedContext) {
			ctx.restore();
		}
	}

	/**
	 * Render a star at the given offset with the passed size.
	 * @param ctx to render star with
	 * @param offset to render star at
	 * @param size to render star with
	 */
	private static _renderStar(ctx: CanvasRenderingContext2D, offset: IPoint, size: number) {
		ctx.beginPath();

		ctx.moveTo(offset.x + size * 0.5, offset.y);
		ctx.lineTo(offset.x + size * 0.65, offset.y + size * 0.35);

		ctx.lineTo(offset.x + size, offset.y + size * 0.4);
		ctx.lineTo(offset.x + size * 0.7, offset.y + size * 0.6);

		ctx.lineTo(offset.x + size * 0.8, offset.y + size);
		ctx.lineTo(offset.x + size * 0.5, offset.y + size * 0.75);

		ctx.lineTo(offset.x + size * 0.2, offset.y + size);
		ctx.lineTo(offset.x + size * 0.3, offset.y + size * 0.6);

		ctx.lineTo(offset.x, offset.y + size * 0.4);
		ctx.lineTo(offset.x + size * 0.35, offset.y + size * 0.35);

		ctx.fill();
	}

}
