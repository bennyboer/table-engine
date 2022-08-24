import {
	AbstractCanvasCellRenderer,
	AlignmentUtil,
	CellRendererEventListenerType,
	Colors,
	HorizontalAlignment,
	ICell,
	IRectangle,
	IRenderContext,
	VerticalAlignment,
} from '../../../../src';
import { ICellRendererMouseEvent } from 'table-engine/renderer/cell/event/cell-renderer-mouse-event';
import { ICellRendererKeyboardEvent } from 'table-engine/renderer/cell/event/cell-renderer-keyboard-event';

export class DebugCellRenderer extends AbstractCanvasCellRenderer<
	any,
	any,
	any
> {
	public static readonly NAME: string = 'debug';

	constructor() {
		super(DebugCellRenderer.NAME, {});

		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_UP,
			(event) => {
				const mouseEvent = event as ICellRendererMouseEvent;
				event.cell.value = `mouse up: ${mouseEvent.offset.x} x ${mouseEvent.offset.y}`;
				this.repaint();
			}
		);
		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_MOVE,
			(event) => {
				const mouseEvent = event as ICellRendererMouseEvent;
				event.cell.value = `mouse move: ${mouseEvent.offset.x} x ${mouseEvent.offset.y}`;
				this.repaint();
			}
		);
		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_DOWN,
			(event) => {
				const mouseEvent = event as ICellRendererMouseEvent;
				event.cell.value = `mouse down: ${mouseEvent.offset.x} x ${mouseEvent.offset.y}`;
				this.repaint();
			}
		);
		this.registerEventListener(
			CellRendererEventListenerType.MOUSE_DOWN,
			(event) => {
				event.cell.value = 'mouse out';
				this.repaint();
			}
		);
		this.registerEventListener(
			CellRendererEventListenerType.KEY_DOWN,
			(event) => {
				const keyboardEvent = event as ICellRendererKeyboardEvent;
				event.cell.value = `key down: ${keyboardEvent.originalEvent.code}`;
				this.repaint();
			}
		);
		this.registerEventListener(
			CellRendererEventListenerType.KEY_UP,
			(event) => {
				const keyboardEvent = event as ICellRendererKeyboardEvent;
				event.cell.value = `key up: ${keyboardEvent.originalEvent.code}`;
				this.repaint();
			}
		);
		this.registerEventListener(
			CellRendererEventListenerType.FOCUS,
			(event) => {
				event.cell.value = 'focused';
				this.repaint();
			}
		);
		this.registerEventListener(
			CellRendererEventListenerType.BLUR,
			(event) => {
				event.cell.value = 'blurred';
				this.repaint();
			}
		);
	}

	before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		ctx.font = '10px sans-serif';
		ctx.fillStyle = Colors.toStyleStr(Colors.BLACK);
		ctx.textBaseline = AlignmentUtil.verticalAlignmentToStyleStr(
			VerticalAlignment.MIDDLE
		) as CanvasTextBaseline;
		ctx.textAlign = AlignmentUtil.horizontalAlignmentToStyleStr(
			HorizontalAlignment.CENTER
		) as CanvasTextAlign;
	}

	getName(): string {
		return DebugCellRenderer.NAME;
	}

	render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		ctx.fillText(
			cell.value ?? '[No event yet]',
			Math.round(bounds.left + bounds.width / 2),
			Math.round(bounds.top + bounds.height / 2)
		);
	}

	getDefaultViewportCache(): any {
		return {};
	}

	getOptionsFromCell(cell: ICell): any {
		return {};
	}

	mergeOptions(defaultOptions: any, cellOptions: any): any {
		return cellOptions;
	}
}
