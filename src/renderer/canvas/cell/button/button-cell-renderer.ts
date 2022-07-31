import { AbstractCanvasCellRenderer } from '../abstract-canvas-cell-renderer';
import { ICell } from '../../../../cell';
import { Colors, IRectangle, ISize } from '../../../../util';
import {
	fillOptions,
	IButtonCellRendererOptions,
} from './button-cell-renderer-options';
import { IButtonCellRendererValue } from './button-cell-renderer-value';
import { CanvasUtil } from '../../../util';

export class ButtonCellRenderer extends AbstractCanvasCellRenderer<
	IButtonCellRendererValue,
	IButtonCellRendererOptions,
	IViewportCache
> {
	static readonly NAME: string = 'button';

	constructor(options?: IButtonCellRendererOptions) {
		super(ButtonCellRenderer.NAME, fillOptions(options));
	}

	render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		const value = this.value(cell);
		const options = this.options(cell);
		const cache = this.cache(cell);

		const paddingAppliedRect: IRectangle = {
			top: bounds.top + options.margin,
			left: bounds.left + options.margin,
			width: bounds.width - options.margin * 2,
			height: bounds.height - options.margin * 2,
		};

		CanvasUtil.makeRoundRectPath(
			ctx,
			paddingAppliedRect,
			options.border.radius
		);

		// Background
		ctx.fillStyle = Colors.toStyleStr(options.background.color);
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
		const labelWidth: number = ctx.measureText(value.label).width;
		ctx.fillText(
			value.label,
			paddingAppliedRect.left + paddingAppliedRect.width / 2,
			paddingAppliedRect.top + paddingAppliedRect.height / 2
		);

		const additionalSizePerAxis: number =
			options.padding * 2 + options.margin * 2 + options.border.size * 2;
		this.cache(cell).preferredSize = {
			width: labelWidth + additionalSizePerAxis,
			height: options.label.fontSize + additionalSizePerAxis,
		};
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
			margin: cellOptions?.margin ?? defaultOptions.margin,
			padding: cellOptions?.padding ?? defaultOptions.padding,
			background: {
				color:
					cellOptions.background?.color ??
					defaultOptions.background.color,
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
}

interface IViewportCache {
	preferredSize?: ISize;
}
