import { ICanvasCellRenderer } from '../canvas-cell-renderer';
import {
	fillOptions,
	IComboBoxCellRendererOptions,
	ILabelOptions,
	IPlaceholderOptions,
	ISelectArrowOptions,
} from './combobox-cell-renderer-options';
import { TableEngine } from '../../../../table-engine';
import { IRenderContext } from '../../canvas-renderer';
import { ICell } from '../../../../cell';
import {
	ICellRendererEventListener,
	ICellRendererMouseEvent,
} from '../../../cell';
import { Colors, IRectangle, ISize } from '../../../../util';
import {
	IComboBoxCellRendererValue,
	IComboBoxOption,
} from './combobox-cell-renderer-value';
import { IOverlay } from '../../../../overlay';

export class ComboBoxCellRenderer implements ICanvasCellRenderer {
	static readonly NAME: string = 'combobox';

	private readonly _options: IComboBoxCellRendererOptions;

	private _engine: TableEngine;

	private _eventListener: ICellRendererEventListener = {
		onMouseUp: (event) => this._onClick(event),
		onMouseMove: (event) => this._onMouseMove(event),
		onMouseOut: (event) => this._onMouseOut(event),
	};

	constructor(options?: IComboBoxCellRendererOptions) {
		this._options = fillOptions(options);
	}

	private static _value(cell: ICell): IComboBoxCellRendererValue {
		if (cell.value === undefined || cell.value === null) {
			return {
				select_options: {},
			} as IComboBoxCellRendererValue;
		}

		return cell.value as IComboBoxCellRendererValue;
	}

	private static _cache(cell: ICell): IViewportCache {
		if (!!cell.viewportCache) {
			return cell.viewportCache as IViewportCache;
		} else {
			const cache: IViewportCache = {
				hovered: false,
			};
			cell.viewportCache = cache;
			return cache;
		}
	}

	after(ctx: CanvasRenderingContext2D): void {
		// Nothing to do after rendering all cells with this renderer
	}

	before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		ctx.textAlign = 'left';
	}

	cleanup(): void {
		// Nothing to cleanup
	}

	getCopyValue(cell: ICell): string {
		const value = ComboBoxCellRenderer._value(cell);
		if (!!value.selected_option_id) {
			return value.select_options[value.selected_option_id].label;
		}

		return '';
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

	render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		const value: IComboBoxCellRendererValue =
			ComboBoxCellRenderer._value(cell);
		const cache: IViewportCache = ComboBoxCellRenderer._cache(cell);

		const style: IRenderingStyle = this._determineRenderingStyle(
			value,
			cache
		);

		const selectArrowSize: ISize = ComboBoxCellRenderer._renderSelectArrow(
			ctx,
			bounds,
			style
		);
		const labelSize: ISize = ComboBoxCellRenderer._renderLabel(
			ctx,
			bounds,
			value,
			style,
			selectArrowSize.width
		);

		cache.preferredSize = {
			width: selectArrowSize.width + labelSize.width,
			height: selectArrowSize.height + labelSize.height,
		};
	}

	private _determineRenderingStyle(
		value: IComboBoxCellRendererValue,
		cache: IViewportCache
	): IRenderingStyle {
		let editable: boolean = this._options.editable;
		let hovered = cache.hovered;
		let padding: number = this._options.padding;
		let labelOptions: ILabelOptions = this._options.label;
		let placeholderOptions: IPlaceholderOptions = this._options.placeholder;
		let selectArrowOptions: ISelectArrowOptions = this._options.selectArrow;

		if (!!value.options) {
			if (
				value.options.editable !== undefined &&
				value.options.editable !== null
			) {
				editable = value.options.editable;
			}
			if (
				value.options.padding !== undefined &&
				value.options.padding !== null
			) {
				padding = value.options.padding;
			}
			if (!!value.options.label) {
				labelOptions = value.options.label;
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
			padding,
			labelOptions,
			placeholderOptions,
			selectArrowOptions,
		};
	}

	private static _renderSelectArrow(
		ctx: CanvasRenderingContext2D,
		bounds: IRectangle,
		style: IRenderingStyle
	): ISize {
		const selectArrowPath: ISelectArrowPath =
			ComboBoxCellRenderer._makeSelectArrowPath();

		const selectArrowWidth: number =
			selectArrowPath.width * style.selectArrowOptions.size;
		const selectArrowHeight: number =
			selectArrowPath.height * style.selectArrowOptions.size;

		const transformedSelectArrowPath: Path2D = new Path2D();
		transformedSelectArrowPath.addPath(
			selectArrowPath.path,
			new DOMMatrix()
				.translateSelf(
					bounds.left +
						bounds.width -
						selectArrowWidth -
						style.padding,
					bounds.top +
						Math.round((bounds.height - selectArrowHeight) / 2)
				)
				.scaleSelf(
					style.selectArrowOptions.size,
					style.selectArrowOptions.size
				)
		);

		ctx.strokeStyle = Colors.toStyleStr(
			style.hovered
				? style.selectArrowOptions.hoverColor
				: style.selectArrowOptions.color
		);
		ctx.lineWidth = style.selectArrowOptions.thickness;
		ctx.lineCap = style.selectArrowOptions.lineCap;
		ctx.lineJoin = style.selectArrowOptions.lineJoin;

		ctx.stroke(transformedSelectArrowPath);

		return {
			width: selectArrowWidth + 2 * style.padding,
			height: selectArrowHeight,
		};
	}

	private static _renderLabel(
		ctx: CanvasRenderingContext2D,
		bounds: IRectangle,
		value: IComboBoxCellRendererValue,
		style: IRenderingStyle,
		selectArrowWidth: number
	): ISize {
		const labelXOffset = bounds.left + style.padding;
		const labelYOffset = bounds.top + Math.round(bounds.height / 2);

		let labelText = style.placeholderOptions.text;
		let color = style.placeholderOptions.color;

		const hasLabelSelected = !!value.selected_option_id;
		if (hasLabelSelected) {
			const selectedOption: IComboBoxOption =
				value.select_options[value.selected_option_id];

			labelText = selectedOption.label;
			color = style.labelOptions.color;
		}

		if (style.hovered) {
			color = style.labelOptions.hoveredColor;
		}

		const fontSize = style.labelOptions.fontSize;
		const fontFamily = style.labelOptions.fontFamily;
		ctx.font = `${fontSize}px ${fontFamily}`;
		ctx.fillStyle = Colors.toStyleStr(color);

		// Check if label fits into box
		const maxLabelWidth: number =
			bounds.width - style.padding - selectArrowWidth;
		const measuredWidth: number = ctx.measureText(labelText).width;
		const overflow: boolean = measuredWidth > maxLabelWidth;
		if (overflow) {
			const clippingRegion = new Path2D();
			clippingRegion.rect(
				bounds.left,
				bounds.top,
				bounds.width - selectArrowWidth,
				bounds.height
			);

			ctx.save();
			ctx.clip(clippingRegion);
		}

		ctx.fillText(labelText, labelXOffset, labelYOffset);

		if (overflow) {
			ctx.restore();
		}

		return {
			width: style.padding + measuredWidth,
			height: fontSize,
		};
	}

	private static _makeSelectArrowPath(): ISelectArrowPath {
		const path: Path2D = new Path2D();

		path.moveTo(0.0, 0.0);
		path.lineTo(0.5, 0.45);
		path.lineTo(1.0, 0.0);

		return {
			path,
			width: 1.0,
			height: 0.4,
		};
	}

	private _onClick(event: ICellRendererMouseEvent): void {
		const value: IComboBoxCellRendererValue = ComboBoxCellRenderer._value(
			event.cell
		);

		let editable: boolean = this._options.editable;
		let onChanged: (cell: ICell) => void = this._options.onChanged;
		if (!!value.options) {
			if (
				value.options.editable !== undefined &&
				value.options.editable !== null
			) {
				editable = value.options.editable;
			}
			if (!!value.options.onChanged) {
				onChanged = value.options.onChanged;
			}
		}

		if (editable) {
			this._openDropdownOverlay(value, event.cell, onChanged);
		}
	}

	private _openDropdownOverlay(
		value: IComboBoxCellRendererValue,
		cell: ICell,
		onChanged: (cell: ICell) => void
	): void {
		const cellBounds: IRectangle = this._engine
			.getCellModel()
			.getBounds(cell.range);

		// Determine height available to the top and bottom of the given cell range
		const viewport = this._engine.getViewport();
		const fixedRowsHeight: number = this._engine.getFixedRowsHeight();
		const availableHeightToTheTop =
			cellBounds.top - (viewport.top + fixedRowsHeight);
		const availableHeightToTheBottom =
			viewport.top + viewport.height - cellBounds.height - cellBounds.top;

		const overlayElement: HTMLElement = document.createElement('div');
		overlayElement.className = this._options.dropdown.overlayClassName;
		overlayElement.tabIndex = -1; // Div element must be focusable to enable the blur event

		const listContainerElement: HTMLElement = document.createElement('div');
		listContainerElement.style.height = '100%';
		listContainerElement.style.overflow = 'auto';

		const list: HTMLElement = document.createElement('ul');

		for (const optionId in value.select_options) {
			const label = value.select_options[optionId].label;

			const listItem: HTMLElement = document.createElement('li');
			listItem.textContent = label;

			const mouseDownListener: (MouseEvent) => void = (
				event: MouseEvent
			) => {
				event.stopPropagation(); // Prevent table selection
			};
			const clickListener: (MouseEvent) => void = (event: MouseEvent) => {
				event.stopPropagation(); // Stop table selection
				value.selected_option_id = optionId;

				if (!!onChanged) {
					onChanged(cell);
				}

				blurListener();
			};
			listItem.addEventListener('mousedown', mouseDownListener);
			listItem.addEventListener('click', clickListener);

			list.appendChild(listItem);
		}

		listContainerElement.appendChild(list);
		overlayElement.appendChild(listContainerElement);

		// Create render container to render overlay to measure the needed height
		const renderContainer: HTMLElement = document.createElement('div');
		renderContainer.style.position = 'absolute';
		renderContainer.style.left = '-9999px';
		renderContainer.style.top = '-9999px';
		renderContainer.style.visibility = 'hidden';
		renderContainer.appendChild(overlayElement);
		document.body.appendChild(renderContainer);
		const neededOverlayHeight: number =
			renderContainer.getBoundingClientRect().height;
		document.body.removeChild(renderContainer);

		const maxDropdownHeight: number = this._options.dropdown.maxHeight;
		let dropdownHeight = maxDropdownHeight;
		if (neededOverlayHeight < maxDropdownHeight) {
			dropdownHeight = neededOverlayHeight;
		}

		// Check in which direction (top or bottom) to open the combobox dropdown
		let openToBottom: boolean = true;
		if (availableHeightToTheBottom < dropdownHeight) {
			if (availableHeightToTheTop < dropdownHeight) {
				openToBottom =
					availableHeightToTheBottom > availableHeightToTheTop;

				// Cut dropdown height by the available space
				if (openToBottom) {
					dropdownHeight = availableHeightToTheBottom;
				} else {
					dropdownHeight = availableHeightToTheTop;
				}
			} else {
				openToBottom = false;
			}
		}

		let dropdownBounds = {
			left: cellBounds.left,
			top: cellBounds.top + cellBounds.height,
			width: cellBounds.width,
			height: dropdownHeight,
		};
		if (!openToBottom) {
			dropdownBounds.top = cellBounds.top - dropdownHeight;
		}

		const overlay: IOverlay = {
			element: overlayElement,
			bounds: dropdownBounds,
		};
		this._engine.getOverlayManager().addOverlay(overlay);

		const scrollListener: (MouseEvent) => void = (event: MouseEvent) => {
			event.stopPropagation(); // Stop table scrolling
		};
		const blurListener: () => void = () => {
			// Remove all event listeners again
			overlayElement.removeEventListener('wheel', scrollListener);
			overlayElement.removeEventListener('blur', blurListener);

			this._engine.getOverlayManager().removeOverlay(overlay); // Remove overlay
			this._engine.requestFocus(); // Re-focus table
		};
		overlayElement.addEventListener('wheel', scrollListener);
		overlayElement.addEventListener('blur', blurListener);

		setTimeout(() => {
			overlayElement.focus();
		});
	}

	private _onMouseMove(event: ICellRendererMouseEvent): void {
		const cache: IViewportCache = ComboBoxCellRenderer._cache(event.cell);
		const value: IComboBoxCellRendererValue = ComboBoxCellRenderer._value(
			event.cell
		);

		let editable: boolean = this._options.editable;
		if (
			!!value.options &&
			value.options.editable !== undefined &&
			value.options.editable !== null
		) {
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

	estimatePreferredSize(cell: ICell): ISize | null {
		const cache: IViewportCache = ComboBoxCellRenderer._cache(cell);
		if (!!cache.preferredSize) {
			return cache.preferredSize;
		} else {
			return null;
		}
	}
}

interface ISelectArrowPath {
	path: Path2D;
	width: number;
	height: number;
}

interface IRenderingStyle {
	editable: boolean;
	hovered: boolean;
	padding: number;
	labelOptions: ILabelOptions;
	placeholderOptions: IPlaceholderOptions;
	selectArrowOptions: ISelectArrowOptions;
}

interface IViewportCache {
	hovered: boolean;
	preferredSize?: ISize;
}
