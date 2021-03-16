import {CellModel} from "./cell-model";
import {CellRange} from "../range/cell-range";

test("[CellModel.generate] Validate row/column sizes - I", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row) => row * 2 + 10,
		(column) => column * 4 + 20,
		new Set<number>(),
		new Set<number>()
	);

	for (let row = 0; row <= 5; row++) {
		const expectedRowSize = row * 2 + 10;
		expect(model.getRowSize(row)).toBe(expectedRowSize);
	}
	for (let column = 0; column <= 5; column++) {
		const expectedColumnSize = column * 4 + 20;
		expect(model.getColumnSize(column)).toBe(expectedColumnSize);
	}
});

test("[CellModel.generate] Validate row/column sizes - II", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	for (let row = 0; row <= 5; row++) {
		expect(model.getRowSize(row)).toBe(30);
	}
	for (let column = 0; column <= 5; column++) {
		expect(model.getColumnSize(column)).toBe(100);
	}

	expect(model.getWidth()).toBe(100 * 6);
	expect(model.getHeight()).toBe(30 * 6);
});

test("[CellModel.generate] Validate row/column offsets", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	expect(model.getRowOffset(0)).toBe(0);
	expect(model.getColumnOffset(0)).toBe(0);

	expect(model.getRowOffset(4)).toBe(30 * 4);
	expect(model.getColumnOffset(3)).toBe(100 * 3);
});

test("[CellModel.generate] Validate row/column offsets and hidden rows/columns", () => {
	const hiddenRows = new Set<number>();
	hiddenRows.add(1);
	hiddenRows.add(3);

	const hiddenColumns = new Set<number>();
	hiddenColumns.add(2);

	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row) => 30,
		(column) => 100,
		hiddenRows,
		hiddenColumns
	);

	expect(model.getWidth()).toBe(100 * 5);
	expect(model.getHeight()).toBe(30 * 4);

	expect(model.getRowOffset(5)).toBe(30 * 3);
	expect(model.getColumnOffset(5)).toBe(100 * 4);
});

test("[CellModel.resize] Resize a single row and column", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	expect(model.getWidth()).toBe(100 * 6);
	expect(model.getHeight()).toBe(30 * 6);

	model.resizeRows([1], 100);

	expect(model.getRowSize(1)).toBe(100);
	expect(model.getRowOffset(2)).toBe(130);
	expect(model.getWidth()).toBe(100 * 6);
	expect(model.getHeight()).toBe(30 * 5 + 100);

	model.resizeColumns([1], 200);

	expect(model.getColumnSize(1)).toBe(200);
	expect(model.getColumnOffset(2)).toBe(300);
	expect(model.getWidth()).toBe(100 * 5 + 200);
	expect(model.getHeight()).toBe(30 * 5 + 100);
});

test("[CellModel.resize] Resize multiple rows and columns", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	expect(model.getWidth()).toBe(100 * 6);
	expect(model.getHeight()).toBe(30 * 6);

	model.resizeRows([3, 1, 4], 100);

	expect(model.getRowSize(1)).toBe(100);
	expect(model.getRowSize(3)).toBe(100);
	expect(model.getRowSize(4)).toBe(100);
	expect(model.getWidth()).toBe(100 * 6);
	expect(model.getHeight()).toBe(30 * 3 + 100 * 3);

	model.resizeColumns([5, 0, 1], 200);

	expect(model.getColumnSize(0)).toBe(200);
	expect(model.getColumnSize(1)).toBe(200);
	expect(model.getColumnSize(5)).toBe(200);
	expect(model.getWidth()).toBe(100 * 3 + 200 * 3);
	expect(model.getHeight()).toBe(30 * 3 + 3 * 100);
});

test("[CellModel.resize] Resize rows and columns with hidden rows/columns", () => {
	const hiddenRows = new Set<number>();
	hiddenRows.add(1);
	hiddenRows.add(3);

	const hiddenColumns = new Set<number>();
	hiddenColumns.add(2);

	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row) => 30,
		(column) => 100,
		hiddenRows,
		hiddenColumns
	);

	expect(model.getWidth()).toBe(100 * 5);
	expect(model.getHeight()).toBe(30 * 4);

	model.resizeRows([0, 3, 5], 60);
	model.resizeColumns([1, 2], 50);

	expect(model.getRowSize(0)).toBe(60);
	expect(model.getRowSize(3)).toBe(60);
	expect(model.getRowSize(5)).toBe(60);
	expect(model.getColumnSize(1)).toBe(50);
	expect(model.getColumnSize(2)).toBe(50);
	expect(model.getWidth()).toBe(100 * 5 - 50);
	expect(model.getHeight()).toBe(30 * 4 + 60);
});

test("[CellModel.hide] Hide rows and columns", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	model.hideRows([2, 1, 5]);
	model.hideColumns([0, 3]);

	expect(model.isRowHidden(1)).toBe(true);
	expect(model.isRowHidden(2)).toBe(true);
	expect(model.isRowHidden(5)).toBe(true);
	expect(model.isColumnHidden(0)).toBe(true);
	expect(model.isColumnHidden(3)).toBe(true);
	expect(model.isColumnHidden(1)).toBe(false);
	expect(model.getHeight()).toBe(90);
	expect(model.getWidth()).toBe(400);
	expect(model.getRowOffset(3)).toBe(30);
	expect(model.getColumnOffset(1)).toBe(0);
});

test("[CellModel.hide] Hide rows and columns - with already hidden rows/columns", () => {
	const hiddenRows = new Set<number>();
	hiddenRows.add(1);
	hiddenRows.add(3);

	const hiddenColumns = new Set<number>();
	hiddenColumns.add(2);

	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row) => 30,
		(column) => 100,
		hiddenRows,
		hiddenColumns
	);

	model.hideRows([2, 1, 5]);
	model.hideColumns([0, 3]);

	expect(model.isRowHidden(1)).toBe(true);
	expect(model.isRowHidden(2)).toBe(true);
	expect(model.isRowHidden(5)).toBe(true);
	expect(model.isColumnHidden(0)).toBe(true);
	expect(model.isColumnHidden(3)).toBe(true);
	expect(model.isColumnHidden(2)).toBe(true);
	expect(model.isColumnHidden(5)).toBe(false);
	expect(model.getHeight()).toBe(60);
	expect(model.getWidth()).toBe(300);
});
