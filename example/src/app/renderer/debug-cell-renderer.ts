import {
	AlignmentUtil,
	Colors,
	HorizontalAlignment,
	ICanvasCellRenderer,
	ICell,
	ICellRendererEventListener,
	IRectangle,
	IRenderContext,
	TableEngine,
	VerticalAlignment,
} from '../../../../src';
import { ISize } from 'table-engine/util/size';

export class DebugCellRenderer implements ICanvasCellRenderer {
	public static readonly NAME: string = 'debug';

	/**
	 * Event listeners on cells rendered with this cell renderer.
	 */
	private readonly _eventListener: ICellRendererEventListener = {
		onMouseUp: (event) => {
			event.cell.value = `mouse up: ${event.offset.x} x ${event.offset.y}`;
			this._engine.repaint();
		},
		onMouseMove: (event) => {
			event.cell.value = `mouse move: ${event.offset.x} x ${event.offset.y}`;
			this._engine.repaint();
		},
		onMouseDown: (event) => {
			event.cell.value = `mouse down: ${event.offset.x} x ${event.offset.y}`;
			this._engine.repaint();
		},
		onMouseOut: (event) => {
			event.cell.value = 'mouse out';
			this._engine.repaint();
		},
		onKeyDown: (event) => {
			event.cell.value = `key down: ${event.originalEvent.code}`;
			this._engine.repaint();
		},
		onKeyUp: (event) => {
			event.cell.value = `key up: ${event.originalEvent.code}`;
			this._engine.repaint();
		},
		onFocus: (event) => {
			event.cell.value = 'focused';
			this._engine.repaint();
		},
		onBlur: (event) => {
			event.cell.value = 'blurred';
			this._engine.repaint();
		},
	};

	private _engine: TableEngine;

	public after(ctx: CanvasRenderingContext2D): void {}

	public before(
		ctx: CanvasRenderingContext2D,
		context: IRenderContext
	): void {
		ctx.font = '10px sans-serif';
		ctx.fillStyle = Colors.toStyleStr(Colors.BLACK);
		ctx.textBaseline = AlignmentUtil.verticalAlignmentToStyleStr(
			VerticalAlignment.MIDDLE
		) as CanvasTextBaseline;
		ctx.textAlign = AlignmentUtil.horizontalAlignmentToStyleStr(
			HorizontalAlignment.CENTER
		) as CanvasTextAlign;
	}

	public cleanup(): void {}

	public getCopyValue(cell: ICell): string {
		return '';
	}

	public getEventListener(): ICellRendererEventListener | null {
		return this._eventListener;
	}

	public getName(): string {
		return DebugCellRenderer.NAME;
	}

	public initialize(engine: TableEngine): void {
		this._engine = engine;
	}

	public render(
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

	/**
	 * Called when the passed cell is disappearing from the visible area (viewport).
	 * @param cell that is disappearing
	 */
	public onDisappearing(cell: ICell): void {
		// Do nothing
	}

	estimatePreferredSize(cell: ICell): ISize | null {
		return null; // Renderer does not have a preferred size
	}
}
