import { ICanvasCellRenderer } from '../canvas-cell-renderer';
import { ICell } from '../../../../cell';
import { TableEngine } from '../../../../table-engine';
import { ICellRendererEvent, ICellRendererEventListener } from '../../../cell';
import { IOverlay } from '../../../../overlay';
import { IRenderContext } from '../../canvas-renderer';
import {
	AlignmentUtil,
	Colors,
	HorizontalAlignment,
	IRectangle,
	ISize,
	VerticalAlignment,
} from '../../../../util';
import { ILineWrapper, IParagraph, TrivialLineWrapper } from './line-wrap';
import {
	fillOptions as fillTextCellRendererOptions,
	ITextCellRendererOptions,
} from './text-cell-renderer-options';
import { ITextCellRendererValue } from './text-cell-renderer-value';

/**
 * Cell renderer rendering every value as string.
 */
export class TextCellRenderer implements ICanvasCellRenderer {
	/**
	 * Name of the cell renderer.
	 */
	public static readonly NAME: string = 'text';

	/**
	 * Line wrapping algorithm to use.
	 */
	private static readonly LINE_WRAPPER: ILineWrapper =
		new TrivialLineWrapper();

	/**
	 * Reference to the table engine.
	 */
	private _engine: TableEngine;

	/**
	 * Default options of the text cell renderer.
	 */
	private _defaultOptions: ITextCellRendererOptions;

	/**
	 * Event listeners on cells rendered with this cell renderer.
	 */
	private _eventListener: ICellRendererEventListener = {
		onDoubleClick: (event) => this._onDoubleClick(event),
	};

	constructor(defaultOptions?: ITextCellRendererOptions) {
		this._defaultOptions = fillTextCellRendererOptions(defaultOptions);
	}

	/**
	 * Get the viewport cache of the given cell.
	 * @param cell to get cache for
	 */
	private static _cache(cell: ICell): ITextCellRendererCache {
		if (!!cell.viewportCache) {
			return cell.viewportCache as ITextCellRendererCache;
		} else {
			const cache: ITextCellRendererCache = {};
			cell.viewportCache = cache;
			return cache;
		}
	}

	/**
	 * Called on a double click on the cell.
	 * @param event that occurred
	 */
	private _onDoubleClick(event: ICellRendererEvent): void {
		// Check if cell is editable
		let isEditable: boolean = this._defaultOptions.editable;
		let editValue: string;
		const specialValue: ITextCellRendererValue | null =
			!!event.cell.value &&
			typeof event.cell.value === 'object' &&
			'text' in event.cell.value
				? (event.cell.value as ITextCellRendererValue)
				: null;
		if (!!specialValue) {
			if (
				!!specialValue.options &&
				specialValue.options.editable !== undefined &&
				specialValue.options.editable !== null
			) {
				isEditable = specialValue.options.editable;
			}
			editValue = specialValue.text;
		} else {
			editValue = !!event.cell.value ? `${event.cell.value}` : '';
		}

		if (!isEditable) {
			return; // Cell is not editable
		}

		// Create editor overlay
		const editorOverlayElement: HTMLElement = document.createElement('div');
		const editor: HTMLInputElement = document.createElement('input');
		editor.style.width = '100%';
		editor.style.height = '100%';
		editor.style.boxSizing = 'border-box';
		editor.value = editValue;

		editorOverlayElement.appendChild(editor);

		const overlay: IOverlay = {
			element: editorOverlayElement,
			bounds: this._engine.getCellModel().getBounds(event.cell.range),
		};
		this._engine.getOverlayManager().addOverlay(overlay);

		// Add editor event listeners
		const keyDownListener: (KeyboardEvent) => void = (e: KeyboardEvent) => {
			e.stopPropagation(); // Do not give control to the table

			if (e.code === 'Enter') {
				blurListener();
			}
		};
		editor.addEventListener('keydown', keyDownListener);

		const blurListener: () => void = () => {
			// Remove all event listeners again
			editor.removeEventListener('blur', blurListener);
			editor.removeEventListener('keydown', keyDownListener);

			// Save changes
			const callback =
				!!specialValue && !!specialValue.options.onChange
					? specialValue.options.onChange
					: this._defaultOptions.onChange;
			const acceptChange: boolean = !!callback
				? callback(event.cell, editValue, editor.value)
				: true;
			if (acceptChange) {
				if (!!specialValue) {
					specialValue.text = editor.value;
				} else {
					event.cell.value = editor.value;
				}
			}

			// Invalidate viewport cache for cell
			event.cell.viewportCache = undefined;

			// Remove overlay
			this._engine.getOverlayManager().removeOverlay(overlay);

			// Re-focus table
			this._engine.requestFocus();
		};
		editor.addEventListener('blur', blurListener);

		setTimeout(() => {
			editor.focus();
		});
	}

	/**
	 * Initialize the cell renderer.
	 * This is only called once.
	 * @param engine reference to the table-engine
	 */
	public initialize(engine: TableEngine): void {
		this._engine = engine;
	}

	/**
	 * Get the name of the cell renderer.
	 * This must be unique.
	 */
	public getName(): string {
		return TextCellRenderer.NAME;
	}

	/**
	 * Called before rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 * @param context of the current rendering cycle
	 */
	public before(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext
	): void {
		ctx.font = `${this._defaultOptions.fontSize}px ${this._defaultOptions.fontFamily}`;
		ctx.fillStyle = Colors.toStyleStr(this._defaultOptions.color);
		ctx.textBaseline = AlignmentUtil.verticalAlignmentToStyleStr(
			this._defaultOptions.verticalAlignment
		) as CanvasTextBaseline;
		ctx.textAlign = AlignmentUtil.horizontalAlignmentToStyleStr(
			this._defaultOptions.horizontalAlignment
		) as CanvasTextAlign;
	}

	/**
	 * Called after rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 */
	public after(ctx: CanvasRenderingContext2D): void {
		// Nothing to do
	}

	/**
	 * Called when there are no cells that need to be rendered with the renderer in
	 * the current viewport.
	 */
	public cleanup(): void {
		// Nothing to cleanup
	}

	/**
	 * Get the event listeners on cells for this cell renderer.
	 */
	public getEventListener(): ICellRendererEventListener | null {
		return this._eventListener;
	}

	/**
	 * Render the given cell in the passed bounds.
	 * @param ctx context to render with
	 * @param cell to render
	 * @param bounds to render cell in
	 */
	public render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		if (cell.value === undefined || cell.value === null) {
			return;
		}

		const cache: ITextCellRendererCache = TextCellRenderer._cache(cell);

		// Check if the value is of the special text cell renderer interface for more customization
		const isSpecialCellRendererValue: boolean =
			typeof cell.value === 'object' && 'text' in cell.value;
		const specialValue: ITextCellRendererValue | null =
			isSpecialCellRendererValue
				? (cell.value as ITextCellRendererValue)
				: null;

		const text: string = isSpecialCellRendererValue
			? specialValue.text
			: `${cell.value}`;

		let lineWrap: boolean = this._defaultOptions.useLineWrapping;
		let lineHeight: number = this._defaultOptions.lineHeight;
		let verticalAlignment: VerticalAlignment =
			this._defaultOptions.verticalAlignment;
		let horizontalAlignment: HorizontalAlignment =
			this._defaultOptions.horizontalAlignment;
		let fontSize: number = this._defaultOptions.fontSize;

		// Override options if necessary
		let savedContext: boolean = false;
		if (isSpecialCellRendererValue && !!specialValue.options) {
			// Paragraph options
			if (
				specialValue.options.useLineWrapping !== undefined &&
				specialValue.options.useLineWrapping !== null
			) {
				lineWrap = specialValue.options.useLineWrapping;
			}
			if (
				specialValue.options.lineHeight !== undefined &&
				specialValue.options.lineHeight !== null
			) {
				lineHeight = specialValue.options.lineHeight;
			}

			// Font settings
			const hasCustomFontSize: boolean =
				specialValue.options.fontSize !== undefined &&
				specialValue.options.fontSize !== null;
			const hasCustomFontFamily: boolean =
				specialValue.options.fontFamily !== undefined &&
				specialValue.options.fontFamily !== null;
			if (hasCustomFontFamily || hasCustomFontSize) {
				if (!savedContext) {
					savedContext = true;
					ctx.save();
				}

				fontSize = hasCustomFontSize
					? specialValue.options.fontSize
					: this._defaultOptions.fontSize;
				const fontFamily: string = hasCustomFontFamily
					? specialValue.options.fontFamily
					: this._defaultOptions.fontFamily;

				ctx.font = `${fontSize}px ${fontFamily}`;
			}

			// Text color settings
			const hasCustomColor: boolean = !!specialValue.options.color;
			if (hasCustomColor) {
				if (!savedContext) {
					savedContext = true;
					ctx.save();
				}

				ctx.fillStyle = Colors.toStyleStr(specialValue.options.color);
			}

			// Alignment settings
			const hasCustomVerticalAlignment: boolean =
				specialValue.options.verticalAlignment !== undefined &&
				specialValue.options.verticalAlignment !== null;
			const hasCustomHorizontalAlignment: boolean =
				specialValue.options.horizontalAlignment !== undefined &&
				specialValue.options.horizontalAlignment !== null;
			if (hasCustomVerticalAlignment || hasCustomHorizontalAlignment) {
				if (!savedContext) {
					savedContext = true;
					ctx.save();
				}

				if (hasCustomVerticalAlignment) {
					ctx.textBaseline =
						AlignmentUtil.verticalAlignmentToStyleStr(
							specialValue.options.verticalAlignment
						) as CanvasTextBaseline;
					verticalAlignment = specialValue.options.verticalAlignment;
				}
				if (hasCustomHorizontalAlignment) {
					ctx.textAlign = AlignmentUtil.horizontalAlignmentToStyleStr(
						specialValue.options.horizontalAlignment
					) as CanvasTextAlign;
					horizontalAlignment =
						specialValue.options.horizontalAlignment;
				}
			}
		}

		let paragraph: IParagraph = null;

		// Check cells cache first to check whether the paragraph to render has already been cached.
		if (!!cache.paragraph && !!cache.text) {
			// Use cached paragraph if cache is still valid
			if (cache.text === text && cache.paragraph.width === bounds.width) {
				paragraph = cache.paragraph;
			}
		}

		if (!paragraph) {
			paragraph = TextCellRenderer.LINE_WRAPPER.wrap(
				text,
				lineWrap ? bounds.width : Number.MAX_SAFE_INTEGER,
				lineHeight,
				(str) => ctx.measureText(str).width
			);

			/*
			Cache in viewport cache so that the paragraph does not need
			to be recreated as long as the cell stays in the viewport.
			 */
			cache.paragraph = paragraph;
			cache.text = text;
		}

		const clip: boolean = !TextCellRenderer._fitsInBounds(
			paragraph,
			bounds
		);
		if (clip) {
			const clippingRegion = new Path2D();
			clippingRegion.rect(
				bounds.left,
				bounds.top,
				bounds.width,
				bounds.height
			);

			if (!savedContext) {
				savedContext = true;
				ctx.save();
			}
			ctx.clip(clippingRegion);
		}

		// Calculate x offset based on horizontal alignment
		let xOffset: number = bounds.left;
		switch (horizontalAlignment) {
			case HorizontalAlignment.RIGHT:
				xOffset += bounds.width;
				break;
			case HorizontalAlignment.CENTER:
				xOffset += Math.round(bounds.width / 2);
				break;
		}

		let yOffset: number = Math.round(
			TextCellRenderer._calculateLineYOffset(
				paragraph.lines.length,
				lineHeight,
				bounds,
				verticalAlignment
			)
		);
		for (const line of paragraph.lines) {
			ctx.fillText(line.text, xOffset, yOffset);

			yOffset += paragraph.lineHeight;
		}

		if (savedContext) {
			ctx.restore();
		}

		cache.preferredSize = {
			width: lineWrap ? 0 : paragraph.width,
			height: lineWrap ? paragraph.lines.length * lineHeight : fontSize,
		};
	}

	private static _calculateLineYOffset(
		lineCount: number,
		lineHeight: number,
		bounds: IRectangle,
		verticalAlignment: VerticalAlignment
	): number {
		switch (verticalAlignment) {
			case VerticalAlignment.MIDDLE:
				const offset: number = bounds.top + bounds.height / 2;

				if (lineCount === 1) {
					return offset;
				} else {
					return offset - (lineHeight * (lineCount - 1)) / 2;
				}
			case VerticalAlignment.TOP:
				return bounds.top;
			case VerticalAlignment.BOTTOM:
				if (lineCount === 1) {
					return bounds.top + bounds.height;
				} else {
					return (
						bounds.top +
						bounds.height -
						lineHeight * (lineCount - 1)
					);
				}
		}
	}

	/**
	 * Get the copy value of the passed cell rendered with this renderer.
	 * This may be a HTML representation of the value (for example for copying formatting, lists, ...).
	 */
	public getCopyValue(cell: ICell): string {
		return cell.value !== null ? `${cell.value}` : '';
	}

	/**
	 * Whether the given text (lines) fit into the given bounds of the cell.
	 * @param paragraph to check whether it fits in the cell bounds
	 * @param bounds of the cell
	 */
	private static _fitsInBounds(
		paragraph: IParagraph,
		bounds: IRectangle
	): boolean {
		let totalHeight: number = 0;

		for (const line of paragraph.lines) {
			if (line.width > bounds.width) {
				return false;
			}

			totalHeight += paragraph.lineHeight;

			if (totalHeight > bounds.height) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Called when the passed cell is disappearing from the visible area (viewport).
	 * @param cell that is disappearing
	 */
	public onDisappearing(cell: ICell): void {
		// Do nothing
	}

	estimatePreferredSize(cell: ICell): ISize | null {
		const cache: ITextCellRendererCache = TextCellRenderer._cache(cell);
		if (!!cache.preferredSize) {
			return cache.preferredSize;
		} else {
			return null;
		}
	}
}

/**
 * Cache held for cells rendered with this renderer since
 * line breaking is expensive.
 * The cache usually is stored in the viewport cache of the cell
 * which means that it will only be deleted once the cell isn't visible
 * anymore.
 */
interface ITextCellRendererCache {
	/**
	 * The cached paragraph.
	 */
	paragraph?: IParagraph;

	/**
	 * Text for which the paragraph has been created.
	 */
	text?: string;

	preferredSize?: ISize;
}
