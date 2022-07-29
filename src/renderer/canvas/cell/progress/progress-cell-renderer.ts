import {
	fillOptions,
	ILinearProgressStyle,
	IProgressCellRendererOptions,
	IRadialProgressStyle,
} from './progress-cell-renderer-options';
import { ICanvasCellRenderer } from '../canvas-cell-renderer';
import { TableEngine } from '../../../../table-engine';
import {
	ICellRendererEventListener,
	ICellRendererMouseEvent,
} from '../../../cell';
import { ICell } from '../../../../cell';
import { Colors, IColor, IPoint, IRectangle, ISize } from '../../../../util';
import { ProgressCellRendererStyle } from './progress-cell-renderer-style';
import { IProgressCellRendererValue } from './progress-cell-renderer-value';
import { IRenderContext } from '../../canvas-renderer';

export class ProgressCellRenderer implements ICanvasCellRenderer {
	static readonly NAME: string = 'progress';

	private readonly _options: IProgressCellRendererOptions;

	private _engine: TableEngine;

	private _eventListener: ICellRendererEventListener = {
		onDoubleClick: (event) => this._onDoubleClick(event),
	};

	constructor(options?: IProgressCellRendererOptions) {
		this._options = fillOptions(options);
	}

	private static _value(cell: ICell): IProgressCellRendererValue {
		const isSpecialValue: boolean =
			!!cell.value &&
			typeof cell.value === 'object' &&
			'progress' in cell.value;

		if (isSpecialValue) {
			const value: IProgressCellRendererValue = cell.value;

			if (value.progress > 1.0) {
				value.progress = 1.0;
			} else if (value.progress < 0.0) {
				value.progress = 0.0;
			}

			return value;
		} else {
			const progress: number =
				cell.value !== undefined && cell.value !== null
					? Math.max(Math.min(cell.value, 1.0), 0.0)
					: 0.0;

			const value: IProgressCellRendererValue = {
				progress,
			};
			cell.value = value;
			return value;
		}
	}

	after(ctx: CanvasRenderingContext2D): void {
		// Nothing to do after rendering all cells with this renderer
	}

	before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		ctx.lineJoin = 'round';
		ctx.lineCap = 'butt';
	}

	cleanup(): void {
		// Nothing to cleanup
	}

	getCopyValue(cell: ICell): string {
		const value = ProgressCellRenderer._value(cell);
		return `${value.progress}`;
	}

	getEventListener(): ICellRendererEventListener | null {
		return this._eventListener;
	}

	getName(): string {
		return ProgressCellRenderer.NAME;
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
		const value: IProgressCellRendererValue =
			ProgressCellRenderer._value(cell);
		const options: IProgressCellRendererOptions =
			this._deriveOptions(value);

		if (options.style === ProgressCellRendererStyle.RADIAL) {
			ProgressCellRenderer._renderRadial(
				ctx,
				bounds,
				value,
				options,
				options.radial
			);
		} else if (options.style === ProgressCellRendererStyle.LINEAR) {
			ProgressCellRenderer._renderLinear(
				ctx,
				bounds,
				value,
				options,
				options.linear
			);
		} else {
			throw new Error('Unsupported progress cell renderer style');
		}
	}

	private _deriveOptions(
		value: IProgressCellRendererValue
	): IProgressCellRendererOptions {
		let onChanged: (cell: ICell) => void = this._options.onChanged;
		let editable: boolean = this._options.editable;
		let indeterminate: boolean = this._options.indeterminate;
		let style: ProgressCellRendererStyle = this._options.style;
		let padding: number = this._options.padding;
		let radial: IRadialProgressStyle = this._options.radial;
		let linear: ILinearProgressStyle = this._options.linear;
		let color: IColor = this._options.color;
		let backgroundColor: IColor = this._options.backgroundColor;

		if (!!value.options) {
			if (!!value.options.onChanged) {
				onChanged = value.options.onChanged;
			}
			if (
				value.options.editable !== undefined &&
				value.options.editable !== null
			) {
				editable = value.options.editable;
			}
			if (
				value.options.indeterminate !== undefined &&
				value.options.indeterminate !== null
			) {
				indeterminate = value.options.indeterminate;
			}
			if (!!value.options.style) {
				style = value.options.style;
			}
			if (
				value.options.padding !== undefined &&
				value.options.padding !== null
			) {
				padding = value.options.padding;
			}
			if (!!value.options.color) {
				color = value.options.color;
			}
			if (!!value.options.backgroundColor) {
				backgroundColor = value.options.backgroundColor;
			}
			if (!!value.options.linear) {
				linear = value.options.linear;
			}
			if (!!value.options.radial) {
				radial = value.options.radial;
			}
		}

		return {
			onChanged,
			editable,
			indeterminate,
			style,
			padding,
			radial,
			linear,
			color,
			backgroundColor,
		};
	}

	private _onDoubleClick(event: ICellRendererMouseEvent): void {
		const value: IProgressCellRendererValue = ProgressCellRenderer._value(
			event.cell
		);
		const options: IProgressCellRendererOptions =
			this._deriveOptions(value);

		if (options.editable) {
			// TODO Open editor when editable
			console.log('TODO: Open editor when editable');
		}
	}

	estimatePreferredSize(cell: ICell): ISize | null {
		return null; // Renderer does not have a preferred size
	}

	private static _renderRadial(
		ctx: CanvasRenderingContext2D,
		bounds: IRectangle,
		value: IProgressCellRendererValue,
		options: IProgressCellRendererOptions,
		style: IRadialProgressStyle
	): void {
		const maxThickness: number = Math.max(
			style.backgroundThickness,
			style.foregroundThickness
		);
		const radius: number = Math.round(
			(Math.min(bounds.width, bounds.height) -
				2 * options.padding -
				maxThickness) /
				2
		);
		const center: IPoint = {
			x: Math.round(bounds.left + bounds.width / 2),
			y: Math.round(bounds.top + bounds.height / 2),
		};

		// Draw background first (if needed)
		const shouldDrawBackground: boolean =
			value.progress < 1.0 ||
			(value.progress === 1.0 &&
				style.foregroundThickness <= style.foregroundThickness);
		if (shouldDrawBackground) {
			ctx.lineWidth = style.backgroundThickness;
			ctx.strokeStyle = Colors.toStyleStr(options.backgroundColor);
			ctx.beginPath();
			ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
			ctx.stroke();
		}

		// Draw foreground second (if needed)
		const shouldDrawForeground: boolean = value.progress !== 0.0;
		if (shouldDrawForeground) {
			const startAngle: number = -0.5 * Math.PI;
			const endAngle: number = startAngle + 2 * Math.PI * value.progress;

			ctx.lineWidth = style.foregroundThickness;
			ctx.strokeStyle = Colors.toStyleStr(options.color);
			ctx.beginPath();
			ctx.arc(center.x, center.y, radius, startAngle, endAngle);
			ctx.stroke();
		}
	}

	private static _renderLinear(
		ctx: CanvasRenderingContext2D,
		bounds: IRectangle,
		value: IProgressCellRendererValue,
		options: IProgressCellRendererOptions,
		style: ILinearProgressStyle
	): void {
		// TODO
	}
}
