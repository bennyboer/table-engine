import { ICanvasCellRenderer } from '../canvas-cell-renderer';
import { IRenderContext } from '../../canvas-renderer';
import { ICell } from '../../../../cell';
import { ICellRendererEventListener } from '../../../cell';
import { TableEngine } from '../../../../table-engine';
import {
	fillOptions as fillCheckboxCellRendererOptions,
	ICheckboxCellRendererOptions,
} from './checkbox-cell-renderer-options';
import {
	AlignmentUtil,
	Colors,
	HorizontalAlignment,
	IColor,
	IPoint,
	IRectangle,
	ISize,
	VerticalAlignment,
} from '../../../../util';
import { ICheckboxCellRendererValue } from './checkbox-cell-renderer-value';
import { CanvasUtil } from '../../../util';

/**
 * Cell renderer rendering a checkbox.
 */
export class CheckboxCellRenderer implements ICanvasCellRenderer {
	/**
	 * Name of the renderer.
	 */
	public static readonly NAME: string = 'checkbox';

	/**
	 * Default checkbox cell renderer options.
	 */
	private readonly _defaultOptions: ICheckboxCellRendererOptions;

	/**
	 * Event listeners on cells rendered with this cell renderer.
	 */
	private readonly _eventListener: ICellRendererEventListener = {
		onMouseMove: (event) => {
			const cache: ICheckboxViewportCache = CheckboxCellRenderer._cache(
				event.cell
			);
			if (!!cache.checkboxBounds) {
				// Check if mouse is inside checkbox bounds
				const isHovered: boolean =
					event.offset.x >= cache.checkboxBounds.left &&
					event.offset.x <=
						cache.checkboxBounds.left +
							cache.checkboxBounds.width &&
					event.offset.y >= cache.checkboxBounds.top &&
					event.offset.y <=
						cache.checkboxBounds.top + cache.checkboxBounds.height;

				if (isHovered !== cache.isHovered) {
					cache.isHovered = isHovered;
					if (isHovered) {
						this._engine.setCursor('pointer');
					} else {
						this._engine.resetCursor();
					}
					this._engine.repaint();
				}
			}
		},
		onMouseOut: (event) => {
			const cache: ICheckboxViewportCache = CheckboxCellRenderer._cache(
				event.cell
			);
			if (cache.isHovered) {
				cache.isHovered = false;
				this._engine.resetCursor();
				this._engine.repaint();
			}
		},
		onMouseUp: (event) => {
			const value: ICheckboxCellRendererValue =
				CheckboxCellRenderer._value(event.cell);

			value.checked = !value.checked;

			if (!!value.options && !!value.options.onCheckedChanged) {
				value.options.onCheckedChanged(event.cell);
			} else if (!!this._defaultOptions.onCheckedChanged) {
				this._defaultOptions.onCheckedChanged(event.cell);
			}

			this._engine.repaint();
		},
	};

	/**
	 * Reference to the table engine.
	 */
	private _engine: TableEngine;

	constructor(defaultOptions?: ICheckboxCellRendererOptions) {
		this._defaultOptions = fillCheckboxCellRendererOptions(defaultOptions);
	}

	/**
	 * Get teh checkbox cell renderer value from the given cell.
	 * @param cell to get value from
	 */
	private static _value(cell: ICell): ICheckboxCellRendererValue {
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

	/**
	 * Get the viewport cache of the given cell.
	 * @param cell to get cache for
	 */
	private static _cache(cell: ICell): ICheckboxViewportCache {
		if (!!cell.viewportCache) {
			return cell.viewportCache as ICheckboxViewportCache;
		} else {
			const cache: ICheckboxViewportCache = {
				isHovered: false,
			};

			cell.viewportCache = cache;

			return cache;
		}
	}

	public after(ctx: CanvasRenderingContext2D): void {
		// Nothing to do after rendering all cells
	}

	public before(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext
	): void {
		ctx.textAlign = AlignmentUtil.horizontalAlignmentToStyleStr(
			HorizontalAlignment.LEFT
		) as CanvasTextAlign;
		ctx.textBaseline = AlignmentUtil.verticalAlignmentToStyleStr(
			VerticalAlignment.MIDDLE
		) as CanvasTextBaseline;
		ctx.font = `${this._defaultOptions.labelFontSize}px ${this._defaultOptions.labelFontFamily}`;
	}

	public cleanup(): void {
		// Nothing to cleanup
	}

	public getCopyValue(cell: ICell): string {
		const value: ICheckboxCellRendererValue =
			CheckboxCellRenderer._value(cell);

		return value.checked ? '1' : '0';
	}

	public getEventListener(): ICellRendererEventListener | null {
		return this._eventListener;
	}

	public getName(): string {
		return CheckboxCellRenderer.NAME;
	}

	public initialize(engine: TableEngine): void {
		this._engine = engine;
	}

	/**
	 * Called when the passed cell is disappearing from the visible area (viewport).
	 * @param cell that is disappearing
	 */
	public onDisappearing(cell: ICell): void {
		// Do nothing
	}

	public render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		let isContextSaved: boolean = false;

		const value: ICheckboxCellRendererValue =
			CheckboxCellRenderer._value(cell);
		const cache: ICheckboxViewportCache = CheckboxCellRenderer._cache(cell);

		// Derive options
		let size: number = this._defaultOptions.size;
		let labelCheckboxSpacing: number =
			this._defaultOptions.labelCheckboxSpacing;
		let cellSpacing: number = this._defaultOptions.cellSpacing;
		let labelColor: IColor = this._defaultOptions.labelTextColor;
		let fontSize: number = this._defaultOptions.labelFontSize;
		if (!!value.options) {
			if (
				value.options.size !== undefined &&
				value.options.size !== null
			) {
				size = value.options.size;
			}
			if (
				value.options.labelCheckboxSpacing !== undefined &&
				value.options.labelCheckboxSpacing !== null
			) {
				labelCheckboxSpacing = value.options.labelCheckboxSpacing;
			}
			if (
				value.options.cellSpacing !== undefined &&
				value.options.cellSpacing !== null
			) {
				cellSpacing = value.options.cellSpacing;
			}

			if (!!value.options.labelTextColor) {
				labelColor = value.options.labelTextColor;
			}

			if (
				(value.options.labelFontSize !== undefined &&
					value.options.labelFontSize !== null) ||
				!!value.options.labelFontFamily
			) {
				fontSize =
					value.options.labelFontSize !== undefined &&
					value.options.labelFontSize !== null
						? value.options.labelFontSize
						: this._defaultOptions.labelFontSize;
				const fontFamily: string = !!value.options.labelFontFamily
					? value.options.labelFontFamily
					: this._defaultOptions.labelFontFamily;

				if (!isContextSaved) {
					isContextSaved = true;
					ctx.save();
				}

				ctx.font = `${fontSize}px ${fontFamily}`;
			}
		}

		let preferredSize: ISize = {
			width: 0,
			height: 0,
		};
		if (!!value.label) {
			// Render label and checkbox
			const labelWidth: number = ctx.measureText(value.label).width;

			const totalWidth: number =
				cellSpacing + labelWidth + size + labelCheckboxSpacing;

			let checkboxOffset: number;
			if (totalWidth > bounds.width) {
				// Checkbox and label will not fit into cell -> only cut label
				checkboxOffset = Math.round(cellSpacing + size / 2);

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
					(bounds.width - totalWidth) / 2 + cellSpacing + size / 2
				);
			}

			const checkboxBounds = CheckboxCellRenderer._renderCheckbox(
				ctx,
				bounds,
				cell,
				checkboxOffset,
				size,
				value,
				this._defaultOptions
			);

			// Render label
			ctx.fillStyle = Colors.toStyleStr(labelColor);
			ctx.fillText(
				value.label,
				bounds.left +
					Math.round(
						checkboxOffset + size / 2 + labelCheckboxSpacing
					),
				bounds.top + Math.round(bounds.height / 2)
			);

			preferredSize.width = totalWidth;
			preferredSize.height = Math.max(checkboxBounds.height, fontSize);
		} else {
			// Only render checkbox
			const checkboxBounds = CheckboxCellRenderer._renderCheckbox(
				ctx,
				bounds,
				cell,
				Math.round(bounds.width / 2),
				size,
				value,
				this._defaultOptions
			);

			preferredSize.width = checkboxBounds.width;
			preferredSize.height = Math.max(checkboxBounds.height, fontSize);
		}

		// Save preferred size to viewport cache
		cache.preferredSize = preferredSize;

		if (isContextSaved) {
			ctx.restore();
		}
	}

	/**
	 * Render the checkbox.
	 * @param ctx to render checkbox with
	 * @param bounds of the cell
	 * @param cell to render checkbox for
	 * @param offset horizontal offset of the checkbox from left
	 * @param size of the checkbox
	 * @param value of the checkbox
	 * @param defaultOptions of the checkbox
	 */
	private static _renderCheckbox(
		ctx: CanvasRenderingContext2D,
		bounds: IRectangle,
		cell: ICell,
		offset: number,
		size: number,
		value: ICheckboxCellRendererValue,
		defaultOptions: ICheckboxCellRendererOptions
	): IRectangle {
		const center: IPoint = {
			x: bounds.left + offset,
			y: bounds.top + Math.round(bounds.height / 2),
		};
		const halfSize: number = size / 2;
		const rect: IRectangle = {
			left: center.x - halfSize + 0.5,
			top: center.y - halfSize + 0.5,
			width: size,
			height: size,
		};

		// Derive options
		let borderRadius: number = defaultOptions.borderRadius;
		let borderSize: number = defaultOptions.borderSize;
		let uncheckedBackgroundColor: IColor =
			defaultOptions.uncheckedBackgroundColor;
		let checkedBackgroundColor: IColor =
			defaultOptions.checkedBackgroundColor;
		let checkedHoverBackgroundColor: IColor =
			defaultOptions.checkedHoverBackgroundColor;
		let borderColor: IColor = defaultOptions.borderColor;
		let hoverBorderColor: IColor = defaultOptions.hoverBorderColor;
		let tickColor: IColor = defaultOptions.tickColor;
		let tickThickness: number = defaultOptions.tickThickness;
		if (!!value.options) {
			if (
				value.options.borderRadius !== undefined &&
				value.options.borderRadius !== null
			) {
				borderRadius = value.options.borderRadius;
			}
			if (
				value.options.borderSize !== undefined &&
				value.options.borderSize !== null
			) {
				borderSize = value.options.borderSize;
			}
			if (!!value.options.uncheckedBackgroundColor) {
				uncheckedBackgroundColor =
					value.options.uncheckedBackgroundColor;
			}
			if (!!value.options.checkedBackgroundColor) {
				checkedBackgroundColor = value.options.checkedBackgroundColor;
			}
			if (!!value.options.checkedHoverBackgroundColor) {
				checkedHoverBackgroundColor =
					value.options.checkedHoverBackgroundColor;
			}
			if (!!value.options.borderColor) {
				borderColor = value.options.borderColor;
			}
			if (!!value.options.hoverBorderColor) {
				hoverBorderColor = value.options.hoverBorderColor;
			}
			if (!!value.options.tickColor) {
				tickColor = value.options.tickColor;
			}
			if (
				value.options.tickThickness !== undefined &&
				value.options.tickThickness !== null
			) {
				tickThickness = value.options.tickThickness;
			}
		}

		const cache = CheckboxCellRenderer._cache(cell);
		const isHovered: boolean = cache.isHovered;

		// Render background
		ctx.fillStyle = Colors.toStyleStr(
			value.checked
				? isHovered
					? checkedHoverBackgroundColor
					: checkedBackgroundColor
				: uncheckedBackgroundColor
		);
		if (borderRadius > 0) {
			CanvasUtil.makeRoundRectPath(ctx, rect, borderRadius);
			ctx.fill();
		} else {
			ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
		}

		// Render border (if unchecked)
		if (!value.checked) {
			ctx.strokeStyle = Colors.toStyleStr(
				isHovered ? hoverBorderColor : borderColor
			);
			ctx.lineWidth = borderSize;

			if (borderRadius > 0) {
				CanvasUtil.makeRoundRectPath(ctx, rect, borderRadius);
				ctx.stroke();
			} else {
				ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
			}
		}

		// Render tick (if checked)
		if (value.checked) {
			ctx.strokeStyle = Colors.toStyleStr(tickColor);
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.lineWidth = tickThickness;

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

	estimatePreferredSize(cell: ICell): ISize | null {
		const cache: ICheckboxViewportCache = CheckboxCellRenderer._cache(cell);
		if (!!cache.preferredSize) {
			return cache.preferredSize;
		} else {
			return null;
		}
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
