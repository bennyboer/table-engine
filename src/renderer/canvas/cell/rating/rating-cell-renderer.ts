import { ICanvasCellRenderer } from '../canvas-cell-renderer';
import { IRenderContext } from '../../canvas-renderer';
import { ICell } from '../../../../cell';
import { ICellRendererEventListener } from '../../../cell';
import { TableEngine } from '../../../../table-engine';
import { Colors, IColor, IPoint, IRectangle, ISize } from '../../../../util';
import {
	fillOptions,
	IRatingCellRendererOptions,
} from './rating-cell-renderer-options';
import { IRatingCellRendererValue } from './rating-cell-renderer-value';

/**
 * Cell renderer rendering a rating visualization using a row of stars.
 */
export class RatingCellRenderer implements ICanvasCellRenderer {
	/**
	 * Name of the cell renderer.
	 */
	public static readonly NAME: string = 'rating';

	/**
	 * Options of the cell renderer.
	 */
	private readonly _options: IRatingCellRendererOptions;

	/**
	 * Event listeners on cells rendered with this cell renderer.
	 */
	private readonly _eventListener: ICellRendererEventListener = {
		onMouseMove: (event) => {
			const cache: IRatingCellRendererViewportCache =
				RatingCellRenderer._cache(event.cell);
			const value: IRatingCellRendererValue = RatingCellRenderer._value(
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

			if (editable) {
				// Check whether a star is hovered
				const hoveredStar: number = this._getHoveredStar(
					event.offset,
					event.cell
				);
				const hasHoveredStar = hoveredStar !== -1;
				if (hoveredStar !== cache.hoveredStar) {
					cache.hoveredStar = hoveredStar;
					if (hasHoveredStar) {
						this._engine.setCursor('pointer');
					} else {
						this._engine.resetCursor();
					}
					this._engine.repaint();
				}
			}
		},
		onMouseOut: (event) => {
			const cache: IRatingCellRendererViewportCache =
				RatingCellRenderer._cache(event.cell);

			const hasHoveredStar =
				cache.hoveredStar !== undefined && cache.hoveredStar > -1;
			if (hasHoveredStar) {
				this._engine.repaint();
			} else {
				this._engine.resetCursor();
			}
		},
		onMouseUp: (event) => {
			const value: IRatingCellRendererValue = RatingCellRenderer._value(
				event.cell
			);

			let editable: boolean = this._options.editable;
			let maxValue: number = this._options.maxValue;
			let starCount: number = this._options.starCount;
			let onChanged: (cell: ICell) => void = this._options.onChanged;
			if (!!value.options) {
				if (
					value.options.editable !== undefined &&
					value.options.editable !== null
				) {
					editable = value.options.editable;
				}
				if (
					value.options.maxValue !== undefined &&
					value.options.maxValue !== null
				) {
					maxValue = value.options.maxValue;
				}
				if (
					value.options.starCount !== undefined &&
					value.options.starCount !== null
				) {
					starCount = value.options.starCount;
				}
				if (!!value.options.onChanged) {
					onChanged = value.options.onChanged;
				}
			}

			if (editable) {
				let hoveredStar: number = this._getHoveredStar(
					event.offset,
					event.cell
				);

				value.rating = ((hoveredStar + 1) / starCount) * maxValue;

				if (!!onChanged) {
					onChanged(event.cell);
				}

				this._engine.repaint();
			}
		},
	};

	/**
	 * Reference to the table engine.
	 */
	private _engine: TableEngine;

	/**
	 * Rendering context.
	 */
	private _ctx: CanvasRenderingContext2D;

	constructor(options?: IRatingCellRendererOptions) {
		this._options = fillOptions(options);
	}

	/**
	 * Get the currently hovered star index or -1.
	 * @param offset the current offset to check for
	 * @param cell to check for
	 */
	private _getHoveredStar(offset: IPoint, cell: ICell): number {
		const cache: IRatingCellRendererViewportCache =
			RatingCellRenderer._cache(cell);

		if (!cache.starPaths) {
			return -1;
		}

		for (let i = 0; i < cache.starPaths.length; i++) {
			const isHovered: boolean = this._ctx.isPointInPath(
				cache.starPaths[i],
				offset.x * this._engine.getZoom(),
				offset.y * this._engine.getZoom()
			);
			if (isHovered) {
				return i;
			}
		}

		return -1;
	}

	/**
	 * Get the value for this cell renderer for the given cell.
	 * @param cell to get cell renderer value for
	 */
	private static _value(cell: ICell): IRatingCellRendererValue {
		const isSpecialValue: boolean =
			!!cell.value &&
			typeof cell.value === 'object' &&
			'rating' in cell.value;

		if (isSpecialValue) {
			return cell.value as IRatingCellRendererValue;
		} else {
			const rating: number =
				cell.value !== undefined && cell.value !== null
					? cell.value
					: 0;

			const value: IRatingCellRendererValue = { rating };
			cell.value = value;
			return value;
		}
	}

	/**
	 * Get the viewport cache for the given cell.
	 * @param cell to get cache for
	 */
	private static _cache(cell: ICell): IRatingCellRendererViewportCache {
		if (!!cell.viewportCache) {
			return cell.viewportCache as IRatingCellRendererViewportCache;
		} else {
			const cache: IRatingCellRendererViewportCache = {};
			cell.viewportCache = cache;
			return cache;
		}
	}

	public after(ctx: CanvasRenderingContext2D): void {
		// Nothing to do after rendering all cells with this renderer
	}

	public before(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext
	): void {
		ctx.lineDashOffset = 0.0;
		ctx.lineJoin = 'round';
	}

	public cleanup(): void {
		// Nothing to cleanup
	}

	public getCopyValue(cell: ICell): string {
		return `${RatingCellRenderer._value(cell).rating}`;
	}

	public getEventListener(): ICellRendererEventListener | null {
		return this._eventListener;
	}

	public getName(): string {
		return RatingCellRenderer.NAME;
	}

	public initialize(engine: TableEngine): void {
		this._engine = engine;
	}

	public onDisappearing(cell: ICell): void {
		// Nothing to do when a cell disappears from the viewport
	}

	public render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		this._ctx = ctx;

		const value: IRatingCellRendererValue = RatingCellRenderer._value(cell);

		if (!value) {
			return;
		}

		const cache: IRatingCellRendererViewportCache =
			RatingCellRenderer._cache(cell);

		let starCount: number = this._options.starCount;
		let spikeCount: number = this._options.spikeCount;
		let maxValue: number = this._options.maxValue;
		let spacing: number = this._options.spacing;
		let padding: number = this._options.padding;
		let color: IColor = this._options.color;
		let inactiveColor: IColor = this._options.inactiveColor;
		let hoverBorderColor: IColor = this._options.hoverBorderColor;
		let hoverBorderThickness: number = this._options.hoverBorderThickness;
		if (!!value.options) {
			if (
				value.options.starCount !== undefined &&
				value.options.starCount !== null
			) {
				starCount = value.options.starCount;
			}
			if (
				value.options.spikeCount !== undefined &&
				value.options.spikeCount !== null
			) {
				spikeCount = value.options.spikeCount;
			}
			if (
				value.options.maxValue !== undefined &&
				value.options.maxValue !== null
			) {
				maxValue = value.options.maxValue;
			}
			if (
				value.options.spacing !== undefined &&
				value.options.spacing !== null
			) {
				spacing = value.options.spacing;
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
			if (!!value.options.inactiveColor) {
				inactiveColor = value.options.inactiveColor;
			}
			if (!!value.options.hoverBorderColor) {
				hoverBorderColor = value.options.hoverBorderColor;
			}
			if (
				value.options.hoverBorderThickness !== undefined &&
				value.options.hoverBorderThickness !== null
			) {
				hoverBorderThickness = value.options.hoverBorderThickness;
			}
		}

		const boundsChanged: boolean =
			!cache.oldBounds ||
			cache.oldBounds.top !== bounds.top ||
			cache.oldBounds.left !== bounds.left ||
			cache.oldBounds.width !== bounds.width ||
			cache.oldBounds.height !== bounds.height;

		const sizePerStar: number = Math.min(
			(bounds.width - padding * 2) / starCount,
			bounds.height - padding * 2
		);
		const totalWidth: number = sizePerStar * starCount;

		const xOffset: number =
			bounds.left + Math.round((bounds.width - totalWidth) / 2);
		const yOffset: number =
			bounds.top + Math.round((bounds.height - sizePerStar) / 2);

		// Create rating path
		if (boundsChanged) {
			const outerRadius: number = (sizePerStar - spacing) / 2;
			const innerRadius: number = outerRadius / 2;
			const starPath: Path2D = RatingCellRenderer._makeStarPath(
				{ x: 0, y: 0 },
				outerRadius,
				innerRadius,
				spikeCount
			);
			const ratingPath: Path2D = new Path2D();
			const paths: Path2D[] = [];
			for (let i = 0; i < starCount; i++) {
				const translatedStarPath: Path2D = new Path2D();
				translatedStarPath.addPath(
					starPath,
					new DOMMatrix().translateSelf(
						xOffset + sizePerStar * i,
						yOffset
					)
				);

				paths.push(translatedStarPath);

				ratingPath.addPath(translatedStarPath);
			}

			cache.starPaths = paths;
			cache.ratingPath = ratingPath;
		}

		// Render rating
		const colorStr: string = Colors.toStyleStr(color);
		const hoverBorderColorStr: string = Colors.toStyleStr(hoverBorderColor);
		const inactiveColorStr: string = Colors.toStyleStr(inactiveColor);

		let normalizedValue: number = value.rating / maxValue;

		const isHovered: boolean =
			cache.hoveredStar !== undefined && cache.hoveredStar > -1;
		if (isHovered) {
			// A star is hovered -> visualize how clicking on the star would look like
			normalizedValue = (cache.hoveredStar + 1) / maxValue;
		}

		if (normalizedValue <= 0) {
			ctx.fillStyle = inactiveColorStr;
			ctx.fill(cache.ratingPath);
		} else if (normalizedValue >= 1) {
			ctx.fillStyle = colorStr;
			ctx.fill(cache.ratingPath);
		} else {
			const starCountValue: number = normalizedValue * starCount;
			const filledStarCount: number = Math.floor(starCountValue);

			const partlyFilledStarFraction: number =
				starCountValue - filledStarCount;
			const partlyFilledStarIndex: number =
				partlyFilledStarFraction > 0 ? filledStarCount : -1;

			for (let i = 0; i < starCount; i++) {
				const starPath: Path2D = cache.starPaths[i];

				if (i < filledStarCount) {
					ctx.fillStyle = colorStr; // Draw star filled
				} else if (i === partlyFilledStarIndex) {
					// Draw star partly filled
					const starXOffset: number = xOffset + sizePerStar * i;
					const gradient: CanvasGradient = ctx.createLinearGradient(
						starXOffset,
						0,
						starXOffset + (sizePerStar - spacing),
						0
					);

					gradient.addColorStop(0, colorStr);
					gradient.addColorStop(partlyFilledStarFraction, colorStr);
					gradient.addColorStop(
						partlyFilledStarFraction,
						inactiveColorStr
					);
					gradient.addColorStop(1, inactiveColorStr);

					ctx.fillStyle = gradient;
				} else {
					ctx.fillStyle = inactiveColorStr; // Draw star inactive
				}

				ctx.fill(starPath);
			}
		}

		if (isHovered) {
			// Render hover border around hovered stars
			ctx.strokeStyle = hoverBorderColorStr;
			ctx.lineWidth = hoverBorderThickness;

			for (let i = 0; i <= cache.hoveredStar; i++) {
				const starPath: Path2D = cache.starPaths[i];
				ctx.stroke(starPath);
			}
		}

		cache.oldBounds = bounds;
	}

	/**
	 * Render a star at the given offset with the passed size.
	 * @param offset to render star at
	 * @param outerRadius of the star
	 * @param innerRadius of the star
	 * @param spikeCount count of spikes the star should have
	 */
	private static _makeStarPath(
		offset: IPoint,
		outerRadius: number,
		innerRadius: number,
		spikeCount: number
	): Path2D {
		const center: IPoint = {
			x: offset.x + outerRadius,
			y: offset.y + outerRadius,
		};

		const path: Path2D = new Path2D();

		// Move beginning of path to first spike on top
		path.moveTo(center.x, center.y - outerRadius);

		const startRotation: number = (Math.PI / 2) * 3;
		const anglePerSpike: number = Math.PI / spikeCount;
		for (let i = 0; i < spikeCount; i++) {
			const nextAngle: number = startRotation + 2 * i * anglePerSpike;

			// Create outer vertex
			path.lineTo(
				center.x + Math.cos(nextAngle) * outerRadius,
				center.y + Math.sin(nextAngle) * outerRadius
			);

			// Create inner vertex
			path.lineTo(
				center.x + Math.cos(nextAngle + anglePerSpike) * innerRadius,
				center.y + Math.sin(nextAngle + anglePerSpike) * innerRadius
			);
		}

		path.closePath();

		return path;
	}

	estimatePreferredSize(cell: ICell): ISize {
		return null; // Renderer does not have a preferred size
	}
}

/**
 * Viewport cache for the rating cell renderer.
 */
interface IRatingCellRendererViewportCache {
	/**
	 * Paths of the rendered stars.
	 */
	starPaths?: Path2D[];

	/**
	 * Path of the complete rating.
	 */
	ratingPath?: Path2D;

	/**
	 * Bounds the ratingPath and starPaths have been created with.
	 */
	oldBounds?: IRectangle;

	/**
	 * The currently hovered star (if any).
	 */
	hoveredStar?: number;
}
