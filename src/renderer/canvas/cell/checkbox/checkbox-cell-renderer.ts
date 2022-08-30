import { IRenderContext } from '../../canvas-renderer';
import { ICell } from '../../../../cell';
import {
	CellRendererEventListenerType,
	ICellRendererMouseEvent,
} from '../../../cell';
import {
	fillOptions as fillCheckboxCellRendererOptions,
	ICheckboxCellRendererOptions,
} from './checkbox-cell-renderer-options';
import {
	AlignmentUtil,
	Colors,
	HorizontalAlignment,
	IPoint,
	IRectangle,
	ISize,
	VerticalAlignment,
} from '../../../../util';
import { ICheckboxCellRendererValue } from './checkbox-cell-renderer-value';
import { CanvasUtil } from '../../../util';
import { AbstractCanvasCellRenderer } from '../abstract-canvas-cell-renderer';

/**
 * Cell renderer rendering a checkbox.
 */
export class CheckboxCellRenderer extends AbstractCanvasCellRenderer<
	ICheckboxCellRendererValue,
	ICheckboxCellRendererOptions,
	ICheckboxViewportCache
> {
	public static readonly NAME: string = 'checkbox';

	constructor(defaultOptions?: ICheckboxCellRendererOptions) {
		super(
			CheckboxCellRenderer.NAME,
			fillCheckboxCellRendererOptions(defaultOptions)
		);

		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_MOVE,
			(event) => this._onMouseMove(event as ICellRendererMouseEvent)
		);
		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_OUT,
			(event) => this._onMouseOut(event as ICellRendererMouseEvent)
		);
		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_UP,
			(event) => this._onMouseUp(event as ICellRendererMouseEvent)
		);
	}

	private _onMouseMove(event: ICellRendererMouseEvent): void {
		const cache: ICheckboxViewportCache = this.cache(event.cell);
		const isCheckboxHovered = this.isInCheckboxBounds(event.offset, cache);

		if (isCheckboxHovered !== cache.isHovered) {
			cache.isHovered = isCheckboxHovered;
			if (isCheckboxHovered) {
				this.setCursor('pointer');
			} else {
				this.resetCursor();
			}
			this.repaint();
		}
	}

	private _onMouseOut(event: ICellRendererMouseEvent): void {
		const cache: ICheckboxViewportCache = this.cache(event.cell);
		if (cache.isHovered) {
			cache.isHovered = false;
			this.resetCursor();
			this.repaint();
		}
	}

	private _onMouseUp(event: ICellRendererMouseEvent): void {
		const value: ICheckboxCellRendererValue = this.value(event.cell);
		const options: ICheckboxCellRendererOptions = this.options(event.cell);

		value.checked = !value.checked;

		if (!!options.onCheckedChanged) {
			options.onCheckedChanged(event.cell);
		}

		this.repaint();
	}

	private isInCheckboxBounds(
		offset: IPoint,
		cache: ICheckboxViewportCache
	): boolean {
		if (!cache.checkboxBounds) {
			return false;
		}

		return (
			offset.x >= cache.checkboxBounds.left &&
			offset.x <=
				cache.checkboxBounds.left + cache.checkboxBounds.width &&
			offset.y >= cache.checkboxBounds.top &&
			offset.y <= cache.checkboxBounds.top + cache.checkboxBounds.height
		);
	}

	getDefaultViewportCache(): ICheckboxViewportCache {
		return {
			isHovered: false,
		};
	}

	getOptionsFromCell(cell: ICell): ICheckboxCellRendererOptions | null {
		return this.value(cell).options;
	}

	mergeOptions(
		defaultOptions: ICheckboxCellRendererOptions,
		cellOptions: ICheckboxCellRendererOptions
	): ICheckboxCellRendererOptions {
		return {
			onCheckedChanged:
				cellOptions?.onCheckedChanged ??
				defaultOptions.onCheckedChanged,
			size: cellOptions?.size ?? defaultOptions.size,
			borderColor: cellOptions?.borderColor ?? defaultOptions.borderColor,
			borderRadius:
				cellOptions?.borderRadius ?? defaultOptions.borderRadius,
			borderSize: cellOptions?.borderSize ?? defaultOptions.borderSize,
			cellSpacing: cellOptions?.cellSpacing ?? defaultOptions.cellSpacing,
			checkedBackgroundColor:
				cellOptions?.checkedBackgroundColor ??
				defaultOptions.checkedBackgroundColor,
			checkedHoverBackgroundColor:
				cellOptions?.checkedHoverBackgroundColor ??
				defaultOptions.checkedHoverBackgroundColor,
			disabled: cellOptions?.disabled ?? defaultOptions.disabled,
			disabledOpacity:
				cellOptions?.disabledOpacity ?? defaultOptions.disabledOpacity,
			hoverBorderColor:
				cellOptions?.hoverBorderColor ??
				defaultOptions.hoverBorderColor,
			labelCheckboxSpacing:
				cellOptions?.labelCheckboxSpacing ??
				defaultOptions.labelCheckboxSpacing,
			labelFontFamily:
				cellOptions?.labelFontFamily ?? defaultOptions.labelFontFamily,
			labelFontSize:
				cellOptions?.labelFontSize ?? defaultOptions.labelFontSize,
			tickColor: cellOptions?.tickColor ?? defaultOptions.tickColor,
			labelTextColor:
				cellOptions?.labelTextColor ?? defaultOptions.labelTextColor,
			tickThickness:
				cellOptions?.tickThickness ?? defaultOptions.tickThickness,
			uncheckedBackgroundColor:
				cellOptions?.uncheckedBackgroundColor ??
				defaultOptions.uncheckedBackgroundColor,
		};
	}

	protected value(cell: ICell): ICheckboxCellRendererValue {
		const isSpecialValue: boolean =
			!!cell.value &&
			typeof cell.value === 'object' &&
			'checked' in cell.value;

		if (isSpecialValue) {
			return cell.value as ICheckboxCellRendererValue;
		} else {
			return {
				checked: !!cell.value,
			};
		}
	}

	before(ctx: CanvasRenderingContext2D, context: IRenderContext) {
		ctx.textAlign = AlignmentUtil.horizontalAlignmentToStyleStr(
			HorizontalAlignment.LEFT
		) as CanvasTextAlign;
		ctx.textBaseline = AlignmentUtil.verticalAlignmentToStyleStr(
			VerticalAlignment.MIDDLE
		) as CanvasTextBaseline;
		ctx.font = `${this.defaultOptions.labelFontSize}px ${this.defaultOptions.labelFontFamily}`;
	}

	getCopyValue(cell: ICell): string {
		return this.value(cell).checked ? '1' : '0';
	}

	estimatePreferredSize(cell: ICell): ISize | null {
		return this.cache(cell).preferredSize;
	}

	render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		let isContextSaved: boolean = false;

		const value: ICheckboxCellRendererValue = this.value(cell);
		const options: ICheckboxCellRendererOptions = this.options(cell);
		const cache: ICheckboxViewportCache = this.cache(cell);

		if (!!value.options) {
			if (
				(value.options.labelFontSize !== undefined &&
					value.options.labelFontSize !== null) ||
				!!value.options.labelFontFamily
			) {
				isContextSaved = true;
				ctx.save();

				ctx.font = `${options.labelFontSize}px ${options.labelFontFamily}`;
			}
		}

		const preferredSize: ISize = {
			width: 0,
			height: 0,
		};
		if (!!value.label) {
			// Render label and checkbox
			const labelWidth: number = ctx.measureText(value.label).width;

			const totalWidth: number =
				options.cellSpacing +
				labelWidth +
				options.size +
				options.labelCheckboxSpacing;

			let checkboxOffset: number;
			if (totalWidth > bounds.width) {
				// Checkbox and label will not fit into cell -> only cut label
				checkboxOffset = Math.round(
					options.cellSpacing + options.size / 2
				);

				const clippingRegion = new Path2D();
				clippingRegion.rect(
					bounds.left,
					bounds.top,
					bounds.width,
					bounds.height
				);

				ctx.save();
				isContextSaved = true;

				ctx.clip(clippingRegion);
			} else {
				checkboxOffset = Math.round(
					(bounds.width - totalWidth) / 2 +
						options.cellSpacing +
						options.size / 2
				);
			}

			const checkboxBounds = CheckboxCellRenderer._renderCheckbox(
				ctx,
				bounds,
				checkboxOffset,
				value,
				options,
				cache
			);

			// Render label
			ctx.fillStyle = Colors.toStyleStr(options.labelTextColor);
			ctx.fillText(
				value.label,
				bounds.left +
					Math.round(
						checkboxOffset +
							options.size / 2 +
							options.labelCheckboxSpacing
					),
				bounds.top + Math.round(bounds.height / 2)
			);

			preferredSize.width = totalWidth;
			preferredSize.height = Math.max(
				checkboxBounds.height,
				options.labelFontSize
			);
		} else {
			// Only render checkbox
			const checkboxBounds = CheckboxCellRenderer._renderCheckbox(
				ctx,
				bounds,
				Math.round(bounds.width / 2),
				value,
				options,
				cache
			);

			preferredSize.width = checkboxBounds.width;
			preferredSize.height = Math.max(
				checkboxBounds.height,
				options.labelFontSize
			);
		}

		// Save preferred size to viewport cache
		cache.preferredSize = preferredSize;

		if (isContextSaved) {
			ctx.restore();
		}
	}

	private static _renderCheckbox(
		ctx: CanvasRenderingContext2D,
		bounds: IRectangle,
		offset: number,
		value: ICheckboxCellRendererValue,
		options: ICheckboxCellRendererOptions,
		cache: ICheckboxViewportCache
	): IRectangle {
		const center: IPoint = {
			x: bounds.left + offset,
			y: bounds.top + Math.round(bounds.height / 2),
		};
		const halfSize: number = options.size / 2;
		const rect: IRectangle = {
			left: center.x - halfSize + 0.5,
			top: center.y - halfSize + 0.5,
			width: options.size,
			height: options.size,
		};

		const isHovered: boolean = cache.isHovered;

		// Render background
		ctx.fillStyle = Colors.toStyleStr(
			value.checked
				? isHovered
					? options.checkedHoverBackgroundColor
					: options.checkedBackgroundColor
				: options.uncheckedBackgroundColor
		);
		if (options.borderRadius > 0) {
			CanvasUtil.makeRoundRectPath(ctx, rect, options.borderRadius);
			ctx.fill();
		} else {
			ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
		}

		// Render border (if unchecked)
		if (!value.checked) {
			ctx.strokeStyle = Colors.toStyleStr(
				isHovered ? options.hoverBorderColor : options.borderColor
			);
			ctx.lineWidth = options.borderSize;

			if (options.borderRadius > 0) {
				CanvasUtil.makeRoundRectPath(ctx, rect, options.borderRadius);
				ctx.stroke();
			} else {
				ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
			}
		}

		// Render tick (if checked)
		if (value.checked) {
			ctx.strokeStyle = Colors.toStyleStr(options.tickColor);
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.lineWidth = options.tickThickness;

			ctx.beginPath();

			ctx.moveTo(
				rect.left + rect.width * 0.2,
				rect.top + rect.height * 0.6
			);
			ctx.lineTo(
				rect.left + rect.width * 0.4,
				rect.top + rect.height * 0.8
			);
			ctx.lineTo(
				rect.left + rect.width * 0.8,
				rect.top + rect.height * 0.2
			);

			ctx.stroke();
		}

		cache.checkboxBounds = rect;

		return rect;
	}
}

interface ICheckboxViewportCache {
	/**
	 * Whether the checkbox is currently hovered.
	 */
	isHovered?: boolean;

	/**
	 * Bounds of the checkbox.
	 */
	checkboxBounds?: IRectangle;

	/**
	 * Preferred size of the checkbox.
	 */
	preferredSize?: ISize;
}
