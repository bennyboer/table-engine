import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild} from "@angular/core";
import {ICellModel} from "../../../src/cell/model/cell-model.interface";
import {CellModel} from "../../../src/cell/model/cell-model";
import {CellRange} from "../../../src/cell/range/cell-range";
import {TableEngine} from "../../../src/table-engine";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements AfterViewInit {

  @ViewChild("tableContainer")
  public tableContainer!: ElementRef;

  /**
   * Table engine reference.
   */
  private engine: TableEngine;

  public repaint(): void {
    this.engine.repaint();
  }

  /**
   * Called after the view is initialized.
   */
  public ngAfterViewInit(): void {
    const cellModel = AppComponent.initializeCellModel();
    this.engine = new TableEngine(this.tableContainer.nativeElement, cellModel);
  }

  /**
   * Initialize the cell model to use for displaying a table.
   */
  private static initializeCellModel(): ICellModel {
    const model = CellModel.generate(
      [
        {
          range: CellRange.fromSingleRowColumn(1000, 1000),
          value: "Last cell with more text than normally"
        }
      ],
      (row, column) => (row + 1) * (column + 1),
      (row) => 30,
      (column) => 120,
      new Set<number>(),
      new Set<number>()
    );

    model.mergeCells({
      startRow: 2,
      endRow: 4,
      startColumn: 2,
      endColumn: 3
    });

    return model;
  }

}
