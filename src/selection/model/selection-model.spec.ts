import { CellModel, CellRange } from '../../cell';
import { SelectionModel } from './selection-model';
import { fillOptions } from '../../options';

describe('[SelectionModel.moveSelection]', () => {
	test('[SelectionModel.moveSelection] Move selection to the right - simple', () => {
		// given: A simple cell model without merged cells
		const cellModel = CellModel.generate(
			[
				{
					range: CellRange.fromSingleRowColumn(5, 5),
					rendererName: 'text',
					value: 'Last cell',
				},
			],
			(row, column) => row * column,
			() => 'text',
			() => 1,
			() => 1,
			new Set<number>(),
			new Set<number>()
		);

		// and: a selection model with a selection at row 2 and column 2
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));
		selectionModel.addSelection(
			{
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 2,
					endRow: 2,
					startColumn: 2,
					endColumn: 2,
				},
			},
			false,
			false
		);

		// when: the selection is moved to the right
		const changed = selectionModel.moveSelection(
			selectionModel.getPrimary(),
			1,
			0,
			false
		);

		// then: the selection should have been changed
		expect(changed).toBeTruthy();

		// and: the new selection cell range should be at column 3
		expect(selectionModel.getPrimary()).toStrictEqual({
			initial: {
				row: 2,
				column: 3,
			},
			range: {
				startRow: 2,
				endRow: 2,
				startColumn: 3,
				endColumn: 3,
			},
		});
	});
	test('[SelectionModel.moveSelection] Move selection to the top - simple', () => {
		// given: A simple cell model without merged cells
		const cellModel = CellModel.generate(
			[
				{
					range: CellRange.fromSingleRowColumn(5, 5),
					rendererName: 'text',
					value: 'Last cell',
				},
			],
			(row, column) => row * column,
			() => 'text',
			() => 1,
			() => 1,
			new Set<number>(),
			new Set<number>()
		);

		// and: a selection model with a selection at row 2 and column 2
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));
		selectionModel.addSelection(
			{
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 2,
					endRow: 2,
					startColumn: 2,
					endColumn: 2,
				},
			},
			false,
			false
		);

		// when: the selection is moved to the right
		const changed = selectionModel.moveSelection(
			selectionModel.getPrimary(),
			1,
			0,
			false
		);

		// then: the selection should have been changed
		expect(changed).toBeTruthy();

		// and: the new selection cell range should be at column 3
		expect(selectionModel.getPrimary()).toStrictEqual({
			initial: {
				row: 2,
				column: 3,
			},
			range: {
				startRow: 2,
				endRow: 2,
				startColumn: 3,
				endColumn: 3,
			},
		});
	});
});
