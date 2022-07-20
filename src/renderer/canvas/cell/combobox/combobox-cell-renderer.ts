import {ICanvasCellRenderer} from "../canvas-cell-renderer";
import {
	fillOptions,
	IComboBoxCellRendererOptions,
	IPlaceholderOptions,
	ISelectArrowOptions
} from "./combobox-cell-renderer-options";
import {TableEngine} from "../../../../table-engine";
import {IRenderContext} from "../../canvas-renderer";
import {ICell} from "../../../../cell/cell";
import {ICellRendererEventListener} from "../../../cell/event/cell-renderer-event-listener";
import {IRectangle} from "../../../../util/rect";
import {ICellRendererMouseEvent} from "../../../cell/event/cell-renderer-mouse-event";
import {IComboBoxCellRendererValue, IComboBoxOption} from "./combobox-cell-renderer-value";
import {IColor} from "../../../../util/color";
import {Colors} from "../../../../util/colors";

export class ComboBoxCellRenderer implements ICanvasCellRenderer {

	static readonly NAME: string = "combobox";

	private readonly _options: IComboBoxCellRendererOptions;

	private _engine: TableEngine;

	private _eventListener: ICellRendererEventListener = {
		onMouseUp: (event) => this._onClick(event),
		onMouseMove: (event) => this._onMouseMove(event),
		onMouseOut: (event) => this._onMouseOut(event)
	};

	constructor(options?: IComboBoxCellRendererOptions) {
		this._options = fillOptions(options);
	}

	private static _value(cell: ICell): IComboBoxCellRendererValue {
		if (cell.value === undefined || cell.value === null) {
			return {
				select_options: {}
			} as IComboBoxCellRendererValue;
		}

		return cell.value as IComboBoxCellRendererValue;
	}

	private static _cache(cell: ICell): IViewportCache {
		if (!!cell.viewportCache) {
			return cell.viewportCache as IViewportCache;
		} else {
			const cache: IViewportCache = {
				hovered: false
			};
			cell.viewportCache = cache;
			return cache;
		}
	}

	after(ctx: CanvasRenderingContext2D): void {
		// Nothing to do after rendering all cells with this renderer
	}

	before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		ctx.textAlign = "left";
	}

	cleanup(): void {
		// Nothing to cleanup
	}

	getCopyValue(cell: ICell): string {
		return `${ComboBoxCellRenderer._value(cell)}`;
	}

	getEventListener(): ICellRendererEventListener | null {
		return this._eventListener;
	}

	getName(): string {
		return ComboBoxCellRenderer.NAME;
	}

	initialize(engine: TableEngine): void {
		this._engine = engine;
	}

	onDisappearing(cell: ICell): void {
		// Nothing to do when a cell disappears from the viewport
	}

	render(ctx: CanvasRenderingContext2D, cell: ICell, bounds: IRectangle): void {
		const value: IComboBoxCellRendererValue = ComboBoxCellRenderer._value(cell);
		const cache: IViewportCache = ComboBoxCellRenderer._cache(cell);

		const style: IRenderingStyle = this._determineRenderingStyle(value, cache);

		ComboBoxCellRenderer._renderLabel(ctx, bounds, value, style);
		ComboBoxCellRenderer._renderSelectArrow(ctx, bounds, style);
	}

	private _determineRenderingStyle(value: IComboBoxCellRendererValue, cache: IViewportCache): IRenderingStyle {
		let editable: boolean = this._options.editable;
		let hovered = cache.hovered;
		let labelColor: IColor = this._options.labelColor;
		let padding: number = this._options.padding;
		let placeholderOptions: IPlaceholderOptions = this._options.placeholder;
		let selectArrowOptions: ISelectArrowOptions = this._options.selectArrow;

		if (!!value.options) {
			if (value.options.editable !== undefined && value.options.editable !== null) {
				editable = value.options.editable;
			}
			if (!!value.options.labelColor) {
				labelColor = value.options.labelColor;
			}
			if (value.options.padding !== undefined && value.options.padding !== null) {
				padding = value.options.padding;
			}
			if (!!value.options.placeholder) {
				placeholderOptions = value.options.placeholder;
			}
			if (!!value.options.selectArrow) {
				selectArrowOptions = value.options.selectArrow;
			}
		}

		return {
			editable,
			hovered,
			labelColor,
			padding,
			placeholderOptions,
			selectArrowOptions
		}
	}

	private static _renderSelectArrow(
		ctx: CanvasRenderingContext2D,
		bounds: IRectangle,
		style: IRenderingStyle
	) {
		const selectArrowPath: ISelectArrowPath = ComboBoxCellRenderer._makeSelectArrowPath();

		const selectArrowWidth: number = selectArrowPath.width * style.selectArrowOptions.size;
		const selectArrowHeight: number = selectArrowPath.height * style.selectArrowOptions.size;

		const transformedSelectArrowPath: Path2D = new Path2D();
		transformedSelectArrowPath.addPath(
			selectArrowPath.path,
			new DOMMatrix()
				.translateSelf(
					bounds.left + bounds.width - selectArrowWidth - style.padding,
					bounds.top + Math.round((bounds.height - selectArrowHeight) / 2)
				)
				.scaleSelf(style.selectArrowOptions.size, style.selectArrowOptions.size)
		);

		console.log(style.hovered);
		ctx.strokeStyle = Colors.toStyleStr(style.hovered ? style.selectArrowOptions.hoverColor : style.selectArrowOptions.color);
		ctx.lineWidth = style.selectArrowOptions.thickness;
		ctx.lineCap = style.selectArrowOptions.lineCap;
		ctx.lineJoin = style.selectArrowOptions.lineJoin;

		ctx.stroke(transformedSelectArrowPath);
	}

	private static _renderLabel(
		ctx: CanvasRenderingContext2D,
		bounds: IRectangle,
		value: IComboBoxCellRendererValue,
		style: IRenderingStyle
	) {
		const labelXOffset = bounds.left + style.padding;
		const labelYOffset = bounds.top + Math.round(bounds.height / 2);

		const showPlaceholder = !value.selected_option_id;
		if (showPlaceholder) {
			ctx.fillStyle = Colors.toStyleStr(style.placeholderOptions.color);
			ctx.fillText(style.placeholderOptions.text, labelXOffset, labelYOffset);
		} else {
			const selectedOption: IComboBoxOption = value.select_options[value.selected_option_id];

			ctx.fillStyle = Colors.toStyleStr(style.labelColor);
			ctx.fillText(selectedOption.label, labelXOffset, labelYOffset);
		}
	}

	private static _makeSelectArrowPath(): ISelectArrowPath {
		const path: Path2D = new Path2D();

		path.moveTo(0.0, 0.0);
		path.lineTo(0.5, 0.45);
		path.lineTo(1.0, 0.0);

		return {
			path,
			width: 1.0,
			height: 0.4
		};
	}

	private _onClick(event: ICellRendererMouseEvent): void {
		// TODO
		console.log(event);
	}

	private _onMouseMove(event: ICellRendererMouseEvent): void {
		const cache: IViewportCache = ComboBoxCellRenderer._cache(event.cell);
		const value: IComboBoxCellRendererValue = ComboBoxCellRenderer._value(event.cell);

		let editable: boolean = this._options.editable;
		if (!!value.options && value.options.editable !== undefined && value.options.editable !== null) {
			editable = value.options.editable;
		}

		if (editable && !cache.hovered) {
			cache.hovered = true;
			this._engine.repaint();
		}
	}

	private _onMouseOut(event: ICellRendererMouseEvent): void {
		const cache: IViewportCache = ComboBoxCellRenderer._cache(event.cell);
		if (cache.hovered) {
			cache.hovered = false;
			this._engine.repaint();
		}
	}

}

interface ISelectArrowPath {
	path: Path2D,
	width: number,
	height: number
}

interface IRenderingStyle {
	editable: boolean;
	hovered: boolean;
	labelColor: IColor;
	padding: number;
	placeholderOptions: IPlaceholderOptions;
	selectArrowOptions: ISelectArrowOptions;
}

interface IViewportCache {
	hovered: boolean;
}
