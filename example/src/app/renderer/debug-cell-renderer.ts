import {ICanvasCellRenderer} from "../../../../src/renderer/canvas/cell/canvas-cell-renderer";
import {ICell} from "../../../../src/cell/cell";
import {IRenderContext} from "../../../../src/renderer/canvas/canvas-renderer";
import {ICellRendererEventListener} from "../../../../src/renderer/cell/event/cell-renderer-event-listener";
import {TableEngine} from "../../../../src/table-engine";
import {IRectangle} from "../../../../src/util/rect";
import {Colors} from "../../../../src/util/colors";
import {AlignmentUtil} from "../../../../src/util/alignment/alignment-util";
import {VerticalAlignment} from "../../../../src/util/alignment/vertical-alignment";
import {HorizontalAlignment} from "../../../../src/util/alignment/horizontal-alignment";

export class DebugCellRenderer implements ICanvasCellRenderer {
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
			event.cell.value = "mouse out";
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
			event.cell.value = "focused";
			this._engine.repaint();
		},
		onBlur: (event) => {
			event.cell.value = "blurred";
			this._engine.repaint();
		}
	};

	private _engine: TableEngine;

	public after(ctx: CanvasRenderingContext2D): void {
	}

	public before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		ctx.font = "10px sans-serif";
		ctx.fillStyle = Colors.toStyleStr(Colors.BLACK);
		ctx.textBaseline = AlignmentUtil.verticalAlignmentToStyleStr(VerticalAlignment.MIDDLE) as CanvasTextBaseline;
		ctx.textAlign = AlignmentUtil.horizontalAlignmentToStyleStr(HorizontalAlignment.CENTER) as CanvasTextAlign;
	}

	public cleanup(): void {
	}

	public getCopyValue(cell: ICell): string {
		return "";
	}

	public getEventListener(): ICellRendererEventListener | null {
		return this._eventListener;
	}

	public getName(): string {
		return "debug";
	}

	public initialize(engine: TableEngine): void {
		this._engine = engine;
	}

	public render(ctx: CanvasRenderingContext2D, cell: ICell, bounds: IRectangle): void {
		ctx.fillText(cell.value ?? "[No event yet]", Math.round(bounds.left + bounds.width / 2), Math.round(bounds.top + bounds.height / 2));
	}

}
