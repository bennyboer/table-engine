import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild} from "@angular/core";
import {ICellModel} from "../../../src/cell/model/cell-model.interface";
import {CellModel} from "../../../src/cell/model/cell-model";
import {CellRange} from "../../../src/cell/range/cell-range";
import {TableEngine} from "../../../src/table-engine";
import {ICanvasCellRenderer} from "../../../src/renderer/canvas/cell/canvas-cell-renderer";
import {ICell} from "../../../src/cell/cell";
import {IRectangle} from "../../../src/util/rect";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements AfterViewInit, OnDestroy {

  @ViewChild("tableContainer")
  public tableContainer!: ElementRef;

  /**
   * Table engine reference.
   */
  private engine: TableEngine;

  public repaint(): void {
    this.engine.repaint();
  }

  public addOneFixedRowsColumns(): void {
    this.engine.getOptions().renderer.view.fixedRows += 1;
    this.engine.getOptions().renderer.view.fixedColumns += 1;
    this.engine.repaint();
  }

  public removeOneFixedRowsColumns(): void {
    this.engine.getOptions().renderer.view.fixedRows = Math.max(this.engine.getOptions().renderer.view.fixedRows - 1, 0);
    this.engine.getOptions().renderer.view.fixedColumns = Math.max(this.engine.getOptions().renderer.view.fixedColumns - 1, 0);
    this.engine.repaint();
  }

  /**
   * Called after the view is initialized.
   */
  public ngAfterViewInit(): void {
    const cellModel = AppComponent.initializeCellModel();
    this.engine = new TableEngine(this.tableContainer.nativeElement, cellModel);
    this.engine.registerCellRenderer(new TestCellRenderer());
    this.engine.initialize();
  }

  /**
   * Called on component destruction.
   */
  public ngOnDestroy(): void {
    if (!!this.engine) {
      this.engine.cleanup();
    }
  }

  /**
   * Initialize the cell model to use for displaying a table.
   */
  private static initializeCellModel(): ICellModel {
    const model = CellModel.generate(
      [
        {
          range: {
            startRow: 15,
            endRow: 18,
            startColumn: 8,
            endColumn: 9
          },
          rendererName: "custom",
          value: "Hello world!"
        },
        {
          range: CellRange.fromSingleRowColumn(100, 20),
          rendererName: "base",
          value: "Last cell with more text than normally"
        }
      ],
      (row, column) => (row + 1) * (column + 1),
      (row, column) => "base",
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

class TestCellRenderer implements ICanvasCellRenderer {
  after(ctx: CanvasRenderingContext2D): void {
  }

  before(ctx: CanvasRenderingContext2D): void {
  }

  getName(): string {
    return "custom";
  }

  render(ctx: CanvasRenderingContext2D, cell: ICell, bounds: IRectangle): void {
    ctx.fillStyle = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;

    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
  }

}
