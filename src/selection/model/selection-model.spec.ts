import { CellModel, CellRange } from '../../cell';
import { SelectionModel } from './selection-model';
import { fillOptions } from '../../options';
import { ISelection } from '../selection';

describe('Primary selection management', () => {
	test('first added selection is automatically primary selection', () => {
		// given: A simple cell model
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

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// when: a selection is added for the first time
		const selection = {
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
		};
		selectionModel.addSelection(selection, false, false);

		// then: the selection is the primary selection
		expect(selectionModel.getPrimary()).toStrictEqual(selection);
	});
	test('no primary selection', () => {
		// given: A simple cell model
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

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// then: no primary selection is available
		expect(selectionModel.getPrimary()).toBeNull();
	});
	test('select another selection as primary', () => {
		// given: A simple cell model
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

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// and: some selections that are added to the model
		const firstSelection: ISelection = {
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
		};
		const secondSelection: ISelection = {
			initial: {
				row: 4,
				column: 5,
			},
			range: {
				startRow: 4,
				endRow: 4,
				startColumn: 5,
				endColumn: 5,
			},
		};
		const thirdSelection: ISelection = {
			initial: {
				row: 3,
				column: 3,
			},
			range: {
				startRow: 3,
				endRow: 3,
				startColumn: 3,
				endColumn: 3,
			},
		};
		selectionModel.addSelection(firstSelection, false, false);
		selectionModel.addSelection(secondSelection, false, false);
		selectionModel.addSelection(thirdSelection, false, false);

		// when: the primary selection is changed to the second selection
		selectionModel.setPrimary(1);

		// then: the second selection is retrieved as primary selection
		expect(selectionModel.getPrimary()).toStrictEqual(secondSelection);

		// and: all three selections can be retrieved
		expect(selectionModel.getSelections().length).toBe(3);
		expect(selectionModel.getSelections()[0]).toStrictEqual(firstSelection);
		expect(selectionModel.getSelections()[1]).toStrictEqual(
			secondSelection
		);
		expect(selectionModel.getSelections()[2]).toStrictEqual(thirdSelection);
	});
});

describe('Validate selections', () => {
	test('validate invalid selection', () => {
		// given: A simple cell model
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
			startRow: 2,
			endRow: 3,
			startColumn: 2,
			endColumn: 3,
		});

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// when: an invalid selection (range does not encompass a whole merged cell) is added to the model
		selectionModel.addSelection(
			{
				initial: {
					row: 3,
					column: 1,
				},
				range: {
					startRow: 3,
					endRow: 3,
					startColumn: 1,
					endColumn: 2,
				},
			},
			true,
			false
		);

		// then: the selection is added to the model but adjusted to encompass the merged cell
		expect(selectionModel.getPrimary()).toBeDefined();
		expect(selectionModel.getPrimary()).toStrictEqual({
			initial: {
				row: 3,
				column: 1,
			},
			range: {
				startRow: 2,
				endRow: 3,
				startColumn: 1,
				endColumn: 3,
			},
		});
	});
	test('dont validate selection when passed false', () => {
		// given: A simple cell model
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
			startRow: 2,
			endRow: 3,
			startColumn: 2,
			endColumn: 3,
		});

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// when: an invalid selection (range does not encompass a whole merged cell) is added to the model
		selectionModel.addSelection(
			{
				initial: {
					row: 3,
					column: 1,
				},
				range: {
					startRow: 3,
					endRow: 3,
					startColumn: 1,
					endColumn: 2,
				},
			},
			false,
			false
		);

		// then: the selection is added to the model but not adjusted to encompass the merged cell
		expect(selectionModel.getPrimary()).toBeDefined();
		expect(selectionModel.getPrimary()).toStrictEqual({
			initial: {
				row: 3,
				column: 1,
			},
			range: {
				startRow: 3,
				endRow: 3,
				startColumn: 1,
				endColumn: 2,
			},
		});
	});
});

describe('Subtract selections', () => {
	test('subtract in the center of a cell range', () => {
		// given: A simple cell model
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

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// and: a selection to subtract from
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 1,
					endColumn: 4,
				},
			},
			false,
			false
		);

		// when: another selection is added in the center of the first selection
		selectionModel.addSelection(
			{
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 2,
					endRow: 3,
					startColumn: 2,
					endColumn: 3,
				},
			},
			true,
			true
		);

		// then: the selection model now contains 4 separate selections that contain only the outermost cells of the initial selection
		expect(selectionModel.getSelections().length).toBe(4);
		expect(selectionModel.getSelections()[0]).toStrictEqual({
			initial: {
				row: 1,
				column: 1,
			},
			range: {
				startRow: 1,
				endRow: 1,
				startColumn: 1,
				endColumn: 4,
			},
		});
		expect(selectionModel.getSelections()[1]).toStrictEqual({
			range: {
				startRow: 2,
				endRow: 3,
				startColumn: 1,
				endColumn: 1,
			},
		});
		expect(selectionModel.getSelections()[2]).toStrictEqual({
			range: {
				startRow: 2,
				endRow: 3,
				startColumn: 4,
				endColumn: 4,
			},
		});
		expect(selectionModel.getSelections()[3]).toStrictEqual({
			range: {
				startRow: 4,
				endRow: 4,
				startColumn: 1,
				endColumn: 4,
			},
		});
	});
	test('subtract full height from the left', () => {
		// given: A simple cell model
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

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// and: a selection to subtract from
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 1,
					endColumn: 4,
				},
			},
			false,
			false
		);

		// when: another selection is added to the left of the first selection
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 1,
					endColumn: 1,
				},
			},
			true,
			true
		);

		// then: the selection model now contains a smaller selection than the initial one (first column cut)
		expect(selectionModel.getSelections().length).toBe(1);
		expect(selectionModel.getSelections()[0]).toStrictEqual({
			initial: {
				row: 1,
				column: 2,
			},
			range: {
				startRow: 1,
				endRow: 4,
				startColumn: 2,
				endColumn: 4,
			},
		});
	});
	test('subtract full height from the right', () => {
		// given: A simple cell model
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

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// and: a selection to subtract from
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 1,
					endColumn: 4,
				},
			},
			false,
			false
		);

		// when: another selection is added to the right of the first selection
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 4,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 4,
					endColumn: 4,
				},
			},
			true,
			true
		);

		// then: the selection model now contains a smaller selection than the initial one (last column cut)
		expect(selectionModel.getSelections().length).toBe(1);
		expect(selectionModel.getSelections()[0]).toStrictEqual({
			initial: {
				row: 1,
				column: 1,
			},
			range: {
				startRow: 1,
				endRow: 4,
				startColumn: 1,
				endColumn: 3,
			},
		});
	});
	test('subtract full width from the top', () => {
		// given: A simple cell model
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

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// and: a selection to subtract from
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 1,
					endColumn: 4,
				},
			},
			false,
			false
		);

		// when: another selection is added to the top of the first selection
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 1,
					startColumn: 1,
					endColumn: 4,
				},
			},
			true,
			true
		);

		// then: the selection model now contains a smaller selection than the initial one (first row cut)
		expect(selectionModel.getSelections().length).toBe(1);
		expect(selectionModel.getSelections()[0]).toStrictEqual({
			initial: {
				row: 2,
				column: 1,
			},
			range: {
				startRow: 2,
				endRow: 4,
				startColumn: 1,
				endColumn: 4,
			},
		});
	});
	test('subtract full width from the bottom', () => {
		// given: A simple cell model
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

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// and: a selection to subtract from
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 1,
					endColumn: 4,
				},
			},
			false,
			false
		);

		// when: another selection is added to the bottom of the first selection
		selectionModel.addSelection(
			{
				initial: {
					row: 4,
					column: 1,
				},
				range: {
					startRow: 4,
					endRow: 4,
					startColumn: 1,
					endColumn: 4,
				},
			},
			true,
			true
		);

		// then: the selection model now contains a smaller selection than the initial one (last row cut)
		expect(selectionModel.getSelections().length).toBe(1);
		expect(selectionModel.getSelections()[0]).toStrictEqual({
			initial: {
				row: 1,
				column: 1,
			},
			range: {
				startRow: 1,
				endRow: 3,
				startColumn: 1,
				endColumn: 4,
			},
		});
	});
	test('subtract lower left corner', () => {
		// given: A simple cell model
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

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// and: a selection to subtract from
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 1,
					endColumn: 4,
				},
			},
			false,
			false
		);

		// when: another selection is added to the lower left corner of the first selection
		selectionModel.addSelection(
			{
				initial: {
					row: 3,
					column: 1,
				},
				range: {
					startRow: 3,
					endRow: 4,
					startColumn: 1,
					endColumn: 2,
				},
			},
			true,
			true
		);

		// then: the selection model now contains two selections without the lower left corner
		expect(selectionModel.getSelections().length).toBe(2);
		expect(selectionModel.getSelections()[0]).toStrictEqual({
			initial: {
				row: 1,
				column: 1,
			},
			range: {
				startRow: 1,
				endRow: 2,
				startColumn: 1,
				endColumn: 4,
			},
		});
		expect(selectionModel.getSelections()[1]).toStrictEqual({
			range: {
				startRow: 3,
				endRow: 4,
				startColumn: 3,
				endColumn: 4,
			},
		});
	});
	test('subtract upper left corner', () => {
		// given: A simple cell model
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

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// and: a selection to subtract from
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 1,
					endColumn: 4,
				},
			},
			false,
			false
		);

		// when: another selection is added to the upper left corner of the first selection
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 1,
					startColumn: 1,
					endColumn: 1,
				},
			},
			true,
			true
		);

		// then: the selection model now contains two selections without the upper left corner
		expect(selectionModel.getSelections().length).toBe(2);
		expect(selectionModel.getSelections()[0]).toStrictEqual({
			initial: {
				row: 1,
				column: 2,
			},
			range: {
				startRow: 1,
				endRow: 1,
				startColumn: 2,
				endColumn: 4,
			},
		});
		expect(selectionModel.getSelections()[1]).toStrictEqual({
			range: {
				startRow: 2,
				endRow: 4,
				startColumn: 1,
				endColumn: 4,
			},
		});
	});
	test('subtract cell on the side', () => {
		// given: A simple cell model
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

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// and: a selection to subtract from
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 1,
					endColumn: 4,
				},
			},
			false,
			false
		);

		// when: another selection is added to the side of the first selection
		selectionModel.addSelection(
			{
				initial: {
					row: 3,
					column: 3,
				},
				range: {
					startRow: 3,
					endRow: 3,
					startColumn: 4,
					endColumn: 4,
				},
			},
			true,
			true
		);

		// then: the selection model now contains three selections without the cell on the side
		expect(selectionModel.getSelections().length).toBe(3);
		expect(selectionModel.getSelections()[0]).toStrictEqual({
			initial: {
				row: 1,
				column: 1,
			},
			range: {
				startRow: 1,
				endRow: 2,
				startColumn: 1,
				endColumn: 4,
			},
		});
		expect(selectionModel.getSelections()[1]).toStrictEqual({
			range: {
				startRow: 3,
				endRow: 3,
				startColumn: 1,
				endColumn: 3,
			},
		});
		expect(selectionModel.getSelections()[2]).toStrictEqual({
			range: {
				startRow: 4,
				endRow: 4,
				startColumn: 1,
				endColumn: 4,
			},
		});
	});
	test('should not subtract when the second selection is not contained in the first', () => {
		// given: A simple cell model
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

		// and: a selection model
		const selectionModel = new SelectionModel(cellModel, fillOptions({}));

		// and: a selection to subtract from
		selectionModel.addSelection(
			{
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 4,
					startColumn: 1,
					endColumn: 4,
				},
			},
			false,
			false
		);

		// when: another selection that is not contained in the first
		selectionModel.addSelection(
			{
				initial: {
					row: 0,
					column: 2,
				},
				range: {
					startRow: 0,
					endRow: 4,
					startColumn: 2,
					endColumn: 2,
				},
			},
			true,
			true
		);

		// then: the selection model now contains the two selections as added before
		expect(selectionModel.getSelections().length).toBe(2);
		expect(selectionModel.getSelections()[0]).toStrictEqual({
			initial: {
				row: 1,
				column: 1,
			},
			range: {
				startRow: 1,
				endRow: 4,
				startColumn: 1,
				endColumn: 4,
			},
		});
		expect(selectionModel.getSelections()[1]).toStrictEqual({
			initial: {
				row: 0,
				column: 2,
			},
			range: {
				startRow: 0,
				endRow: 4,
				startColumn: 2,
				endColumn: 2,
			},
		});
	});
});

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
	describe('at table boundary', () => {
		test('should not change selection at table boundary moving to the top', () => {
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

			// and: a selection model with a selection at row 0 and column 1
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 0,
						column: 1,
					},
					range: {
						startRow: 0,
						endRow: 0,
						startColumn: 1,
						endColumn: 1,
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

			// then: the selection should not have been changed
			expect(changed).toBeFalsy();

			// and: the new selections cell range is actually not changed
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 0,
					column: 1,
				},
				range: {
					startRow: 0,
					endRow: 0,
					startColumn: 1,
					endColumn: 1,
				},
			});
		});
		test('should not change selection at table boundary moving to the bottom', () => {
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

			// and: a selection model with a selection at row 5 and column 1
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 5,
						column: 1,
					},
					range: {
						startRow: 5,
						endRow: 5,
						startColumn: 1,
						endColumn: 1,
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

			// then: the selection should not have been changed
			expect(changed).toBeFalsy();

			// and: the new selections cell range is actually not changed
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 5,
					column: 1,
				},
				range: {
					startRow: 5,
					endRow: 5,
					startColumn: 1,
					endColumn: 1,
				},
			});
		});
		test('should not change selection at table boundary moving to the left', () => {
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

			// and: a selection model with a selection at row 1 and column 0
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 1,
						column: 0,
					},
					range: {
						startRow: 1,
						endRow: 1,
						startColumn: 0,
						endColumn: 0,
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

			// then: the selection should not have been changed
			expect(changed).toBeFalsy();

			// and: the new selections cell range is actually not changed
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 1,
					column: 0,
				},
				range: {
					startRow: 1,
					endRow: 1,
					startColumn: 0,
					endColumn: 0,
				},
			});
		});
		test('should not change selection at table boundary moving to the right', () => {
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

			// and: a selection model with a selection at row 1 and column 5
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
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

			// then: the selection should not have been changed
			expect(changed).toBeFalsy();

			// and: the new selections cell range is actually not changed
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
	});
});

describe('[SelectionModel.extendSelection]', () => {
	describe('normal extend without merged cells', () => {
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

			// when: the selection is extended to the top
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				-1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended by one row
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 1,
					endRow: 2,
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

			// when: the selection is extended to the bottom
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended by one row
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 2,
					endRow: 3,
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

			// when: the selection is extended to the left
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				-1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended by one row
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 2,
					endRow: 2,
					startColumn: 1,
					endColumn: 2,
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

			// when: the selection is extended to the right
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended by one row
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 2,
					endRow: 2,
					startColumn: 2,
					endColumn: 3,
				},
			});
		});
	});
	describe('normal shrink without merged cells', () => {
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

			// and: a selection model with a selection that is able to shrink
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
						endRow: 3,
						startColumn: 2,
						endColumn: 2,
					},
				},
				false,
				false
			);

			// when: the selection is extended/shrunken to the top
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				-1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be shrunken by one row
			expect(selectionModel.getPrimary()).toStrictEqual({
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

			// and: a selection model with a shrinkable selection
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
						startRow: 2,
						endRow: 3,
						startColumn: 2,
						endColumn: 2,
					},
				},
				false,
				false
			);

			// when: the selection is extended/shrunken to the bottom
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended by one row
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

			// and: a selection model with a shrinkable selection
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
						endColumn: 3,
					},
				},
				false,
				false
			);

			// when: the selection is extended/shrunken to the left
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				-1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended by one row
			expect(selectionModel.getPrimary()).toStrictEqual({
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

			// and: a selection model with a shrinkable selection
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 2,
						column: 3,
					},
					range: {
						startRow: 2,
						endRow: 2,
						startColumn: 2,
						endColumn: 3,
					},
				},
				false,
				false
			);

			// when: the selection is extended/shrunken to the right
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended by one row
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
	describe('jump extend without merged cells', () => {
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

			// when: the selection is jump extended to the top
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				-1,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended until row 0
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 0,
					endRow: 2,
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

			// when: the selection is jump extended to the bottom
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				1,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended until row 5
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 2,
					endRow: 5,
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

			// when: the selection is jump extended to the left
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				-1,
				0,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended until column 0
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 2,
					endRow: 2,
					startColumn: 0,
					endColumn: 2,
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

			// when: the selection is jump extended to the right
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				1,
				0,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended until column 5
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 2,
					endRow: 2,
					startColumn: 2,
					endColumn: 5,
				},
			});
		});
	});
	describe('jump shrink without merged cells', () => {
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

			// and: a selection model with a selection that is able to shrink
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
						endRow: 4,
						startColumn: 2,
						endColumn: 2,
					},
				},
				false,
				false
			);

			// when: the selection is extended/shrunken to the top
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				-1,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be shrunken until the initial cell
			expect(selectionModel.getPrimary()).toStrictEqual({
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

			// and: a selection model with a shrinkable selection
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
						startRow: 2,
						endRow: 4,
						startColumn: 2,
						endColumn: 2,
					},
				},
				false,
				false
			);

			// when: the selection is extended/shrunken to the bottom
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				1,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended/shrunken until the initial cell is found
			expect(selectionModel.getPrimary()).toStrictEqual({
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

			// and: a selection model with a shrinkable selection
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
						endColumn: 4,
					},
				},
				false,
				false
			);

			// when: the selection is extended/shrunken to the left
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				-1,
				0,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended/shrunken
			expect(selectionModel.getPrimary()).toStrictEqual({
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

			// and: a selection model with a shrinkable selection
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 2,
						column: 4,
					},
					range: {
						startRow: 2,
						endRow: 2,
						startColumn: 2,
						endColumn: 4,
					},
				},
				false,
				false
			);

			// when: the selection is extended/shrunken to the right
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				1,
				0,
				true
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be shrunken until the initial cell is found
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 4,
				},
				range: {
					startRow: 2,
					endRow: 2,
					startColumn: 4,
					endColumn: 4,
				},
			});
		});
	});
	describe('at table boundary', () => {
		test('should not change selection at table boundary extending to the top', () => {
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

			// and: a selection model with a selection at row 0 and column 1
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 0,
						column: 1,
					},
					range: {
						startRow: 0,
						endRow: 0,
						startColumn: 1,
						endColumn: 1,
					},
				},
				false,
				false
			);

			// when: the selection is moved to the top
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				-1,
				false
			);

			// then: the selection should not have been changed
			expect(changed).toBeFalsy();

			// and: the new selections cell range is actually not changed
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 0,
					column: 1,
				},
				range: {
					startRow: 0,
					endRow: 0,
					startColumn: 1,
					endColumn: 1,
				},
			});
		});
		test('should not change selection at table boundary extending to the bottom', () => {
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

			// and: a selection model with a selection at row 5 and column 1
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 5,
						column: 1,
					},
					range: {
						startRow: 5,
						endRow: 5,
						startColumn: 1,
						endColumn: 1,
					},
				},
				false,
				false
			);

			// when: the selection is moved to the bottom
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				1,
				false
			);

			// then: the selection should not have been changed
			expect(changed).toBeFalsy();

			// and: the new selections cell range is actually not changed
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 5,
					column: 1,
				},
				range: {
					startRow: 5,
					endRow: 5,
					startColumn: 1,
					endColumn: 1,
				},
			});
		});
		test('should not change selection at table boundary extending to the left', () => {
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

			// and: a selection model with a selection at row 1 and column 0
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 1,
						column: 0,
					},
					range: {
						startRow: 1,
						endRow: 1,
						startColumn: 0,
						endColumn: 0,
					},
				},
				false,
				false
			);

			// when: the selection is moved to the left
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				-1,
				0,
				false
			);

			// then: the selection should not have been changed
			expect(changed).toBeFalsy();

			// and: the new selections cell range is actually not changed
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 1,
					column: 0,
				},
				range: {
					startRow: 1,
					endRow: 1,
					startColumn: 0,
					endColumn: 0,
				},
			});
		});
		test('should not change selection at table boundary extending to the right', () => {
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

			// and: a selection model with a selection at row 1 and column 5
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
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
				},
				false,
				false
			);

			// when: the selection is moved to the right
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				1,
				0,
				false
			);

			// then: the selection should not have been changed
			expect(changed).toBeFalsy();

			// and: the new selections cell range is actually not changed
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
	});
	describe('extend with merged cells', () => {
		test('extend to merged cell on the right', () => {
			// given: A simple cell model with merged cells
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
				endRow: 3,
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

			// when: the selection is extended to the right
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended with the merged cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 1,
					endRow: 3,
					startColumn: 2,
					endColumn: 4,
				},
			});
		});
		test('extend to merged cell on the left', () => {
			// given: A simple cell model with merged cells
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
				endRow: 3,
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

			// when: the selection is extended to the left
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				-1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended with the merged cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 5,
				},
				range: {
					startRow: 1,
					endRow: 3,
					startColumn: 3,
					endColumn: 5,
				},
			});
		});
		test('extend to merged cell on the top', () => {
			// given: A simple cell model with merged cells
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
				startRow: 2,
				endRow: 3,
				startColumn: 1,
				endColumn: 3,
			});

			// and: a selection model with a selection at row 4 and column 2
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

			// when: the selection is extended to the top
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				-1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended with the merged cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 4,
					column: 2,
				},
				range: {
					startRow: 2,
					endRow: 4,
					startColumn: 1,
					endColumn: 3,
				},
			});
		});
		test('extend to merged cell on the bottom', () => {
			// given: A simple cell model with merged cells
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
				startRow: 2,
				endRow: 3,
				startColumn: 1,
				endColumn: 3,
			});

			// and: a selection model with a selection at row 1 and column 2
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
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
				},
				false,
				false
			);

			// when: the selection is extended to the bottom
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should be extended with the merged cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 1,
					column: 2,
				},
				range: {
					startRow: 1,
					endRow: 3,
					startColumn: 1,
					endColumn: 3,
				},
			});
		});
		test('extend from merged cell', () => {
			// given: A simple cell model with merged cells
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

			// and: a selection model with a selection of the first merged cell
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 1,
						column: 1,
					},
					range: {
						startRow: 1,
						endRow: 2,
						startColumn: 1,
						endColumn: 2,
					},
				},
				false,
				false
			);

			// when: the selection is extended to the right
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should include both merged cells
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 3,
					startColumn: 1,
					endColumn: 4,
				},
			});
		});
	});
	describe('shrink with merged cells', () => {
		test('shrink to the left', () => {
			// given: A simple cell model with merged cells
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
				endRow: 3,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with an initial selection at row 2 and column 2 + merged cell
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
						startRow: 1,
						endRow: 3,
						startColumn: 2,
						endColumn: 4,
					},
				},
				false,
				false
			);

			// when: the selection is shrunken to the left
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				-1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should only contain the column of the initial cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 2,
				},
				range: {
					startRow: 1,
					endRow: 3,
					startColumn: 2,
					endColumn: 2,
				},
			});
		});
		test('shrink to the right', () => {
			// given: A simple cell model with merged cells
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
				endRow: 3,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with an initial selection at row 2 and column 5 + merged cell
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
						startRow: 1,
						endRow: 3,
						startColumn: 3,
						endColumn: 5,
					},
				},
				false,
				false
			);

			// when: the selection is shrunken to the right
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should only contain the column of the initial cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 2,
					column: 5,
				},
				range: {
					startRow: 1,
					endRow: 3,
					startColumn: 5,
					endColumn: 5,
				},
			});
		});
		test('shrink to the bottom', () => {
			// given: A simple cell model with merged cells
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
				startRow: 2,
				endRow: 3,
				startColumn: 1,
				endColumn: 3,
			});

			// and: a selection model with an initial selection at row 4 and column 2 + merged cell
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
						startRow: 2,
						endRow: 4,
						startColumn: 1,
						endColumn: 3,
					},
				},
				false,
				false
			);

			// when: the selection is shrunken to the bottom
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should only contain the row of the initial cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 4,
					column: 2,
				},
				range: {
					startRow: 4,
					endRow: 4,
					startColumn: 1,
					endColumn: 3,
				},
			});
		});
		test('shrink to the top', () => {
			// given: A simple cell model with merged cells
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
				startRow: 2,
				endRow: 3,
				startColumn: 1,
				endColumn: 3,
			});

			// and: a selection model with an initial selection at row 1 and column 2 + merged cell
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 1,
						column: 2,
					},
					range: {
						startRow: 1,
						endRow: 3,
						startColumn: 1,
						endColumn: 3,
					},
				},
				false,
				false
			);

			// when: the selection is extended to the bottom
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				-1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should only include the row of the initial cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 1,
					column: 2,
				},
				range: {
					startRow: 1,
					endRow: 1,
					startColumn: 1,
					endColumn: 3,
				},
			});
		});
		test('shrink to the left where initial cell is not in same row as merged cell', () => {
			// given: A simple cell model with merged cells
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
				endRow: 3,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with an initial selection at row 5 and column 1 + merged cell
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 5,
						column: 2,
					},
					range: {
						startRow: 1,
						endRow: 5,
						startColumn: 2,
						endColumn: 4,
					},
				},
				false,
				false
			);

			// when: the selection is shrunken to the left
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				-1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should only contain the column of the initial cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 5,
					column: 2,
				},
				range: {
					startRow: 1,
					endRow: 5,
					startColumn: 2,
					endColumn: 2,
				},
			});
		});
		test('shrink to the right where initial cell is not in same row as merged cell', () => {
			// given: A simple cell model with merged cells
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
				endRow: 3,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with an initial selection at row 5 and column 1 + merged cell
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 5,
						column: 5,
					},
					range: {
						startRow: 1,
						endRow: 5,
						startColumn: 3,
						endColumn: 5,
					},
				},
				false,
				false
			);

			// when: the selection is shrunken to the right
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should only contain the column of the initial cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 5,
					column: 5,
				},
				range: {
					startRow: 1,
					endRow: 5,
					startColumn: 5,
					endColumn: 5,
				},
			});
		});
		test('shrink to the bottom where initial cell is not in same row as merged cell', () => {
			// given: A simple cell model with merged cells
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
				endRow: 3,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with an initial selection at row 5 and column 1 + merged cell
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 5,
						column: 5,
					},
					range: {
						startRow: 1,
						endRow: 5,
						startColumn: 3,
						endColumn: 5,
					},
				},
				false,
				false
			);

			// when: the selection is shrunken to the bottom
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should only contain the column of the initial cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 5,
					column: 5,
				},
				range: {
					startRow: 4,
					endRow: 5,
					startColumn: 3,
					endColumn: 5,
				},
			});
		});
		test('shrink to the top where initial cell is not in same row as merged cell', () => {
			// given: A simple cell model with merged cells
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
				endRow: 3,
				startColumn: 3,
				endColumn: 4,
			});

			// and: a selection model with an initial selection at row 5 and column 1 + merged cell
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 0,
						column: 2,
					},
					range: {
						startRow: 0,
						endRow: 3,
						startColumn: 2,
						endColumn: 5,
					},
				},
				false,
				false
			);

			// when: the selection is shrunken to the top
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				0,
				-1,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should only contain the row of the initial cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 0,
					column: 2,
				},
				range: {
					startRow: 0,
					endRow: 0,
					startColumn: 2,
					endColumn: 5,
				},
			});
		});
		test('extend from merged cell', () => {
			// given: A simple cell model with merged cells
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

			// and: a selection model with a selection of the first merged cell
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({})
			);
			selectionModel.addSelection(
				{
					initial: {
						row: 1,
						column: 1,
					},
					range: {
						startRow: 1,
						endRow: 2,
						startColumn: 1,
						endColumn: 2,
					},
				},
				false,
				false
			);

			// when: the selection is extended to the right
			const changed = selectionModel.extendSelection(
				selectionModel.getPrimary(),
				1,
				0,
				false
			);

			// then: the selection should have been changed
			expect(changed).toBeTruthy();

			// and: the new selection cell range should include both merged cells
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 3,
					startColumn: 1,
					endColumn: 4,
				},
			});
		});
	});
});

describe('Selection modes', () => {
	describe('Only allow single cell selections', () => {
		test('add only a single cell', () => {
			// given: A simple cell model
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

			// and: a selection model
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({
					selection: {
						allowRangeSelection: false,
					},
				})
			);

			// when: adding a selection spanning a single cell
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

			// then: the selection is only the one cell
			expect(selectionModel.getPrimary()).toStrictEqual({
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
			});
		});
		test('add only the initial cell when a range is added', () => {
			// given: A simple cell model
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

			// and: a selection model
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({
					selection: {
						allowRangeSelection: false,
					},
				})
			);

			// when: trying to add a selection that is bigger than one cell
			selectionModel.addSelection(
				{
					initial: {
						row: 1,
						column: 1,
					},
					range: {
						startRow: 1,
						endRow: 2,
						startColumn: 1,
						endColumn: 2,
					},
				},
				false,
				false
			);

			// then: the selection is only the initial cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 1,
					startColumn: 1,
					endColumn: 1,
				},
			});
		});
		test('should not allow extending the selection', () => {
			// given: A simple cell model
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

			// and: a selection model
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({
					selection: {
						allowRangeSelection: false,
					},
				})
			);

			// and: a simple one-cell selection
			selectionModel.addSelection(
				{
					initial: {
						row: 1,
						column: 1,
					},
					range: {
						startRow: 1,
						endRow: 1,
						startColumn: 1,
						endColumn: 1,
					},
				},
				false,
				false
			);

			// when: the selection is extended to the right
			selectionModel.extendSelection(
				selectionModel.getPrimary(),
				1,
				0,
				false
			);

			// then: the selection is still only the single cell
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 1,
					startColumn: 1,
					endColumn: 1,
				},
			});
		});
	});
	describe('Only allow selection of a single cell range', () => {
		test('should replace the primary selection when selecting another range', () => {
			// given: A simple cell model
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

			// and: a selection model
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({
					selection: {
						allowMultiSelection: false,
					},
				})
			);

			// and: a selection
			selectionModel.addSelection(
				{
					initial: {
						row: 1,
						column: 1,
					},
					range: {
						startRow: 1,
						endRow: 2,
						startColumn: 1,
						endColumn: 2,
					},
				},
				false,
				false
			);

			// when: another selection is added
			selectionModel.addSelection(
				{
					initial: {
						row: 3,
						column: 3,
					},
					range: {
						startRow: 3,
						endRow: 4,
						startColumn: 3,
						endColumn: 4,
					},
				},
				false,
				false
			);

			// then: there is still only one selection
			expect(selectionModel.getSelections().length).toBe(1);

			// and: the primary selection is the second added
			expect(selectionModel.getPrimary()).toStrictEqual({
				initial: {
					row: 3,
					column: 3,
				},
				range: {
					startRow: 3,
					endRow: 4,
					startColumn: 3,
					endColumn: 4,
				},
			});
		});
	});
	describe('Allow selection of multiple cell ranges', () => {
		test('should allow multiple cell ranges selected', () => {
			// given: A simple cell model
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

			// and: a selection model
			const selectionModel = new SelectionModel(
				cellModel,
				fillOptions({
					selection: {
						allowMultiSelection: true,
					},
				})
			);

			// and: a selection
			selectionModel.addSelection(
				{
					initial: {
						row: 1,
						column: 1,
					},
					range: {
						startRow: 1,
						endRow: 2,
						startColumn: 1,
						endColumn: 2,
					},
				},
				false,
				false
			);

			// when: another selection is added
			selectionModel.addSelection(
				{
					initial: {
						row: 3,
						column: 3,
					},
					range: {
						startRow: 3,
						endRow: 4,
						startColumn: 3,
						endColumn: 4,
					},
				},
				false,
				false
			);

			// then: there are two selections in the model
			expect(selectionModel.getSelections().length).toBe(2);
			expect(selectionModel.getSelections()[0]).toStrictEqual({
				initial: {
					row: 1,
					column: 1,
				},
				range: {
					startRow: 1,
					endRow: 2,
					startColumn: 1,
					endColumn: 2,
				},
			});
			expect(selectionModel.getSelections()[1]).toStrictEqual({
				initial: {
					row: 3,
					column: 3,
				},
				range: {
					startRow: 3,
					endRow: 4,
					startColumn: 3,
					endColumn: 4,
				},
			});
		});
	});
});
