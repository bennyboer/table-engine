import { CellModel, CellRange } from '../../cell';
import { SelectionModel } from './selection-model';
import { fillOptions } from '../../options';

describe('[SelectionModel.moveSelection]', () => {
	describe('Normal selection movement', () => {
		test('to the right', () => {
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
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
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
		test('to the top', () => {
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
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
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

			// when: the selection is moved to the top
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				0,
				-1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be at row 1
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 1,
					column: 2,
				},
				range: {
					startRow: 1,
					endRow: 1,
					startColumn: 2,
					endColumn: 2,
				},
			});
		});
		test('to the left', () => {
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
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
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

			// when: the selection is moved to the left
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				-1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be at column 1
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 1,
				},
				range: {
					startRow: 2,
					endRow: 2,
					startColumn: 1,
					endColumn: 1,
				},
			});
		});
		test('to the bottom', () => {
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
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
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

			// when: the selection is moved to the bottom
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				0,
				1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be at row 3
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 3,
					column: 2,
				},
				range: {
					startRow: 3,
					endRow: 3,
					startColumn: 2,
					endColumn: 2,
				},
			});
		});
	});
	describe('Jump movement', () => {
		test('to the left', () => {
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
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
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

			// when: the selection is jump moved to the left
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				-1,
				0,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be at column 0
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 0,
				},
				range: {
					startRow: 2,
					endRow: 2,
					startColumn: 0,
					endColumn: 0,
				},
			});
		});
		test('to the right', () => {
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
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
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

			// when: the selection is jump moved to the right
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				1,
				0,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be at column 5
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 5,
				},
				range: {
					startRow: 2,
					endRow: 2,
					startColumn: 5,
					endColumn: 5,
				},
			});
		});
		test('to the top', () => {
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
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
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

			// when: the selection is jump moved to the top
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				0,
				-1,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be at row 0
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 0,
					column: 2,
				},
				range: {
					startRow: 0,
					endRow: 0,
					startColumn: 2,
					endColumn: 2,
				},
			});
		});
		test('to the bottom', () => {
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
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
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

			// when: the selection is jump moved to the bottom
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				0,
				1,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be at row 5
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 5,
					column: 2,
				},
				range: {
					startRow: 5,
					endRow: 5,
					startColumn: 2,
					endColumn: 2,
				},
			});
		});
	});
	describe('With merged cells', () => {
		test('select merged cell to the right', () => {
			// given: A simple cell model with a merged cell
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
			cellModel.mergeCells({
				startRow: 1,
				endRow: 4,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with a selection at row 2 and column 2
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
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

			// and: the new selection cell range should be on the merged cell with the correct initial row 2
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 3,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 3,
					endColumn: 4,
				},
			});
		});
		test('select merged cell to the left', () => {
			// given: A simple cell model with a merged cell
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
			cellModel.mergeCells({
				startRow: 1,
				endRow: 4,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with a selection at row 2 and column 5
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 2,
						column: 5,
					},
					range: {
						startRow: 2,
						endRow: 2,
						startColumn: 5,
						endColumn: 5,
					},
				},
				false,
				false
			);

			// when: the selection is moved to the left
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				-1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be on the merged cell with the correct initial row 2
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 4,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 3,
					endColumn: 4,
				},
			});
		});
		test('select merged cell to the top', () => {
			// given: A simple cell model with a merged cell
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
			cellModel.mergeCells({
				startRow: 1,
				endRow: 4,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with a selection at row 5 and column 4
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 5,
						column: 4,
					},
					range: {
						startRow: 5,
						endRow: 5,
						startColumn: 4,
						endColumn: 4,
					},
				},
				false,
				false
			);

			// when: the selection is moved to the left
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				0,
				-1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be on the merged cell with the correct initial column 4
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 4,
					column: 4,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 3,
					endColumn: 4,
				},
			});
		});
		test('select merged cell to the bottom', () => {
			// given: A simple cell model with a merged cell
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
			cellModel.mergeCells({
				startRow: 1,
				endRow: 4,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with a selection at row 0 and column 4
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 0,
						column: 4,
					},
					range: {
						startRow: 0,
						endRow: 0,
						startColumn: 4,
						endColumn: 4,
					},
				},
				false,
				false
			);

			// when: the selection is moved to the left
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				0,
				1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be on the merged cell with the correct initial column 4
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 1,
					column: 4,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 3,
					endColumn: 4,
				},
			});
		});
		test('should select normal cell from merged cell', () => {
			// given: A simple cell model with a merged cell
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
			cellModel.mergeCells({
				startRow: 1,
				endRow: 4,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with a selection at the merge cell
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 1,
						column: 3,
					},
					range: {
						startRow: 1,
						endRow: 4,
						startColumn: 3,
						endColumn: 4,
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

			// and: the new selection cell range should be on the normal cell to the right
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 1,
					column: 5,
				},
				range: {
					startRow: 1,
					endRow: 1,
					startColumn: 5,
					endColumn: 5,
				},
			});
		});
		test('should select normal cell from merged cell when initial is somewhere else - horizontally', () => {
			// given: A simple cell model with a merged cell
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
			cellModel.mergeCells({
				startRow: 1,
				endRow: 4,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with a selection at the merge cell with initial somewhere else
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 3,
						column: 4,
					},
					range: {
						startRow: 1,
						endRow: 4,
						startColumn: 3,
						endColumn: 4,
					},
				},
				false,
				false
			);

			// when: the selection is moved to the left
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				-1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be on the normal cell to the left
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 3,
					column: 2,
				},
				range: {
					startRow: 3,
					endRow: 3,
					startColumn: 2,
					endColumn: 2,
				},
			});
		});
		test('should select normal cell from merged cell when initial is somewhere else - vertically', () => {
			// given: A simple cell model with a merged cell
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
			cellModel.mergeCells({
				startRow: 3,
				endRow: 4,
				startColumn: 1,
				endColumn: 4,
			});

			// and: a selection model with a selection at the merge cell with initial somewhere else
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 3,
						column: 2,
					},
					range: {
						startRow: 3,
						endRow: 4,
						startColumn: 1,
						endColumn: 4,
					},
				},
				false,
				false
			);

			// when: the selection is moved to the bottom
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				0,
				1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be on the normal cell to the bottom
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 5,
					column: 2,
				},
				range: {
					startRow: 5,
					endRow: 5,
					startColumn: 2,
					endColumn: 2,
				},
			});
		});
		test('move from merged cell to merged cell', () => {
			// given: A simple cell model with a merged cell
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
			cellModel.mergeCells({
				startRow: 1,
				endRow: 2,
				startColumn: 1,
				endColumn: 2,
			});
			cellModel.mergeCells({
				startRow: 2,
				endRow: 3,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with a selection at the merged cell with initial in row 2
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 2,
						column: 1,
					},
					range: {
						startRow: 2,
						endRow: 1,
						startColumn: 1,
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

			// and: the new selection cell range should be on the other merged cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 3,
				},
				range: {
					startRow: 2,
					endRow: 3,
					startColumn: 3,
					endColumn: 4,
				},
			});
		});
		test('jump move to merged cell', () => {
			// given: A simple cell model with a merged cell
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
			cellModel.mergeCells({
				startRow: 0,
				endRow: 1,
				startColumn: 1,
				endColumn: 2,
			});

			// and: a selection model with a selection under the merged cell
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 4,
						column: 2,
					},
					range: {
						startRow: 4,
						endRow: 4,
						startColumn: 2,
						endColumn: 2,
					},
				},
				false,
				false
			);

			// when: the selection is jump moved to the top
			const changed = selectionModel.moveSelection(
				selectionModel.getPrimary(),
				0,
				-1,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be on the merged cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 0,
					column: 2,
				},
				range: {
					startRow: 0,
					endRow: 1,
					startColumn: 1,
					endColumn: 2,
				},
			});
		});
	});
});
