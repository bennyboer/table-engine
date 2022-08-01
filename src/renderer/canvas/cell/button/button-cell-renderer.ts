import { AbstractCanvasCellRenderer } from '../abstract-canvas-cell-renderer';
import { ICell } from '../../../../cell';
import { Colors, IRectangle, ISize } from '../../../../util';
import {
	fillOptions,
	IButtonCellRendererOptions,
} from './button-cell-renderer-options';
import { IButtonCellRendererValue } from './button-cell-renderer-value';
import { CanvasUtil } from '../../../util';
import {
	CellRendererEventListenerType,
	ICellRendererMouseEvent,
} from '../../../cell';

export class ButtonCellRenderer extends AbstractCanvasCellRenderer<
	IButtonCellRendererValue,
	IButtonCellRendererOptions,
	IViewportCache
> {
	static readonly NAME: string = 'button';

	constructor(options?: IButtonCellRendererOptions) {
		super(ButtonCellRenderer.NAME, fillOptions(options));

		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_MOVE,
			(event) => this._onMouseMove(event as ICellRendererMouseEvent)
		);
		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_OUT,
			(event) => this._onMouseOut(event as ICellRendererMouseEvent)
		);
		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_DOWN,
			(event) => this._onMouseDown(event as ICellRendererMouseEvent)
		);
		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_UP,
			(event) => this._onMouseUp(event as ICellRendererMouseEvent)
		);
	}

	render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		const value = this.value(cell);
		const options = this.options(cell);
		const cache = this.cache(cell);

		const marginAppliedRect: IRectangle = {
			top: bounds.top + options.margin,
			left: bounds.left + options.margin,
			width: bounds.width - options.margin * 2,
			height: bounds.height - options.margin * 2,
		};

		CanvasUtil.makeRoundRectPath(
			ctx,
			marginAppliedRect,
			options.border.radius
		);

		// Background
		ctx.fillStyle = Colors.toStyleStr(
			cache.hovered
				? options.background.hovered
				: options.background.color
		);
		ctx.fill();

		// Border
		ctx.strokeStyle = Colors.toStyleStr(options.border.color);
		ctx.lineWidth = options.border.size;
		ctx.stroke();

		// Label
		ctx.fillStyle = Colors.toStyleStr(options.label.color);
		ctx.font = `${options.label.fontSize}px ${options.label.fontFamily}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		const additionalSizePerSide: number =
			options.padding + options.margin + options.border.size;
		const additionalSizePerAxis: number = 2 * additionalSizePerSide;

		const labelSize: ISize = {
			width: ctx.measureText(value.label).width,
			height: options.label.fontSize,
		};
		const maxLabelSize: ISize = {
			width: marginAppliedRect.width - additionalSizePerAxis,
			height: marginAppliedRect.height - additionalSizePerAxis,
		};

		cache.preferredSize = {
			width: labelSize.width + additionalSizePerAxis,
			height: labelSize.height + additionalSizePerAxis,
		};

		const isOverflow: boolean =
			labelSize.width > maxLabelSize.width ||
			labelSize.height > maxLabelSize.height;
		if (isOverflow) {
			const additionalSizePerSideWithoutPadding =
				additionalSizePerSide - options.padding;
			const additionalSizePerAxisWithoutPadding =
				additionalSizePerAxis - options.padding * 2;

			const clippingRegion = new Path2D();
			clippingRegion.rect(
				bounds.left + additionalSizePerSideWithoutPadding,
				bounds.top + additionalSizePerSideWithoutPadding,
				bounds.width - additionalSizePerAxisWithoutPadding,
				bounds.height - additionalSizePerAxisWithoutPadding
			);

			ctx.save();
			ctx.clip(clippingRegion);
		}

		ctx.fillText(
			value.label,
			marginAppliedRect.left + marginAppliedRect.width / 2,
			marginAppliedRect.top + marginAppliedRect.height / 2
		);

		if (isOverflow) {
			ctx.restore();
		}
	}

	estimatePreferredSize(cell: ICell): ISize | null {
		return this.cache(cell).preferredSize;
	}

	getDefaultViewportCache(): IViewportCache {
		return {};
	}

	getOptionsFromCell(cell: ICell): IButtonCellRendererOptions | null {
		return this.value(cell).options;
	}

	mergeOptions(
		defaultOptions: IButtonCellRendererOptions,
		cellOptions: IButtonCellRendererOptions
	): IButtonCellRendererOptions {
		return {
			onClick: cellOptions?.onClick ?? defaultOptions.onClick,
			margin: cellOptions?.margin ?? defaultOptions.margin,
			padding: cellOptions?.padding ?? defaultOptions.padding,
			hoverCursor: cellOptions?.hoverCursor ?? defaultOptions.hoverCursor,
			background: {
				color:
					cellOptions.background?.color ??
					defaultOptions.background.color,
				hovered:
					cellOptions.background?.hovered ??
					defaultOptions.background.hovered,
			},
			border: {
				color: cellOptions.border?.color ?? defaultOptions.border.color,
				size: cellOptions.border?.size ?? defaultOptions.border.size,
				radius:
					cellOptions.border?.radius ?? defaultOptions.border.radius,
			},
			label: {
				color: cellOptions.label?.color ?? defaultOptions.label.color,
				fontSize:
					cellOptions.label?.fontSize ??
					defaultOptions.label.fontSize,
				fontFamily:
					cellOptions.label?.fontFamily ??
					defaultOptions.label.fontFamily,
			},
		};
	}

	private _onMouseMove(event: ICellRendererMouseEvent): void {
		const cache = this.cache(event.cell);
		const options = this.options(event.cell);

		if (!cache.hovered) {
			cache.hovered = true;
			this.setCursor(options.hoverCursor);

			this.repaint();
		}
	}

	private _onMouseOut(event: ICellRendererMouseEvent): void {
		const cache = this.cache(event.cell);

		if (cache.hovered) {
			cache.hovered = false;
			this.resetCursor();

			this.repaint();
		}
	}

	private _onMouseDown(event: ICellRendererMouseEvent): void {
		const cache = this.cache(event.cell);
		cache.mousePressedOnButton = true;
	}

	private _onMouseUp(event: ICellRendererMouseEvent): void {
		const cache = this.cache(event.cell);
		const isClick = cache.mousePressedOnButton;
		if (isClick) {
			this._onClick(event);
		}

		cache.mousePressedOnButton = false;
	}

	private _onClick(event: ICellRendererMouseEvent): void {
		const options = this.options(event.cell);
		if (!!options.onClick) {
			options.onClick(event.cell);
		}
	}
}

interface IViewportCache {
	preferredSize?: ISize;
	hovered?: boolean;
	mousePressedOnButton?: boolean;
}
