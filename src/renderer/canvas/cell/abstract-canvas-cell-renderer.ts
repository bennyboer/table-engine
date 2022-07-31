import { ICanvasCellRenderer } from './canvas-cell-renderer';
import { IRenderContext } from '../canvas-renderer';
import { IRectangle, ISize } from '../../../util';
import { ICell } from '../../../cell';
import { ICellRendererEventListener } from '../../cell';
import { TableEngine } from '../../../table-engine';
import { IButtonCellRendererValue } from './button';

export abstract class AbstractCanvasCellRenderer<V, O, C>
	implements ICanvasCellRenderer
{
	private _engine: TableEngine;

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
		return null;
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
}
