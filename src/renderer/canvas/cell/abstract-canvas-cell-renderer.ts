import { ICanvasCellRenderer } from './canvas-cell-renderer';
import { IRenderContext } from '../canvas-renderer';
import { IRectangle, ISize } from '../../../util';
import { ICell } from '../../../cell';
import {
	CellRendererEventListenerType,
	ICellRendererEvent,
	ICellRendererEventListener,
} from '../../cell';
import { TableEngine } from '../../../table-engine';

export abstract class AbstractCanvasCellRenderer<V, O, C>
	implements ICanvasCellRenderer
{
	private _engine: TableEngine;

	private _eventListener: ICellRendererEventListener | null = null;

	protected constructor(
		private readonly _name: string,
		private readonly _defaultOptions: O
	) {}

	protected cache(cell: ICell): C {
		if (!!cell.viewportCache) {
			return cell.viewportCache as C;
		} else {
			const cache: C = this.getDefaultViewportCache();
			cell.viewportCache = cache;
			return cache;
		}
	}

	protected value(cell: ICell): V {
		return cell.value as V;
	}

	protected options(cell: ICell): O {
		const optionsFromCell = this.getOptionsFromCell(cell);
		if (!!optionsFromCell) {
			return this.mergeOptions(this._defaultOptions, optionsFromCell);
		}

		return this._defaultOptions;
	}

	protected registerEventListener(
		eventType: CellRendererEventListenerType,
		callback: (event: ICellRendererEvent) => void
	): void {
		if (!this._eventListener) {
			this._eventListener = {};
		}

		AbstractCanvasCellRenderer._assignEventListenerCallback(
			eventType,
			this._eventListener,
			callback
		);
	}

	private static _assignEventListenerCallback(
		eventType: CellRendererEventListenerType,
		eventListener: ICellRendererEventListener,
		callback: (event: ICellRendererEvent) => void
	): void {
		switch (eventType) {
			case CellRendererEventListenerType.MOUSE_DOWN:
				eventListener.onMouseDown = callback;
				break;
			case CellRendererEventListenerType.MOUSE_MOVE:
				eventListener.onMouseMove = callback;
				break;
			case CellRendererEventListenerType.MOUSE_OUT:
				eventListener.onMouseOut = callback;
				break;
			case CellRendererEventListenerType.DOUBLE_CLICK:
				eventListener.onDoubleClick = callback;
				break;
			case CellRendererEventListenerType.MOUSE_UP:
				eventListener.onMouseUp = callback;
				break;
			case CellRendererEventListenerType.KEY_DOWN:
				eventListener.onKeyDown = callback;
				break;
			case CellRendererEventListenerType.KEY_UP:
				eventListener.onKeyUp = callback;
				break;
			case CellRendererEventListenerType.FOCUS:
				eventListener.onFocus = callback;
				break;
			case CellRendererEventListenerType.BLUR:
				eventListener.onBlur = callback;
				break;
			default:
				throw new Error('Event type unsupported');
		}
	}

	abstract getOptionsFromCell(cell: ICell): O | null;

	abstract mergeOptions(defaultOptions: O, cellOptions: O): O;

	abstract getDefaultViewportCache(): C;

	after(ctx: CanvasRenderingContext2D): void {}

	before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {}

	cleanup(): void {}

	estimatePreferredSize(cell: ICell): ISize | null {
		return null;
	}

	getCopyValue(cell: ICell): string {
		return '';
	}

	getEventListener(): ICellRendererEventListener | null {
		return this._eventListener;
	}

	getName(): string {
		return this._name;
	}

	initialize(engine: TableEngine): void {
		this._engine = engine;
	}

	onDisappearing(cell: ICell): void {}

	abstract render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void;

	protected repaint(): void {
		this.engine.repaint();
	}

	protected setCursor(cursorName: string): void {
		this.engine.setCursor(cursorName);
	}

	protected resetCursor(): void {
		this.engine.resetCursor();
	}

	get engine(): TableEngine {
		return this._engine;
	}
}
