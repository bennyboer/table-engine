import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'app-setup',
	templateUrl: 'setup.component.html',
	styleUrls: ['setup.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupComponent {
	codeSamples = {
		npmInstall: 'npm install table-engine',
		yarnAdd: 'yarn add table-engine',
		tableContainerHtml: `<div id="my-container" style="height: 400px"></div>`,
		generateCellModel: `\
const cellModel = CellModel.generate(
    [
        {
            range: {
                startRow: 2,
                endRow: 4,
                startColumn: 3,
                endColumn: 5
            },
            rendererName: TextCellRenderer.NAME,
            value: "A merged cell!"
        },
        {
            range: CellRange.fromSingleRowColumn(30, 5),
            rendererName: TextCellRenderer.NAME,
            value: "LAST CELL"
        }
    ],
    (row, column) => (row + 1) * (column + 1),
    (row, column) => TextCellRenderer.NAME,
    (row) => 25,
    (column) => 120,
    new Set(),
    new Set()
);`,
		igniteEngine: `\
const tableContainer = document.getElementById("my-container");

const cellModel = ...; // See last step

const engine = new TableEngine(tableContainer, cellModel);
engine.registerCellRenderer(new TextCellRenderer());
engine.initialize();`,
	};
}
