import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	ViewChild,
} from '@angular/core';
import {
	CellModel,
	CellRange,
	HorizontalAlignment,
	ROW_COLUMN_HEADER_TRANSFORM,
	RowColumnHeaderRenderer,
	TableEngine,
	TextCellRenderer,
} from 'table-engine/lib';

@Component({
	selector: 'app-introduction',
	templateUrl: 'introduction.component.html',
	styleUrls: ['introduction.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroductionComponent implements AfterViewInit {
	@ViewChild('tableContainer')
	public tableContainer!: ElementRef;

	ngAfterViewInit(): void {
		this._setupDemo();
	}

	private _setupDemo() {
		const cellModel = CellModel.generate(
			[
				{
					range: CellRange.fromSingleRowColumn(1000, 30),
					rendererName: TextCellRenderer.NAME,
					value: 'LAST CELL',
				},
			],
			(row, column) => row * column,
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
		cellModel.mergeCells({
			startRow: 5,
			endRow: 8,
			startColumn: 4,
			endColumn: 5,
		});

		const engine = new TableEngine(
			this.tableContainer.nativeElement,
			cellModel
		);

		engine.getOptions().renderer.view.fixedRows = 1;
		engine.getOptions().renderer.view.fixedColumns = 1;

		engine.getOptions().selection.selectionTransform =
			ROW_COLUMN_HEADER_TRANSFORM;

		engine.registerCellRenderer(
			new TextCellRenderer({
				horizontalAlignment: HorizontalAlignment.CENTER,
			})
		);
		engine.registerCellRenderer(new RowColumnHeaderRenderer());

		engine.initialize();
	}
}
