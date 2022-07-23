import {
	TableEngine,
	CellModel,
	CellRange,
	TextCellRenderer,
	RowColumnHeaderRenderer,
} from '../src/index';
const tableContainer = document.getElementById('table-container');

const cellModel = CellModel.generate(
	[
		{
			range: CellRange.fromSingleRowColumn(30, 5),
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

const engine = new TableEngine(tableContainer!, cellModel);

engine.registerCellRenderer(new RowColumnHeaderRenderer());
engine.registerCellRenderer(new TextCellRenderer());

engine.initialize();

console.log(engine);
