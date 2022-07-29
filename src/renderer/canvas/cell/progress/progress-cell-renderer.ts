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
import { timestamp } from 'rxjs';

export class ProgressCellRenderer implements ICanvasCellRenderer {
	static readonly NAME: string = 'progress';

	private readonly _options: IProgressCellRendererOptions;

	private _engine: TableEngine;

	private _eventListener: ICellRendererEventListener = {
		onDoubleClick: (event) => this._onDoubleClick(event),
	};

	private _timestamp: number = 0;

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

			if (value.progress === undefined || value.progress === null) {
				value.progress = 0.0;
			} else if (value.progress > 1.0) {
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

		this._timestamp = window.performance.now();
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
			this._renderRadial(ctx, bounds, value, options, options.radial);
		} else if (options.style === ProgressCellRendererStyle.LINEAR) {
			this._renderLinear(ctx, bounds, value, options, options.linear);
		} else {
			throw new Error('Unsupported progress cell renderer style');
		}

		if (options.indeterminate) {
			this._engine.repaint();
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
		let indeterminatePeriodDuration: number =
			this._options.indeterminatePeriodDuration;
		let showLabel: boolean = this._options.showLabel;
		let labelFontSize: number = this._options.labelFontSize;
		let labelFontFamily: string = this._options.labelFontFamily;
		let labelColor: IColor = this._options.labelColor;

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
			if (
				value.options.indeterminatePeriodDuration !== undefined &&
				value.options.indeterminatePeriodDuration !== null
			) {
				indeterminatePeriodDuration =
					value.options.indeterminatePeriodDuration;
			}
			if (
				value.options.showLabel !== undefined &&
				value.options.showLabel !== null
			) {
				showLabel = value.options.showLabel;
			}
			if (
				value.options.labelFontSize !== undefined &&
				value.options.labelFontSize !== null
			) {
				labelFontSize = value.options.labelFontSize;
			}
			if (!!value.options.labelFontFamily) {
				labelFontFamily = value.options.labelFontFamily;
			}
			if (!!value.options.labelColor) {
				labelColor = value.options.labelColor;
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
			indeterminatePeriodDuration,
			showLabel,
			labelFontSize,
			labelFontFamily,
			labelColor,
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

	private _renderRadial(
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
		let center: IPoint = {
			x: Math.round(bounds.left + bounds.width / 2),
			y: Math.round(bounds.top + bounds.height / 2),
		};

		const label: string = `${Math.round(value.progress * 100)}%`;
		const labelFitsInCircle: boolean =
			0.6 * radius >= options.labelFontSize;
		if (options.showLabel && !options.indeterminate) {
			if (!labelFitsInCircle) {
				ctx.textAlign = 'left';
				ctx.textBaseline = 'middle';
				ctx.font = `${options.labelFontSize}px ${options.labelFontFamily}`;

				const labelWidth = ctx.measureText(label).width;
				const totalWidth =
					labelWidth + 2 * radius + options.padding + maxThickness;
				center.x = Math.round(
					bounds.left + (bounds.width - totalWidth) / 2
				);
			}
		}

		const shouldDrawBackground: boolean =
			options.indeterminate ||
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

		const shouldDrawForeground: boolean =
			options.indeterminate || value.progress !== 0.0;
		if (shouldDrawForeground) {
			let startAngle: number = -0.5 * Math.PI;
			let endAngle: number = startAngle + 2 * Math.PI * value.progress;
			if (options.indeterminate) {
				startAngle =
					(this._timestamp / options.indeterminatePeriodDuration) *
					(Math.PI * 2);

				const meanSize = (Math.PI / 4) * 3;
				const sizeDeviation = Math.PI / 4;
				const currentDeviation =
					Math.sin(
						this._timestamp /
							(options.indeterminatePeriodDuration / 4)
					) * sizeDeviation;
				endAngle = startAngle + meanSize + currentDeviation;
			}

			ctx.lineWidth = style.foregroundThickness;
			ctx.strokeStyle = Colors.toStyleStr(options.color);
			ctx.beginPath();
			ctx.arc(center.x, center.y, radius, startAngle, endAngle);
			ctx.stroke();
		}

		if (options.showLabel && !options.indeterminate) {
			ctx.fillStyle = Colors.toStyleStr(options.labelColor);

			if (labelFitsInCircle) {
				ctx.textAlign = 'center';
				ctx.fillText(label, center.x, center.y);
			} else {
				ctx.fillText(
					label,
					center.x + radius + maxThickness / 2 + options.padding,
					center.y
				);
			}
		}
	}

	private _renderLinear(
		ctx: CanvasRenderingContext2D,
		bounds: IRectangle,
		value: IProgressCellRendererValue,
		options: IProgressCellRendererOptions,
		style: ILinearProgressStyle
	): void {
		const width = bounds.width - options.padding * 2;
		let offset: IPoint = {
			x: bounds.left + options.padding,
			y: bounds.top + Math.round(bounds.height / 2),
		};

		if (options.showLabel && !options.indeterminate) {
			const labelHeight = options.labelFontSize;
			const totalHeight = labelHeight + style.thickness;
			offset.y =
				bounds.top + Math.round((bounds.height - totalHeight) / 2);
		}

		ctx.lineWidth = style.thickness;

		const shouldDrawBackground: boolean =
			options.indeterminate || value.progress < 1.0;
		if (shouldDrawBackground) {
			ctx.strokeStyle = Colors.toStyleStr(options.backgroundColor);
			ctx.beginPath();
			ctx.moveTo(offset.x, offset.y);
			ctx.lineTo(offset.x + width, offset.y);
			ctx.stroke();
		}

		const shouldDrawForeground: boolean =
			options.indeterminate || value.progress > 0.0;
		if (shouldDrawForeground) {
			let startX: number = offset.x;
			let endX: number = offset.x + value.progress * width;
			if (options.indeterminate) {
				const indeterminateProgress =
					(this._timestamp % options.indeterminatePeriodDuration) /
					options.indeterminatePeriodDuration;
				startX = startX - width + width * 3 * indeterminateProgress;

				const meanSize = width / 2;
				const sizeDeviation = meanSize / 2;
				const currentDeviation =
					Math.sin(
						this._timestamp /
							(options.indeterminatePeriodDuration / 4)
					) * sizeDeviation;
				endX = startX + meanSize + currentDeviation;

				startX = Math.max(offset.x, Math.min(offset.x + width, startX));
				endX = Math.max(offset.x, Math.min(offset.x + width, endX));
			}

			ctx.strokeStyle = Colors.toStyleStr(options.color);
			ctx.beginPath();
			ctx.moveTo(startX, offset.y);
			ctx.lineTo(endX, offset.y);
			ctx.stroke();
		}

		if (options.showLabel && !options.indeterminate) {
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			ctx.fillStyle = Colors.toStyleStr(options.labelColor);
			ctx.font = `${options.labelFontSize}px ${options.labelFontFamily}`;
			ctx.fillText(
				`${Math.round(value.progress * 100)}%`,
				bounds.left + Math.round(bounds.width / 2),
				offset.y + options.padding
			);
		}
	}
}
