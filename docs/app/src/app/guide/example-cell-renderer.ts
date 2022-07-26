import {
	ICanvasCellRenderer,
	ICell,
	ICellRendererEventListener,
	IRectangle,
	IRenderContext,
	ISize,
	TableEngine,
} from 'table-engine/lib';

export class ExampleCellRenderer implements ICanvasCellRenderer {
	after(ctx: CanvasRenderingContext2D): void {}

	before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {}

	cleanup(): void {}

	estimatePreferredSize(cell: ICell): ISize | null {
		return undefined;
	}

	getCopyValue(cell: ICell): string {
		return '';
	}

	getEventListener(): ICellRendererEventListener | null {
		return null;
	}

	getName(): string {
		return 'EXAMPLE';
	}

	initialize(engine: TableEngine): void {}

	onDisappearing(cell: ICell): void {}

	render(
		ctx: CanvasRenderingContext2D,
		cell: ICell,
		bounds: IRectangle
	): void {
		ctx.fillStyle = 'red';
		ctx.fillRect(
			bounds.left + 4,
			bounds.top + 4,
			bounds.width - 8,
			bounds.height - 8
		);
	}
}
