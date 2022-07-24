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
	TableEngine,
	TextCellRenderer,
} from 'table-engine/lib';

@Component({
	selector: 'app-minimal-example',
	templateUrl: 'minimal-example.component.html',
	styleUrls: ['minimal-example.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinimalExampleComponent implements AfterViewInit {
	@ViewChild('tableContainer')
	public tableContainer!: ElementRef;

	ngAfterViewInit(): void {
		const cellModel = CellModel.generate(
			[
				{
					range: CellRange.fromSingleRowColumn(30, 5),
					rendererName: TextCellRenderer.NAME,
					value: 'LAST CELL',
				},
			],
			(row, column) => row * column,
			(row, column) => TextCellRenderer.NAME,
			(row) => 25,
			(column) => (column === 0 ? 50 : 120),
			new Set(),
			new Set()
		);

		const engine = new TableEngine(
			this.tableContainer.nativeElement,
			cellModel
		);

		engine.registerCellRenderer(new TextCellRenderer());

		engine.initialize();
	}
}
