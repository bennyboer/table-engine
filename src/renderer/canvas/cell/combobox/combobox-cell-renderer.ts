import {
	fillOptions,
	IComboBoxCellRendererOptions,
} from './combobox-cell-renderer-options';
import { IRenderContext } from '../../canvas-renderer';
import { ICell } from '../../../../cell';
import {
	CellRendererEventListenerType,
	ICellRendererMouseEvent,
} from '../../../cell';
import { Colors, IRectangle, ISize } from '../../../../util';
import {
	IComboBoxCellRendererValue,
	IComboBoxOption,
} from './combobox-cell-renderer-value';
import { IOverlay } from '../../../../overlay';
import { AbstractCanvasCellRenderer } from '../abstract-canvas-cell-renderer';

export class ComboBoxCellRenderer extends AbstractCanvasCellRenderer<
	IComboBoxCellRendererValue,
	IComboBoxCellRendererOptions,
	IViewportCache
> {
	static readonly NAME: string = 'combobox';

	constructor(options?: IComboBoxCellRendererOptions) {
		super(ComboBoxCellRenderer.NAME, fillOptions(options));

		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_UP,
			(event) => this._onClick(event as ICellRendererMouseEvent)
		);
		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_MOVE,
			(event) => this._onMouseMove(event as ICellRendererMouseEvent)
		);
		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_OUT,
			(event) => this._onMouseOut(event as ICellRendererMouseEvent)
		);
	}

	protected value(cell: ICell): IComboBoxCellRendererValue {
		if (cell.value === undefined || cell.value === null) {
			return {
				select_options: {},
			} as IComboBoxCellRendererValue;
		}

		return cell.value as IComboBoxCellRendererValue;
	}

	getDefaultViewportCache(): IViewportCache {
		return {
			hovered: false,
		};
	}

	getOptionsFromCell(cell: ICell): IComboBoxCellRendererOptions | null {
		return this.value(cell).options;
	}

	mergeOptions(
		defaultOptions: IComboBoxCellRendererOptions,
		cellOptions: IComboBoxCellRendererOptions
	): IComboBoxCellRendererOptions {
		return {
			editable: cellOptions?.editable ?? defaultOptions.editable,
			label: cellOptions?.label ?? defaultOptions.label,
			onChanged: cellOptions?.onChanged ?? defaultOptions.onChanged,
			padding: cellOptions?.padding ?? defaultOptions.padding,
			dropdown: cellOptions?.dropdown ?? defaultOptions.dropdown,
			placeholder: cellOptions?.placeholder ?? defaultOptions.placeholder,
			selectArrow: cellOptions?.selectArrow ?? defaultOptions.selectArrow,
		};
	}

	before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		ctx.textAlign = 'left';
	}

	getCopyValue(cell: ICell): string {
		const value = this.value(cell);
		if (!!value.selected_option_id) {
			return value.select_options[value.selected_option_id].label;
		}

		return '';
	}

	estimatePreferredSize(cell: ICell): ISize | null {
		return this.cache(cell).preferredSize;
	}

	render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		const value: IComboBoxCellRendererValue = this.value(cell);
		const options: IComboBoxCellRendererOptions = this.options(cell);
		const cache: IViewportCache = this.cache(cell);

		const selectArrowSize: ISize = ComboBoxCellRenderer._renderSelectArrow(
			ctx,
			bounds,
			options,
			cache
		);
		const labelSize: ISize = ComboBoxCellRenderer._renderLabel(
			ctx,
			bounds,
			value,
			options,
			cache,
			selectArrowSize.width
		);

		cache.preferredSize = {
			width: selectArrowSize.width + labelSize.width,
			height: selectArrowSize.height + labelSize.height,
		};
	}

	private static _renderSelectArrow(
		ctx: CanvasRenderingContext2D,
		bounds: IRectangle,
		options: IComboBoxCellRendererOptions,
		cache: IViewportCache
	): ISize {
		const selectArrowPath: ISelectArrowPath =
			ComboBoxCellRenderer._makeSelectArrowPath();

		const selectArrowWidth: number =
			selectArrowPath.width * options.selectArrow.size;
		const selectArrowHeight: number =
			selectArrowPath.height * options.selectArrow.size;

		const transformedSelectArrowPath: Path2D = new Path2D();
		transformedSelectArrowPath.addPath(
			selectArrowPath.path,
			new DOMMatrix()
				.translateSelf(
					bounds.left +
						bounds.width -
						selectArrowWidth -
						options.padding,
					bounds.top +
						Math.round((bounds.height - selectArrowHeight) / 2)
				)
				.scaleSelf(options.selectArrow.size, options.selectArrow.size)
		);

		ctx.strokeStyle = Colors.toStyleStr(
			cache.hovered
				? options.selectArrow.hoverColor
				: options.selectArrow.color
		);
		ctx.lineWidth = options.selectArrow.thickness;
		ctx.lineCap = options.selectArrow.lineCap;
		ctx.lineJoin = options.selectArrow.lineJoin;

		ctx.stroke(transformedSelectArrowPath);

		return {
			width: selectArrowWidth + 2 * options.padding,
			height: selectArrowHeight,
		};
	}

	private static _renderLabel(
		ctx: CanvasRenderingContext2D,
		bounds: IRectangle,
		value: IComboBoxCellRendererValue,
		options: IComboBoxCellRendererOptions,
		cache: IViewportCache,
		selectArrowWidth: number
	): ISize {
		const labelXOffset = bounds.left + options.padding;
		const labelYOffset = bounds.top + Math.round(bounds.height / 2);

		let labelText = options.placeholder.text;
		let color = options.placeholder.color;

		const hasLabelSelected = !!value.selected_option_id;
		if (hasLabelSelected) {
			const selectedOption: IComboBoxOption =
				value.select_options[value.selected_option_id];

			labelText = selectedOption.label;
			color = options.label.color;
		}

		if (cache.hovered) {
			color = options.label.hoveredColor;
		}

		const fontSize = options.label.fontSize;
		const fontFamily = options.label.fontFamily;
		ctx.font = `${fontSize}px ${fontFamily}`;
		ctx.fillStyle = Colors.toStyleStr(color);

		// Check if label fits into box
		const maxLabelWidth: number =
			bounds.width - options.padding - selectArrowWidth;
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
			width: options.padding + measuredWidth,
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
		const value: IComboBoxCellRendererValue = this.value(event.cell);
		const options: IComboBoxCellRendererOptions = this.options(event.cell);

		if (options.editable) {
			this._openDropdownOverlay(value, event.cell, options);
		}
	}

	private _openDropdownOverlay(
		value: IComboBoxCellRendererValue,
		cell: ICell,
		options: IComboBoxCellRendererOptions
	): void {
		const cellBounds: IRectangle = this.engine
			.getCellModel()
			.getBounds(cell.range);

		// Determine height available to the top and bottom of the given cell range
		const viewport = this.engine.getViewport();
		const fixedAreaInfos = this.engine.getFixedAreaInfos();
		const availableHeightToTheTop =
			cellBounds.top - (viewport.top + fixedAreaInfos.top.size);
		const availableHeightToTheBottom =
			viewport.top +
			viewport.height -
			fixedAreaInfos.bottom.size -
			cellBounds.height -
			cellBounds.top;

		const overlayElement: HTMLElement = document.createElement('div');
		overlayElement.className = options.dropdown.overlayClassName;
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

				if (!!options.onChanged) {
					options.onChanged(cell);
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

		const maxDropdownHeight: number = options.dropdown.maxHeight;
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
		this.engine.getOverlayManager().addOverlay(overlay);

		const scrollListener: (MouseEvent) => void = (event: MouseEvent) => {
			event.stopPropagation(); // Stop table scrolling
		};
		const blurListener: () => void = () => {
			// Remove all event listeners again
			overlayElement.removeEventListener('wheel', scrollListener);
			overlayElement.removeEventListener('blur', blurListener);

			this.engine.getOverlayManager().removeOverlay(overlay); // Remove overlay
			this.engine.requestFocus(); // Re-focus table
		};
		overlayElement.addEventListener('wheel', scrollListener);
		overlayElement.addEventListener('blur', blurListener);

		setTimeout(() => {
			overlayElement.focus();
		});
	}

	private _onMouseMove(event: ICellRendererMouseEvent): void {
		const options: IComboBoxCellRendererOptions = this.options(event.cell);
		const cache: IViewportCache = this.cache(event.cell);

		if (options.editable && !cache.hovered) {
			cache.hovered = true;
			this.setCursor('pointer');
			this.repaint();
		}
	}

	private _onMouseOut(event: ICellRendererMouseEvent): void {
		const cache: IViewportCache = this.cache(event.cell);
		if (cache.hovered) {
			cache.hovered = false;
			this.resetCursor();
			this.repaint();
		}
	}
}

interface ISelectArrowPath {
	path: Path2D;
	width: number;
	height: number;
}

interface IViewportCache {
	hovered: boolean;
	preferredSize?: ISize;
}
