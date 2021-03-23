import {CellModel} from "./cell-model";
import {CellRange} from "../range/cell-range";
import {ICell} from "../cell";
import {IRect} from "canvaskit-wasm";
import {IRectangle} from "../../util/rect";

test("[CellModel.generate] Validate row/column sizes - I", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
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
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
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
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
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
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
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

test("[CellModel.generate] Validate cell values and ranges", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	for (let row = 0; row <= 5; row++) {
		for (let column = 0; column <= 5; column++) {
			const cell: ICell = model.getCell(row, column);

			if (row === 5 && column === 5) {
				expect(cell.value).toBe("Last cell");
			} else {
				expect(cell.value).toBe(row * column);
			}

			expect(cell.range.startRow).toBe(row);
			expect(cell.range.endRow).toBe(row);
			expect(cell.range.startColumn).toBe(column);
			expect(cell.range.endColumn).toBe(column);
		}
	}
});

test("[CellModel.resize] Resize a single row and column", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
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
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
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
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
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
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
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
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
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

test("[CellModel.show] Show single row and column", () => {
	const hiddenRows = new Set<number>();
	hiddenRows.add(1);
	hiddenRows.add(3);

	const hiddenColumns = new Set<number>();
	hiddenColumns.add(2);

	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		hiddenRows,
		hiddenColumns
	);

	model.showRows([5, 1]); // 5 is not hidden, and thus this should not have an effect
	model.showColumns([2]);

	expect(model.isRowHidden(1)).toBe(false);
	expect(model.isRowHidden(3)).toBe(true);
	expect(model.isRowHidden(0)).toBe(false);
	expect(model.isColumnHidden(0)).toBe(false);
	expect(model.isColumnHidden(3)).toBe(false);
	expect(model.isColumnHidden(2)).toBe(false);
	expect(model.getHeight()).toBe(150);
	expect(model.getWidth()).toBe(600);
	expect(model.getRowOffset(3)).toBe(90);
	expect(model.getColumnOffset(1)).toBe(100);
});

test("[CellModel.hide] Hide all", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	model.hideRows([0, 1, 3, 2, 5, 4]);
	model.hideColumns([0, 1, 3, 2, 5, 4]);

	expect(model.getWidth()).toBe(0);
	expect(model.getHeight()).toBe(0);
});

test("[CellModel.hide] Hide all and show all again", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	model.hideRows([0, 1, 3, 2, 5, 4]);
	model.hideColumns([0, 1, 3, 2, 5, 4]);

	expect(model.getWidth()).toBe(0);
	expect(model.getHeight()).toBe(0);

	model.showRows([0, 1, 3, 2, 5, 4]);
	model.showColumns([0, 1, 3, 2, 5, 4]);

	expect(model.getWidth()).toBe(600);
	expect(model.getHeight()).toBe(180);
});

test("[CellModel.show] Show multiple rows and columns", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	// Hide all first
	model.hideRows([0, 1, 3, 2, 5, 4]);
	model.hideColumns([0, 1, 3, 2, 5, 4]);

	// Show some again
	model.showRows([3, 5]);
	model.showColumns([0, 2, 3]);

	expect(model.isRowHidden(0)).toBe(true);
	expect(model.isRowHidden(1)).toBe(true);
	expect(model.isRowHidden(2)).toBe(true);
	expect(model.isRowHidden(3)).toBe(false);
	expect(model.isRowHidden(4)).toBe(true);
	expect(model.isRowHidden(5)).toBe(false);

	expect(model.isColumnHidden(0)).toBe(false);
	expect(model.isColumnHidden(1)).toBe(true);
	expect(model.isColumnHidden(2)).toBe(false);
	expect(model.isColumnHidden(3)).toBe(false);
	expect(model.isColumnHidden(4)).toBe(true);
	expect(model.isColumnHidden(5)).toBe(true);

	expect(model.getWidth()).toBe(300);
	expect(model.getHeight()).toBe(60);

	expect(model.getRowOffset(0)).toBe(0);
	expect(model.getRowOffset(1)).toBe(0);
	expect(model.getRowOffset(2)).toBe(0);
	expect(model.getRowOffset(3)).toBe(0);
	expect(model.getRowOffset(4)).toBe(30);
	expect(model.getRowOffset(5)).toBe(30);

	expect(model.getColumnOffset(0)).toBe(0);
	expect(model.getColumnOffset(1)).toBe(100);
	expect(model.getColumnOffset(2)).toBe(100);
	expect(model.getColumnOffset(3)).toBe(200);
	expect(model.getColumnOffset(4)).toBe(300);
	expect(model.getColumnOffset(5)).toBe(300);
});

test("[CellModel.getCell] Get a cell", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	const lastCell = model.getCell(5, 5);

	expect(lastCell.range.startRow).toBe(5);
	expect(lastCell.range.endRow).toBe(5);
	expect(lastCell.range.startColumn).toBe(5);
	expect(lastCell.range.endColumn).toBe(5);
	expect(lastCell.value).toBe("Last cell");

	const anotherCell = model.getCell(2, 3);

	expect(anotherCell.range.startRow).toBe(2);
	expect(anotherCell.range.endRow).toBe(2);
	expect(anotherCell.range.startColumn).toBe(3);
	expect(anotherCell.range.endColumn).toBe(3);
	expect(anotherCell.value).toBe(2 * 3);
});

test("[CellModel.merge] Merge a cell range", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	const success = model.mergeCells({
		startRow: 2,
		endRow: 4,
		startColumn: 2,
		endColumn: 4
	});

	expect(success).toBe(true);

	const cell = model.getCell(2, 2);
	expect(cell.range.startRow).toBe(2);
	expect(cell.range.endRow).toBe(4);
	expect(cell.range.startColumn).toBe(2);
	expect(cell.range.endColumn).toBe(4);
});

test("[CellModel.merge] Merge a cell range - impossible", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	model.mergeCells({
		startRow: 2,
		endRow: 4,
		startColumn: 2,
		endColumn: 4
	});

	const success = model.mergeCells({
		startRow: 1,
		endRow: 4,
		startColumn: 2,
		endColumn: 4
	});

	expect(success).toBe(false);

	const cell = model.getCell(2, 2);
	expect(cell.range.startRow).toBe(2);
	expect(cell.range.endRow).toBe(4);
	expect(cell.range.startColumn).toBe(2);
	expect(cell.range.endColumn).toBe(4);
});

test("[CellModel.split] Split a cell range", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	model.mergeCells({
		startRow: 2,
		endRow: 4,
		startColumn: 2,
		endColumn: 4
	});

	model.splitCell(3, 4); // The indices do not really matter and just need to be in the merged cell range

	const cell = model.getCell(2, 2);
	expect(cell.range.startRow).toBe(2);
	expect(cell.range.endRow).toBe(2);
	expect(cell.range.startColumn).toBe(2);
	expect(cell.range.endColumn).toBe(2);

	for (let row = 2; row <= 4; row++) {
		for (let column = 2; column <= 4; column++) {
			if (row !== 2 || column !== 2) {
				const anotherCell = model.getCell(row, column);
				expect(anotherCell).toBe(null); // Is an empty cell!
			}
		}
	}
});

test("[CellModel.split] Try to split a single row column cell", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	model.splitCell(2, 2);

	// Nothing should happen
	const cell = model.getCell(2, 2);
	expect(cell.range.startRow).toBe(2);
	expect(cell.range.endRow).toBe(2);
	expect(cell.range.startColumn).toBe(2);
	expect(cell.range.endColumn).toBe(2);
});

test("[CellModel.insert] Insert rows/columns at the beginning", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	// Insert some rows at the beginning
	model.insertRows(0, 3);

	// Verify trivial measures
	expect(model.getRowCount()).toBe(9);
	expect(model.getColumnCount()).toBe(6); // Unchanged!

	// Verify size
	expect(model.getHeight()).toBe(270);

	// Check whether the first three rows are empty cells (null)
	for (let row = 0; row < 3; row++) {
		for (let column = 0; column < model.getColumnCount(); column++) {
			expect(model.getCell(row, column)).toBe(null);
		}
	}

	// Check whether we have the previously first row afterwards
	const afterCell: ICell = model.getCell(3, 0);
	expect(afterCell.value).toBe(0);
	expect(afterCell.range.startRow).toBe(3);
	expect(afterCell.range.endRow).toBe(3);
	expect(afterCell.range.startColumn).toBe(0);
	expect(afterCell.range.endColumn).toBe(0);

	// Insert some columns at the beginning
	model.insertColumns(0, 5);

	// Verify trivial measures
	expect(model.getRowCount()).toBe(9); // Unchanged!
	expect(model.getColumnCount()).toBe(11);

	// Verify size
	expect(model.getWidth()).toBe(1100);

	// Check whether the first 5 columns are empty cells (null)
	for (let row = 0; row < model.getRowCount(); row++) {
		for (let column = 0; column < 5; column++) {
			expect(model.getCell(row, column)).toBe(null);
		}
	}

	// Check whether we have the previously first column afterwards
	const afterColumnCell: ICell = model.getCell(8, 5);
	expect(afterColumnCell.value).toBe(0);
	expect(afterColumnCell.range.startRow).toBe(8);
	expect(afterColumnCell.range.endRow).toBe(8);
	expect(afterColumnCell.range.startColumn).toBe(5);
	expect(afterColumnCell.range.endColumn).toBe(5);

	// Verify correct offsets (by one sample)
	expect(model.getRowOffset(4)).toBe(120);
	expect(model.getColumnOffset(7)).toBe(700);
});

test("[CellModel.insert] Insert rows/columns at the end", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	// Insert some rows at the beginning
	model.insertRows(model.getRowCount(), 3);
	model.insertColumns(model.getColumnCount(), 5);

	// Verify trivial measures
	expect(model.getRowCount()).toBe(9);
	expect(model.getColumnCount()).toBe(11);

	// Verify size
	expect(model.getHeight()).toBe(270);
	expect(model.getWidth()).toBe(1100);

	// Check whether the last three rows are empty cells (null)
	for (let row = model.getRowCount() - 3; row < model.getRowCount(); row++) {
		for (let column = 0; column < model.getColumnCount(); column++) {
			expect(model.getCell(row, column)).toBe(null);
		}
	}

	// Check whether the last 5 columns are empty cells (null)
	for (let row = 0; row < model.getRowCount(); row++) {
		for (let column = model.getColumnCount() - 5; column < model.getColumnCount(); column++) {
			expect(model.getCell(row, column)).toBe(null);
		}
	}

	// Check the state of the cell with content "Last cell"
	const lastCell: ICell = model.getCell(5, 5);
	expect(lastCell.value).toBe("Last cell");
	expect(lastCell.range.startRow).toBe(5);
	expect(lastCell.range.endRow).toBe(5);
	expect(lastCell.range.startColumn).toBe(5);
	expect(lastCell.range.endColumn).toBe(5);
});

test("[CellModel.insert] Insert rows/columns somewhere in between", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	// Insert some rows at the beginning
	model.insertRows(3, 3);
	model.insertColumns(3, 5);

	// Verify trivial measures
	expect(model.getRowCount()).toBe(9);
	expect(model.getColumnCount()).toBe(11);

	// Verify size
	expect(model.getHeight()).toBe(270);
	expect(model.getWidth()).toBe(1100);

	// Check whether the three rows are empty cells (null)
	for (let row = 3; row < 6; row++) {
		for (let column = 0; column < model.getColumnCount(); column++) {
			expect(model.getCell(row, column)).toBe(null);
		}
	}

	// Check whether the 5 columns are empty cells (null)
	for (let row = 0; row < model.getRowCount(); row++) {
		for (let column = 3; column < 8; column++) {
			expect(model.getCell(row, column)).toBe(null);
		}
	}
});

test("[CellModel.insert] Insert rows/columns with hidden rows/columns", () => {
	const hiddenRows: Set<number> = new Set<number>();
	const hiddenColumns: Set<number> = new Set<number>();

	hiddenRows.add(2);
	hiddenRows.add(4);

	hiddenColumns.add(0);
	hiddenColumns.add(1);

	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		hiddenRows,
		hiddenColumns
	);

	// Insert some rows
	model.insertRows(2, 3);
	model.insertColumns(2, 5);

	// Verify trivial measures
	expect(model.getRowCount()).toBe(9);
	expect(model.getColumnCount()).toBe(11);

	// Verify table size
	expect(model.getWidth()).toBe(900);
	expect(model.getHeight()).toBe(210);
});

test("[CellModel.insert] Insert rows/columns with merged cells and hidden rows/columns", () => {
	const hiddenRows: Set<number> = new Set<number>();
	const hiddenColumns: Set<number> = new Set<number>();

	hiddenRows.add(2);
	hiddenRows.add(4);

	hiddenColumns.add(0);
	hiddenColumns.add(1);

	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		hiddenRows,
		hiddenColumns
	);

	// Merge a cell
	model.mergeCells({
		startRow: 1,
		endRow: 4,
		startColumn: 1,
		endColumn: 4
	});

	// Insert some rows
	model.insertRows(3, 3);
	model.insertColumns(3, 3);

	// Verify trivial measures
	expect(model.getRowCount()).toBe(9);
	expect(model.getColumnCount()).toBe(9);

	// Verify table size
	expect(model.getWidth()).toBe(700);
	expect(model.getHeight()).toBe(210);

	// Verify offsets due to hidden rows/columns
	expect(model.getColumnOffset(0)).toBe(0);
	expect(model.getColumnOffset(1)).toBe(0);
	expect(model.getColumnOffset(2)).toBe(0);
	expect(model.getColumnOffset(3)).toBe(100);
	expect(model.getRowOffset(2)).toBe(60);
	expect(model.getRowOffset(3)).toBe(60);

	// The following two row offsets are shifted due to a shifted hidden row (from initially 4 to position 7)
	expect(model.getRowOffset(4 + 3)).toBe(180);
	expect(model.getRowOffset(4 + 4)).toBe(180);
});

test("[CellModel.delete] Delete rows/columns from the beginning", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	// Delete some rows/columns from the beginning
	model.deleteRows(0, 2);
	model.deleteColumns(0, 2);

	// Verify trivial measures
	expect(model.getRowCount()).toBe(4);
	expect(model.getColumnCount()).toBe(4);

	// Check the state of the rows
	for (let row = 0; row < model.getRowCount(); row++) {
		expect(model.getRowOffset(row)).toBe(row * 30);
		expect(model.getRowSize(row)).toBe(30);

		for (let column = 0; column < model.getColumnCount(); column++) {
			expect(model.getColumnOffset(column)).toBe(column * 100);
			expect(model.getColumnSize(column)).toBe(100);

			const cell: ICell = model.getCell(row, column);

			if (row === model.getRowCount() - 1 && column === model.getColumnCount() - 1) {
				expect(cell.value).toBe("Last cell");
			} else {
				expect(cell.value).toBe((row + 2) * (column + 2));
			}
			expect(cell.range.startRow).toBe(row);
			expect(cell.range.endRow).toBe(row);
			expect(cell.range.startColumn).toBe(column);
			expect(cell.range.endColumn).toBe(column);
		}
	}
});

test("[CellModel.delete] Delete rows/columns at the end", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	// Delete some rows/columns from the beginning
	model.deleteRows(model.getRowCount() - 2, 2);
	model.deleteColumns(model.getColumnCount() - 2, 2);

	// Verify trivial measures
	expect(model.getRowCount()).toBe(4);
	expect(model.getColumnCount()).toBe(4);

	// Check the state of the rows
	for (let row = 0; row < model.getRowCount(); row++) {
		expect(model.getRowOffset(row)).toBe(row * 30);
		expect(model.getRowSize(row)).toBe(30);

		for (let column = 0; column < model.getColumnCount(); column++) {
			expect(model.getColumnOffset(column)).toBe(column * 100);
			expect(model.getColumnSize(column)).toBe(100);

			const cell: ICell = model.getCell(row, column);
			expect(cell.value).toBe(row * column);
			expect(cell.range.startRow).toBe(row);
			expect(cell.range.endRow).toBe(row);
			expect(cell.range.startColumn).toBe(column);
			expect(cell.range.endColumn).toBe(column);
		}
	}
});

test("[CellModel.delete] Delete rows/columns in between", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	// Delete some rows/columns from the beginning
	model.deleteRows(2, 2);
	model.deleteColumns(2, 2);

	// Verify trivial measures
	expect(model.getRowCount()).toBe(4);
	expect(model.getColumnCount()).toBe(4);

	// Check the state of the rows
	for (let row = 0; row < model.getRowCount(); row++) {
		expect(model.getRowOffset(row)).toBe(row * 30);
		expect(model.getRowSize(row)).toBe(30);

		const rowValue: number = row < 2 ? row : row + 2;

		for (let column = 0; column < model.getColumnCount(); column++) {
			expect(model.getColumnOffset(column)).toBe(column * 100);
			expect(model.getColumnSize(column)).toBe(100);

			const columnValue: number = column < 2 ? column : column + 2;

			const cell: ICell = model.getCell(row, column);
			if (row === model.getRowCount() - 1 && column === model.getColumnCount() - 1) {
				expect(cell.value).toBe("Last cell");
			} else {
				expect(cell.value).toBe(rowValue * columnValue);
			}
			expect(cell.range.startRow).toBe(row);
			expect(cell.range.endRow).toBe(row);
			expect(cell.range.startColumn).toBe(column);
			expect(cell.range.endColumn).toBe(column);
		}
	}
});

test("[CellModel.delete] Delete rows/columns with hidden rows/columns", () => {
	const hiddenRows: Set<number> = new Set<number>();
	const hiddenColumns: Set<number> = new Set<number>();

	hiddenRows.add(4);
	hiddenColumns.add(1);
	hiddenColumns.add(5);

	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		hiddenRows,
		hiddenColumns
	);

	// Delete some rows/columns from the beginning
	model.deleteRows(2, 2);
	model.deleteColumns(2, 2);

	// Verify trivial measures
	expect(model.getRowCount()).toBe(4);
	expect(model.getColumnCount()).toBe(4);

	// Check the state of the rows
	for (let row = 0; row < model.getRowCount(); row++) {
		expect(model.getRowOffset(row)).toBe(row * 30 - (row > 2 ? 30 : 0));
		expect(model.getRowSize(row)).toBe(30);
		expect(model.isRowHidden(row)).toBe(row === 2);

		const rowValue: number = row < 2 ? row : row + 2;

		for (let column = 0; column < model.getColumnCount(); column++) {
			expect(model.getColumnOffset(column)).toBe(column * 100 - (column > 1 ? 100 : 0));
			expect(model.getColumnSize(column)).toBe(100);
			expect(model.isColumnHidden(column)).toBe(column === 1 || column === 3);

			const columnValue: number = column < 2 ? column : column + 2;

			const cell: ICell = model.getCell(row, column);
			if (row === model.getRowCount() - 1 && column === model.getColumnCount() - 1) {
				expect(cell.value).toBe("Last cell");
			} else {
				expect(cell.value).toBe(rowValue * columnValue);
			}
			expect(cell.range.startRow).toBe(row);
			expect(cell.range.endRow).toBe(row);
			expect(cell.range.startColumn).toBe(column);
			expect(cell.range.endColumn).toBe(column);
		}
	}
});

test("[CellModel.delete] Delete rows/columns with merged cells - I", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	model.mergeCells({
		startRow: 0,
		endRow: model.getRowCount() - 1,
		startColumn: 0,
		endColumn: 0
	});
	model.mergeCells({
		startRow: 1,
		endRow: 2,
		startColumn: 1,
		endColumn: 4,
	});

	// Delete some rows/columns from the beginning
	model.deleteRows(2, 2);
	model.deleteColumns(2, 2);

	// Verify trivial measures
	expect(model.getRowCount()).toBe(4);
	expect(model.getColumnCount()).toBe(4);

	// Check the state of the cell matrix
	const expectedValues: any[][] = [
		[0, 0, 0, 0],
		[0, 1, 1, 5],
		[0, 4, 16, 20],
		[0, 5, 20, "Last cell"]
	];
	for (let row = 0; row < model.getRowCount(); row++) {
		for (let column = 0; column < model.getColumnCount(); column++) {
			const cell: ICell = model.getCell(row, column);
			expect(cell.value).toBe(expectedValues[row][column]);
		}
	}

	// Check cell ranges of merged cells
	let cell: ICell = model.getCell(3, 0);
	expect(cell.range.startRow).toBe(0);
	expect(cell.range.endRow).toBe(3);
	expect(cell.range.startColumn).toBe(0);
	expect(cell.range.endColumn).toBe(0);

	cell = model.getCell(1, 2);
	expect(cell.range.startRow).toBe(1);
	expect(cell.range.endRow).toBe(1);
	expect(cell.range.startColumn).toBe(1);
	expect(cell.range.endColumn).toBe(2);
});

test("[CellModel.delete] Delete rows/columns with merged cells - II", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	// Merge cell starting in the row to delete
	model.mergeCells({
		startRow: 2,
		endRow: model.getRowCount() - 1,
		startColumn: 1,
		endColumn: 1
	});
	// Merge cell starting under the in the row to delete
	model.mergeCells({
		startRow: 4,
		endRow: model.getRowCount() - 1,
		startColumn: 2,
		endColumn: 2
	});
	// Merge cell ranging over the row to delete
	model.mergeCells({
		startRow: 0,
		endRow: model.getRowCount() - 1,
		startColumn: 3,
		endColumn: 3
	});
	// Merge cell ranging only to the first row to delete
	model.mergeCells({
		startRow: 0,
		endRow: 2,
		startColumn: 4,
		endColumn: 4
	});

	// Delete some rows/columns from the beginning
	model.deleteRows(2, 1);

	// Verify trivial measures
	expect(model.getRowCount()).toBe(5);

	// Check the state of the cell matrix
	const expectedValues: any[][] = [
		[0, 0, 0, 0, 0, 0],
		[0, 1, 2, 0, 0, 5],
		[0, 2, 6, 0, 12, 15],
		[0, 2, 8, 0, 16, 20],
		[0, 2, 8, 0, 20, "Last cell"]
	];
	for (let row = 0; row < model.getRowCount(); row++) {
		for (let column = 0; column < model.getColumnCount(); column++) {
			const cell: ICell = model.getCell(row, column);
			expect(cell.value).toBe(expectedValues[row][column]);
		}
	}

	// Check cell ranges of merged cells
	let cell: ICell = model.getCell(4, 1);
	expect(cell.range.startRow).toBe(2);
	expect(cell.range.endRow).toBe(4);
	expect(cell.range.startColumn).toBe(1);
	expect(cell.range.endColumn).toBe(1);

	cell = model.getCell(4, 2);
	expect(cell.range.startRow).toBe(3);
	expect(cell.range.endRow).toBe(4);
	expect(cell.range.startColumn).toBe(2);
	expect(cell.range.endColumn).toBe(2);

	cell = model.getCell(2, 3);
	expect(cell.range.startRow).toBe(0);
	expect(cell.range.endRow).toBe(4);
	expect(cell.range.startColumn).toBe(3);
	expect(cell.range.endColumn).toBe(3);

	cell = model.getCell(0, 4);
	expect(cell.range.startRow).toBe(0);
	expect(cell.range.endRow).toBe(1);
	expect(cell.range.startColumn).toBe(4);
	expect(cell.range.endColumn).toBe(4);
});

test("[CellModel.delete] Delete rows/columns with merged cells - III", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	// Merge cell starting in the column to delete
	model.mergeCells({
		startRow: 1,
		endRow: 1,
		startColumn: 2,
		endColumn: model.getColumnCount() - 1
	});
	// Merge cell starting next to the column to delete
	model.mergeCells({
		startRow: 2,
		endRow: 2,
		startColumn: 4,
		endColumn: model.getColumnCount() - 1
	});
	// Merge cell ranging over the column to delete
	model.mergeCells({
		startRow: 3,
		endRow: 3,
		startColumn: 0,
		endColumn: model.getColumnCount() - 1
	});
	// Merge cell ranging only to the first column to delete
	model.mergeCells({
		startRow: 4,
		endRow: 4,
		startColumn: 0,
		endColumn: 2
	});

	// Delete some rows/columns from the beginning
	model.deleteColumns(2, 1);

	// Verify trivial measures
	expect(model.getColumnCount()).toBe(5);

	// Check the state of the cell matrix
	const expectedValues: any[][] = [
		[0, 0, 0, 0, 0],
		[0, 1, 2, 2, 2],
		[0, 2, 6, 8, 8],
		[0, 0, 0, 0, 0],
		[0, 0, 12, 16, 20],
		[0, 5, 15, 20, "Last cell"]
	];
	for (let row = 0; row < model.getRowCount(); row++) {
		for (let column = 0; column < model.getColumnCount(); column++) {
			const cell: ICell = model.getCell(row, column);
			expect(cell.value).toBe(expectedValues[row][column]);
		}
	}

	// Check cell ranges of merged cells
	let cell: ICell = model.getCell(1, 4);
	expect(cell.range.startRow).toBe(1);
	expect(cell.range.endRow).toBe(1);
	expect(cell.range.startColumn).toBe(2);
	expect(cell.range.endColumn).toBe(4);

	cell = model.getCell(2, 4);
	expect(cell.range.startRow).toBe(2);
	expect(cell.range.endRow).toBe(2);
	expect(cell.range.startColumn).toBe(3);
	expect(cell.range.endColumn).toBe(4);

	cell = model.getCell(3, 2);
	expect(cell.range.startRow).toBe(3);
	expect(cell.range.endRow).toBe(3);
	expect(cell.range.startColumn).toBe(0);
	expect(cell.range.endColumn).toBe(4);

	cell = model.getCell(4, 0);
	expect(cell.range.startRow).toBe(4);
	expect(cell.range.endRow).toBe(4);
	expect(cell.range.startColumn).toBe(0);
	expect(cell.range.endColumn).toBe(1);
});

test("[CellModel.get] Get cell at offset", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	let cell = model.getCellAtOffset(99, 29);
	expect(cell.range.startRow).toBe(0);
	expect(cell.range.startColumn).toBe(0);

	cell = model.getCellAtOffset(100, 30);
	expect(cell.range.startRow).toBe(1);
	expect(cell.range.startColumn).toBe(1);

	cell = model.getCellAtOffset(300, 90);
	expect(cell.range.startRow).toBe(3);
	expect(cell.range.startColumn).toBe(3);

	// Try offsets out of range
	cell = model.getCellAtOffset(9129312, 234234);
	expect(cell.range.startRow).toBe(5);
	expect(cell.range.startColumn).toBe(5);

	cell = model.getCellAtOffset(-234, -3242);
	expect(cell.range.startRow).toBe(0);
	expect(cell.range.startColumn).toBe(0);
});

test("[CellModel.get] Get cells for rectangle", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	let cells = model.getCellsForRect({
		left: 150,
		top: 130,
		width: 200,
		height: 100
	});

	const expectedValues: Set<any> = new Set<any>();
	expectedValues.add(4);
	expectedValues.add(8);
	expectedValues.add(12);
	expectedValues.add(5);
	expectedValues.add(10);
	expectedValues.add(15);

	expect(cells.length).toBe(6);
	for (const cell of cells) {
		expect(expectedValues.has(cell.value)).toBe(true);
		expectedValues.delete(cell.value);
	}
	expect(expectedValues.size).toBe(0);
});

test("[CellModel.getBounds] Get bounds of a cell", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	model.mergeCells({
		startRow: 1,
		endRow: 4,
		startColumn: 1,
		endColumn: 3
	});

	let bounds: IRectangle = model.getBounds(model.getCell(0, 0).range);
	expect(bounds.top).toBe(0);
	expect(bounds.left).toBe(0);
	expect(bounds.height).toBe(30);
	expect(bounds.width).toBe(100);

	bounds = model.getBounds(model.getCell(5, 5).range);
	expect(bounds.top).toBe(150);
	expect(bounds.left).toBe(500);
	expect(bounds.height).toBe(30);
	expect(bounds.width).toBe(100);

	// Test merged cell bounds
	bounds = model.getBounds(model.getCell(1, 1).range);
	expect(bounds.top).toBe(30);
	expect(bounds.left).toBe(100);
	expect(bounds.height).toBe(120);
	expect(bounds.width).toBe(300);

	// Hide a row and column in the merged cell
	model.hideRows([3]);
	model.hideColumns([1]);

	// Test again
	bounds = model.getBounds(model.getCell(1, 1).range);
	expect(bounds.top).toBe(30);
	expect(bounds.left).toBe(100);
	expect(bounds.height).toBe(90);
	expect(bounds.width).toBe(200);
});

test("[CellModel.getRange] Get cell range for rectangle", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	const range = model.getRangeForRect({
		left: 100,
		top: 100,
		width: 300,
		height: 50
	});

	expect(range.startRow).toBe(3);
	expect(range.endRow).toBe(5);
	expect(range.startColumn).toBe(1);
	expect(range.endColumn).toBe(4);
});

test("[CellModel.isRangeVisible] Check whether a range is visible", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	expect(model.isRangeVisible({
		startRow: 2,
		endRow: 4,
		startColumn: 2,
		endColumn: 4
	})).toBe(true);

	model.hideRows([2, 4]);
	model.hideColumns([2, 3]);

	expect(model.isRangeVisible({
		startRow: 2,
		endRow: 4,
		startColumn: 2,
		endColumn: 4
	})).toBe(true);

	model.hideColumns([4]);

	expect(model.isRangeVisible({
		startRow: 2,
		endRow: 4,
		startColumn: 2,
		endColumn: 4
	})).toBe(false);

	model.hideRows([3]);

	expect(model.isRangeVisible({
		startRow: 2,
		endRow: 4,
		startColumn: 2,
		endColumn: 4
	})).toBe(false);
});

test("[CellModel.find] Find next/previous visible row/column", () => {
	const model = CellModel.generate(
		[
			{
				range: CellRange.fromSingleRowColumn(5, 5),
				rendererName: "base",
				value: "Last cell"
			}
		],
		(row, column) => row * column,
		(row, column) => "base",
		(row) => 30,
		(column) => 100,
		new Set<number>(),
		new Set<number>()
	);

	model.hideRows([2, 4]);
	model.hideColumns([2, 3]);

	expect(model.findNextVisibleRow(0)).toBe(0);
	expect(model.findNextVisibleRow(1)).toBe(1);
	expect(model.findNextVisibleRow(2)).toBe(3);
	expect(model.findNextVisibleRow(3)).toBe(3);
	expect(model.findNextVisibleRow(4)).toBe(5);
	expect(model.findNextVisibleRow(5)).toBe(5);
	expect(model.findNextVisibleRow(6)).toBe(-1);

	expect(model.findNextVisibleColumn(0)).toBe(0);
	expect(model.findNextVisibleColumn(1)).toBe(1);
	expect(model.findNextVisibleColumn(2)).toBe(4);
	expect(model.findNextVisibleColumn(4)).toBe(4);
	expect(model.findNextVisibleColumn(5)).toBe(5);
	expect(model.findNextVisibleColumn(6)).toBe(-1);

	expect(model.findPreviousVisibleRow(-1)).toBe(-1);
	expect(model.findPreviousVisibleRow(0)).toBe(0);
	expect(model.findPreviousVisibleRow(1)).toBe(1);
	expect(model.findPreviousVisibleRow(2)).toBe(1);
	expect(model.findPreviousVisibleRow(3)).toBe(3);
	expect(model.findPreviousVisibleRow(4)).toBe(3);
	expect(model.findPreviousVisibleRow(5)).toBe(5);

	expect(model.findPreviousVisibleColumn(-1)).toBe(-1);
	expect(model.findPreviousVisibleColumn(0)).toBe(0);
	expect(model.findPreviousVisibleColumn(1)).toBe(1);
	expect(model.findPreviousVisibleColumn(2)).toBe(1);
	expect(model.findPreviousVisibleColumn(3)).toBe(1);
	expect(model.findPreviousVisibleColumn(4)).toBe(4);
	expect(model.findPreviousVisibleColumn(5)).toBe(5);
});
