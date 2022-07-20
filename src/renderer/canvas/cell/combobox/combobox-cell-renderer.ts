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
import {IOverlay} from "../../../../overlay/overlay";
import {IPoint} from "../../../../util/point";

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
		const cache: IViewportCache = ComboBoxCellRenderer._cache(event.cell);
		const value: IComboBoxCellRendererValue = ComboBoxCellRenderer._value(event.cell);

		let editable: boolean = this._options.editable;
		if (!!value.options && value.options.editable !== undefined && value.options.editable !== null) {
			editable = value.options.editable;
		}

		if (editable) {
			const cellBounds: IRectangle = this._engine.getCellModel().getBounds(event.cell.range);
			this._openDropdownOverlay(value, cellBounds);
		}
	}

	private _openDropdownOverlay(value: IComboBoxCellRendererValue, cellBounds: IRectangle): void {
		const listItemFontSize: number = 12; // TODO Configurable
		const listItemHorizontalPadding: number = 8; // TODO Configurable
		const listItemVerticalPadding: number = 4; // TODO Configurable
		const listItemSeparatorSize: number = 1; // TODO Configurable

		const overlayElement: HTMLElement = document.createElement("div");
		overlayElement.style.background = "white";
		overlayElement.style.borderRadius = "0 0 2px 2px";
		overlayElement.style.boxShadow = "2px 2px 4px #999";
		overlayElement.tabIndex = -1; // Div element is focusable

		const listContainerElement: HTMLElement = document.createElement("div");
		listContainerElement.style.height = "100%";
		listContainerElement.style.overflow = "auto";

		// TODO Calculate max available height to the top and bottom
		// TODO Calculate height the dropdown would approx. need
		// TODO When that height is too much for bottom use top direction
		// TODO When top direction is also not enough decide the direction based on which offers more space
		// TODO Restrict overlay height by that available space

		const list: HTMLElement = document.createElement("ul");
		list.className = "table-engine-combobox-dropdown-list";
		list.style.listStyleType = "none";
		list.style.margin = "0";
		list.style.padding = "0";

		let approximateHeight = 0;
		for (const optionId in value.select_options) {
			const label = value.select_options[optionId].label;

			const listItem: HTMLElement = document.createElement("li");
			listItem.style.lineHeight = "1.0";
			listItem.style.fontSize = `${listItemFontSize}px`;
			listItem.style.padding = `${listItemVerticalPadding}px ${listItemHorizontalPadding}px`;
			listItem.style.borderBottom = `${listItemSeparatorSize}px solid #EAEAEA`;
			listItem.textContent = label;

			list.appendChild(listItem);

			const mouseDownListener: (MouseEvent) => void = (event: MouseEvent) => {
				event.stopPropagation(); // Prevent table selection
			};
			const clickListener: (MouseEvent) => void = (event: MouseEvent) => {
				event.stopPropagation(); // Stop table selection
				console.log("Selected element " + optionId);
			};
			listItem.addEventListener("mousedown", mouseDownListener);
			listItem.addEventListener("click", clickListener);

			approximateHeight += listItemFontSize + listItemVerticalPadding * 2 + listItemSeparatorSize;
		}

		listContainerElement.appendChild(list);
		overlayElement.appendChild(listContainerElement);

		const maxDropdownHeight: number = 200; // TODO Configurable
		let dropdownHeight = maxDropdownHeight;
		if (approximateHeight < maxDropdownHeight) {
			dropdownHeight = approximateHeight;
		}

		const overlay: IOverlay = {
			element: overlayElement,
			bounds: {
				left: cellBounds.left,
				top: cellBounds.top + cellBounds.height,
				width: cellBounds.width,
				height: dropdownHeight
			}
		};
		this._engine.getOverlayManager().addOverlay(overlay);

		const scrollListener: (MouseEvent) => void = (event: MouseEvent) => {
			event.stopPropagation(); // Stop table scrolling
		};
		const blurListener: () => void = () => {
			// Remove all event listeners again
			overlayElement.removeEventListener("wheel", scrollListener);
			overlayElement.removeEventListener("blur", blurListener);

			this._engine.getOverlayManager().removeOverlay(overlay); // Remove overlay
			this._engine.requestFocus(); // Re-focus table
		};
		overlayElement.addEventListener("wheel", scrollListener);
		overlayElement.addEventListener("blur", blurListener);

		setTimeout(() => {
			overlayElement.focus();
		});
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
