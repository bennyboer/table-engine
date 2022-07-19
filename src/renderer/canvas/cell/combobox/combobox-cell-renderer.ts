import {ICanvasCellRenderer} from "../canvas-cell-renderer";
import {fillOptions, IComboBoxCellRendererOptions} from "./combobox-cell-renderer-options";
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
		onMouseUp: (event) => this._onClick(event)
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

	after(ctx: CanvasRenderingContext2D): void {
		// Nothing to do after rendering all cells with this renderer
	}

	before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		// Nothing to do before rendering all cells with this renderer
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

		let placeholder: string = this._options.placeholder;
		let labelColor: IColor = this._options.labelColor;
		let placeholderColor: IColor = this._options.placeholderColor;
		let padding: number = this._options.padding;
		if (!!value.options) {
			if (!!value.options.placeholder) {
				placeholder = value.options.placeholder;
			}
			if (!!value.options.labelColor) {
				labelColor = value.options.labelColor;
			}
			if (!!value.options.placeholderColor) {
				placeholderColor = value.options.placeholderColor;
			}
			if (value.options.padding !== undefined && value.options.padding !== null) {
				padding = value.options.padding;
			}
		}

		const labelXOffset = bounds.left + padding;
		const labelYOffset = bounds.top + Math.round(bounds.height / 2);

		const showPlaceholder = !value.selected_option_id;
		if (showPlaceholder) {
			ctx.fillStyle = Colors.toStyleStr(placeholderColor);
			ctx.fillText(placeholder, labelXOffset, labelYOffset);
		} else {
			const selectedOption: IComboBoxOption = value.select_options[value.selected_option_id];

			ctx.fillStyle = Colors.toStyleStr(labelColor);
			ctx.fillText(selectedOption.label, labelXOffset, labelYOffset);
		}

		// TODO Render select arrow (different color when non-editable)
	}

	private _onClick(event: ICellRendererMouseEvent): void {
		// TODO
		console.log(event);
	}

}
