import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	ViewChild,
} from '@angular/core';
import {
	CellModel,
	CellRange,
	CheckboxCellRenderer,
	ComboBoxCellRenderer,
	DOMCellRenderer,
	HorizontalAlignment,
	ICheckboxCellRendererValue,
	IComboBoxCellRendererValue,
	IImageCellRendererValue,
	ImageCellRenderer,
	IRatingCellRendererValue,
	ITextCellRendererValue,
	RatingCellRenderer,
	ROW_COLUMN_HEADER_TRANSFORM,
	RowColumnHeaderRenderer,
	TableEngine,
	TextCellRenderer,
	VerticalAlignment,
} from 'table-engine/lib';

@Component({
	selector: 'app-cell-renderer',
	templateUrl: 'cell-renderer.component.html',
	styleUrls: ['cell-renderer.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CellRendererComponent {
	codeSamples = {
		registerCellRenderer: `\
const engine = new TableEngine(...);

engine.registerCellRenderer(
	new TextCellRenderer({
		horizontalAlignment: HorizontalAlignment.CENTER,
	})
);
engine.registerCellRenderer(new RowColumnHeaderRenderer());
engine.registerCellRenderer(new CheckboxCellRenderer());
engine.registerCellRenderer(new ComboBoxCellRenderer());
engine.registerCellRenderer(new DOMCellRenderer());
engine.registerCellRenderer(new ImageCellRenderer());
engine.registerCellRenderer(new RatingCellRenderer());

engine.initialize();`,
		usingCellRenderer: `\
const cellModel = CellModel.generate(
	[
		{
			range: CellRange.fromSingleRowColumn(8, 2),
			rendererName: TextCellRenderer.NAME,
			value: DOMCellRenderer.NAME,
		},
		{
			range: {
				startRow: 8,
				endRow: 14,
				startColumn: 3,
				endColumn: 3,
			},
			rendererName: DOMCellRenderer.NAME,
			value: \`<p>I can render <strong>HTML!</strong></p>
<ul>
<li>List item 1</li>
<li>List item 2</li>
<li>List item 3 with <button onclick='alert("I have been clicked!")'>a button!</button></li>
</ul>\`,
		}
	],
	(row, column) => null,
	(row, column) => {
		if (row === 0 || column === 0) {
			return RowColumnHeaderRenderer.NAME;
		} else {
			return TextCellRenderer.NAME;
		}
	},
	(row) => 25,
	(column) => (column === 0 ? 50 : 120),
	new Set(),
	new Set()
);`,
		exampleCellRendererStart: `\
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
    ): void {}
}`,
		exampleCellRendererRenderMethod: `\
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
`,
	};

	@ViewChild('tableContainer')
	tableContainer!: ElementRef;

	ngAfterViewInit(): void {
		this._setupTableWithAllCellRenderers();
	}

	private _setupTableWithAllCellRenderers() {
		const cellModel = CellModel.generate(
			[
				{
					range: CellRange.fromSingleRowColumn(2, 2),
					rendererName: TextCellRenderer.NAME,
					value: {
						text: 'Name',
						options: {
							fontSize: 16,
						},
					} as ITextCellRendererValue,
				},
				{
					range: {
						startRow: 2,
						endRow: 2,
						startColumn: 3,
						endColumn: 3,
					},
					rendererName: TextCellRenderer.NAME,
					value: {
						text: 'Example',
						options: {
							fontSize: 16,
						},
					} as ITextCellRendererValue,
				},
				{
					range: CellRange.fromSingleRowColumn(3, 2),
					rendererName: TextCellRenderer.NAME,
					value: TextCellRenderer.NAME,
				},
				{
					range: {
						startRow: 3,
						endRow: 5,
						startColumn: 3,
						endColumn: 3,
					},
					rendererName: TextCellRenderer.NAME,
					value: {
						text: 'This example of the text cell renderer is able to wrap text that is too long to fit into the current line. Try it out by resizing the column.!',
						options: {
							useLineWrapping: true,
							horizontalAlignment: HorizontalAlignment.LEFT,
							verticalAlignment: VerticalAlignment.TOP,
						},
					} as ITextCellRendererValue,
				},
				{
					range: CellRange.fromSingleRowColumn(6, 2),
					rendererName: TextCellRenderer.NAME,
					value: CheckboxCellRenderer.NAME,
				},
				{
					range: CellRange.fromSingleRowColumn(6, 3),
					rendererName: CheckboxCellRenderer.NAME,
					value: {
						label: 'Label',
						checked: true,
					} as ICheckboxCellRendererValue,
				},
				{
					range: CellRange.fromSingleRowColumn(7, 2),
					rendererName: TextCellRenderer.NAME,
					value: ComboBoxCellRenderer.NAME,
				},
				{
					range: CellRange.fromSingleRowColumn(7, 3),
					rendererName: ComboBoxCellRenderer.NAME,
					value: {
						select_options: {
							banana: { label: 'Banana' },
							apple: { label: 'Apple' },
							orange: { label: 'Orange' },
						},
					} as IComboBoxCellRendererValue,
				},
				{
					range: CellRange.fromSingleRowColumn(8, 2),
					rendererName: TextCellRenderer.NAME,
					value: DOMCellRenderer.NAME,
				},
				{
					range: {
						startRow: 8,
						endRow: 14,
						startColumn: 3,
						endColumn: 3,
					},
					rendererName: DOMCellRenderer.NAME,
					value: `<p>I can render <strong>HTML!</strong></p>
<ul>
	<li>List item 1</li>
	<li>List item 2</li>
	<li>List item 3 with <button onclick='alert("I have been clicked!")'>a button!</button></li>
</ul>`,
				},
				{
					range: CellRange.fromSingleRowColumn(15, 2),
					rendererName: TextCellRenderer.NAME,
					value: RowColumnHeaderRenderer.NAME,
				},
				{
					range: CellRange.fromSingleRowColumn(15, 3),
					rendererName: RowColumnHeaderRenderer.NAME,
					value: null,
				},
				{
					range: CellRange.fromSingleRowColumn(16, 2),
					rendererName: TextCellRenderer.NAME,
					value: ImageCellRenderer.NAME,
				},
				{
					range: {
						startRow: 16,
						endRow: 20,
						startColumn: 3,
						endColumn: 3,
					},
					rendererName: ImageCellRenderer.NAME,
					value: {
						src: 'assets/logo.svg',
					} as IImageCellRendererValue,
				},
				{
					range: CellRange.fromSingleRowColumn(21, 2),
					rendererName: TextCellRenderer.NAME,
					value: RatingCellRenderer.NAME,
				},
				{
					range: CellRange.fromSingleRowColumn(21, 3),
					rendererName: RatingCellRenderer.NAME,
					value: {
						rating: 3.5,
						options: {
							editable: true,
						},
					} as IRatingCellRendererValue,
				},
				{
					range: CellRange.fromSingleRowColumn(23, 6),
					rendererName: TextCellRenderer.NAME,
					value: 'LAST CELL',
				},
			],
			(row, column) => null,
			(row, column) => {
				if (row === 0 || column === 0) {
					return RowColumnHeaderRenderer.NAME;
				} else {
					return TextCellRenderer.NAME;
				}
			},
			(row) => 25,
			(column) => (column === 0 ? 50 : 120),
			new Set(),
			new Set()
		);

		cellModel.resizeRows([2], 50);
		cellModel.resizeColumns([3], 200);

		const engine = new TableEngine(
			this.tableContainer.nativeElement,
			cellModel
		);

		engine.getOptions().renderer.view.fixedRows = 1;
		engine.getOptions().renderer.view.fixedColumns = 1;

		engine.getOptions().selection.selectionTransform =
			ROW_COLUMN_HEADER_TRANSFORM;

		engine.getOptions().renderer.canvas.rowColumnResizing.allowResizing =
			true;

		engine.registerCellRenderer(
			new TextCellRenderer({
				horizontalAlignment: HorizontalAlignment.CENTER,
			})
		);
		engine.registerCellRenderer(new RowColumnHeaderRenderer());
		engine.registerCellRenderer(new CheckboxCellRenderer());
		engine.registerCellRenderer(new ComboBoxCellRenderer());
		engine.registerCellRenderer(new DOMCellRenderer());
		engine.registerCellRenderer(new ImageCellRenderer());
		engine.registerCellRenderer(new RatingCellRenderer());

		engine.initialize();
	}
}
