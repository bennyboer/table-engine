import {ICanvasCellRenderer} from "../canvas-cell-renderer";
import {ICell} from "../../../../cell/cell";
import {TableEngine} from "../../../../table-engine";
import {ICellRendererEventListener} from "../../../cell/event/cell-renderer-event-listener";
import {ICellRendererEvent} from "../../../cell/event/cell-renderer-event";
import {IOverlay} from "../../../../overlay/overlay";
import {IRenderContext} from "../../canvas-renderer";
import {IRectangle} from "../../../../util/rect";
import {ILineWrapper} from "./line-wrap/line-wrapper";
import {TrivialLineWrapper} from "./line-wrap/trivial-line-wrapper";
import {IParagraph} from "./line-wrap/paragraph";
import {fillOptions as fillTextCellRendererOptions, ITextCellRendererOptions} from "./text-cell-renderer-options";
import {Colors} from "../../../../util/colors";
import {AlignmentUtil} from "../../../../util/alignment/alignment-util";
import {ITextCellRendererValue} from "./text-cell-renderer-value";
import {VerticalAlignment} from "../../../../util/alignment/vertical-alignment";
import {HorizontalAlignment} from "../../../../util/alignment/horizontal-alignment";

/**
 * Cell renderer rendering every value as string.
 */
export class TextCellRenderer implements ICanvasCellRenderer {

	/**
	 * Max duration of two mouse up events to be detected as double click (in milliseconds).
	 */
	private static readonly MAX_DOUBLE_CLICK_DURATION: number = 300;

	/**
	 * Line wrapping algorithm to use.
	 */
	private static readonly LINE_WRAPPER: ILineWrapper = new TrivialLineWrapper();

	/**
	 * Cell of the last mouse up.
	 */
	private _lastCellMouseUp: ICell | null = null;

	/**
	 * Timestamp of the last mouse up event.
	 */
	private _lastMouseUpTimestamp: number;

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
		onMouseUp: (event) => {
			const currentTimestamp: number = window.performance.now();
			if (!!this._lastCellMouseUp && this._lastCellMouseUp === event.cell) {
				// Check if is double click
				const diff: number = currentTimestamp - this._lastMouseUpTimestamp;
				if (diff <= TextCellRenderer.MAX_DOUBLE_CLICK_DURATION) {
					this._onDoubleClick(event);
				}
			}

			this._lastCellMouseUp = event.cell;
			this._lastMouseUpTimestamp = currentTimestamp;
		}
	};

	constructor(
		defaultOptions?: ITextCellRendererOptions
	) {
		this._defaultOptions = fillTextCellRendererOptions(defaultOptions);
	}

	/**
	 * Called on a double click on the cell.
	 * @param event that occurred
	 */
	private _onDoubleClick(event: ICellRendererEvent): void {
		// Check if cell is editable
		let isEditable: boolean = this._defaultOptions.editable;
		let editValue: string;
		const specialValue: ITextCellRendererValue | null = typeof event.cell.value === "object" && "text" in event.cell.value ? event.cell.value as ITextCellRendererValue : null;
		if (!!specialValue) {
			if (!!specialValue.options && specialValue.options.editable !== undefined && specialValue.options.editable !== null) {
				isEditable = specialValue.options.editable;
			}
			editValue = specialValue.text;
		} else {
			editValue = `${event.cell.value}`;
		}

		if (!isEditable) {
			return; // Cell is not editable
		}

		// Create editor overlay
		const editorOverlayElement: HTMLElement = document.createElement("div");
		const editor: HTMLInputElement = document.createElement("input");
		editor.style.width = "100%";
		editor.style.height = "100%";
		editor.style.boxSizing = "border-box";
		editor.value = editValue;

		editorOverlayElement.appendChild(editor);

		const overlay: IOverlay = {
			element: editorOverlayElement,
			bounds: this._engine.getCellModel().getBounds(event.cell.range)
		};
		this._engine.getOverlayManager().addOverlay(overlay);

		// Add editor event listeners
		const keyDownListener: (KeyboardEvent) => void = (e: KeyboardEvent) => {
			e.stopPropagation(); // Do not give control to the table

			if (e.code === "Enter") {
				blurListener();
			}
		};
		editor.addEventListener("keydown", keyDownListener);

		const blurListener: () => void = () => {
			// Remove all event listeners again
			editor.removeEventListener("blur", blurListener);
			editor.removeEventListener("keydown", keyDownListener);

			// Save changes
			if (!!specialValue) {
				specialValue.text = editor.value;
			} else {
				event.cell.value = editor.value;
			}

			// Invalidate viewport cache for cell
			event.cell.viewportCache = undefined;

			// Remove overlay
			this._engine.getOverlayManager().removeOverlay(overlay);

			// Re-focus table
			this._engine.requestFocus();
		};
		editor.addEventListener("blur", blurListener);

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
		return "text";
	}

	/**
	 * Called before rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 * @param context of the current rendering cycle
	 */
	public before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		ctx.font = `${this._defaultOptions.fontSize}px ${this._defaultOptions.fontFamily}`;
		ctx.fillStyle = Colors.toStyleStr(this._defaultOptions.color);
		ctx.textBaseline = AlignmentUtil.verticalAlignmentToStyleStr(this._defaultOptions.verticalAlignment) as CanvasTextBaseline;
		ctx.textAlign = AlignmentUtil.horizontalAlignmentToStyleStr(this._defaultOptions.horizontalAlignment) as CanvasTextAlign;
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
	public render(ctx: CanvasRenderingContext2D, cell: ICell, bounds: IRectangle): void {
		if (cell.value === undefined || cell.value === null) {
			return;
		}

		// Check if the value is of the special text cell renderer interface for more customization
		const isSpecialCellRendererValue: boolean = typeof cell.value === "object" && "text" in cell.value;
		const specialValue: ITextCellRendererValue | null = isSpecialCellRendererValue ? cell.value as ITextCellRendererValue : null;

		const text: string = isSpecialCellRendererValue ? specialValue.text : `${cell.value}`;

		let lineWrap: boolean = this._defaultOptions.useLineWrapping;
		let lineHeight: number = this._defaultOptions.lineHeight;
		let verticalAlignment: VerticalAlignment = this._defaultOptions.verticalAlignment;
		let horizontalAlignment: HorizontalAlignment = this._defaultOptions.horizontalAlignment;

		// Override options if necessary
		let savedContext: boolean = false;
		if (isSpecialCellRendererValue && !!specialValue.options) {
			// Paragraph options
			if (specialValue.options.useLineWrapping !== undefined && specialValue.options.useLineWrapping !== null) {
				lineWrap = specialValue.options.useLineWrapping;
			}
			if (specialValue.options.lineHeight !== undefined && specialValue.options.lineHeight !== null) {
				lineHeight = specialValue.options.lineHeight;
			}

			// Font settings
			const hasCustomFontSize: boolean = specialValue.options.fontSize !== undefined && specialValue.options.fontSize !== null;
			const hasCustomFontFamily: boolean = specialValue.options.fontFamily !== undefined && specialValue.options.fontFamily !== null;
			if (hasCustomFontFamily || hasCustomFontSize) {
				if (!savedContext) {
					savedContext = true;
					ctx.save();
				}

				const fontSize: number = hasCustomFontSize ? specialValue.options.fontSize : this._defaultOptions.fontSize;
				const fontFamily: string = hasCustomFontFamily ? specialValue.options.fontFamily : this._defaultOptions.fontFamily;

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
			const hasCustomVerticalAlignment: boolean = specialValue.options.verticalAlignment !== undefined && specialValue.options.verticalAlignment !== null;
			const hasCustomHorizontalAlignment: boolean = specialValue.options.horizontalAlignment !== undefined && specialValue.options.horizontalAlignment !== null;
			if (hasCustomVerticalAlignment || hasCustomHorizontalAlignment) {
				if (!savedContext) {
					savedContext = true;
					ctx.save();
				}

				if (hasCustomVerticalAlignment) {
					ctx.textBaseline = AlignmentUtil.verticalAlignmentToStyleStr(specialValue.options.verticalAlignment) as CanvasTextBaseline;
					verticalAlignment = specialValue.options.verticalAlignment;
				}
				if (hasCustomHorizontalAlignment) {
					ctx.textAlign = AlignmentUtil.horizontalAlignmentToStyleStr(specialValue.options.horizontalAlignment) as CanvasTextAlign;
					horizontalAlignment = specialValue.options.horizontalAlignment;
				}
			}
		}

		let paragraph: IParagraph = null;

		// Check cells cache first to check whether the paragraph to render has already been cached.
		if (!!cell.viewportCache) {
			const cache: ITextCellRendererCache = cell.viewportCache as ITextCellRendererCache;

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
			cell.viewportCache = {
				paragraph,
				text
			} as ITextCellRendererCache;
		}

		const clip: boolean = !TextCellRenderer._fitsInBounds(paragraph, bounds);
		if (clip) {
			const clippingRegion = new Path2D();
			clippingRegion.rect(bounds.left, bounds.top, bounds.width, bounds.height);

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

		let yOffset: number = Math.round(TextCellRenderer._calculateLineYOffset(
			paragraph.lines.length,
			lineHeight,
			bounds,
			verticalAlignment
		));
		for (const line of paragraph.lines) {
			ctx.fillText(line.text, xOffset, yOffset);

			yOffset += paragraph.lineHeight;
		}

		if (savedContext) {
			ctx.restore();
		}
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
					return offset - (lineHeight * lineCount) / 2;
				}
			case VerticalAlignment.TOP:
				return bounds.top;
			case VerticalAlignment.BOTTOM:
				if (lineCount === 1) {
					return bounds.top + bounds.height;
				} else {
					return bounds.top + bounds.height - (lineHeight * (lineCount - 1));
				}
		}
	}

	/**
	 * Get the copy value of the passed cell rendered with this renderer.
	 * This may be a HTML representation of the value (for example for copying formatting, lists, ...).
	 */
	public getCopyValue(cell: ICell): string {
		return cell.value !== null ? `${cell.value}` : "";
	}

	/**
	 * Whether the given text (lines) fit into the given bounds of the cell.
	 * @param paragraph to check whether it fits in the cell bounds
	 * @param bounds of the cell
	 */
	private static _fitsInBounds(paragraph: IParagraph, bounds: IRectangle): boolean {
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
	paragraph: IParagraph;

	/**
	 * Text for which the paragraph has been created.
	 */
	text: string;

}
