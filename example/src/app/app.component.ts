import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild
} from "@angular/core";
import {ICellModel} from "../../../src/cell/model/cell-model.interface";
import {CellModel} from "../../../src/cell/model/cell-model";
import {CellRange} from "../../../src/cell/range/cell-range";
import {TableEngine} from "../../../src/table-engine";
import {RowColumnHeaderRenderer} from "../../../src/renderer/canvas/cell/header/row-column-header-renderer";
import {BaseCellRenderer} from "../../../src/renderer/canvas/cell/base/base-cell-renderer";
import {ROW_COLUMN_HEADER_TRANSFORM} from "../../../src/selection/options";
import {ISelection} from "../../../src/selection/selection";
import {IImageCellRendererValue, ImageCellRenderer} from "../../../src/renderer/canvas/cell/image/image-cell-renderer";
import {BorderStyle} from "../../../src/border/border-style";
import {IColor} from "../../../src/util/color";
import {
  ILoadingCellRendererValue,
  LoadingCellRenderer
} from "../../../src/renderer/canvas/cell/loading/loading-cell-renderer";
import {environment} from "../environments/environment";

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
   * Currently selected border color.
   */
  public borderColor: string = "rgba(255, 0, 0, 1.0)";

  /**
   * Currently selected border size.
   */
  public borderSize: number = 1;

  /**
   * Currently selected border style.
   */
  public borderStyle: string = "Solid";

  /**
   * Table engine reference.
   */
  private engine: TableEngine;

  public libraryVersion: string = environment.tableEngineVersion;

  constructor(private readonly zone: NgZone) {
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

  public focusTable(): void {
    this.engine.requestFocus();
  }

  public mergeSelection(): void {
    const primary: ISelection | null = this.engine.getSelectionModel().getPrimary();
    if (!!primary) {
      this.engine.getCellModel().mergeCells(primary.range);
      this.engine.repaint();
    }
  }

  public splitSelection(): void {
    const primary: ISelection | null = this.engine.getSelectionModel().getPrimary();
    if (!!primary) {
      this.engine.getCellModel().splitCell(primary.range.startRow, primary.range.startColumn);
      this.engine.repaint();
    }
  }

  public showHidden(): void {
    this.engine.getCellModel().showAll();
    this.engine.repaint();
  }

  public hideRows(): void {
    const selections: ISelection[] = this.engine.getSelectionModel().getSelections();
    const toHide: number[] = [];
    for (const s of selections) {
      for (let row = s.range.startRow; row <= s.range.endRow; row++) {
        toHide.push(row);
      }
    }

    if (toHide.length > 0) {
      this.engine.getCellModel().hideRows(toHide);
      this.engine.repaint();
    }
  }

  public hideColumns(): void {
    const selections: ISelection[] = this.engine.getSelectionModel().getSelections();
    const toHide: number[] = [];
    for (const s of selections) {
      for (let column = s.range.startColumn; column <= s.range.endColumn; column++) {
        toHide.push(column);
      }
    }

    if (toHide.length > 0) {
      this.engine.getCellModel().hideColumns(toHide);
      this.engine.repaint();
    }
  }

  private static _borderStyleNameToStyle(styleName: string): BorderStyle {
    if (styleName === "Solid") {
      return BorderStyle.SOLID;
    } else if (styleName === "Dotted") {
      return BorderStyle.DOTTED;
    } else {
      return BorderStyle.DASHED;
    }
  }

  private static _rgbaStringToColor(rgbaStr: string): IColor {
    rgbaStr = rgbaStr.startsWith("rgba") ? rgbaStr.substring(5, rgbaStr.length - 1) : rgbaStr.substring(4, rgbaStr.length - 1);
    const parts = rgbaStr.split(",");

    return {
      red: parseInt(parts[0].trim()),
      green: parseInt(parts[1].trim()),
      blue: parseInt(parts[2].trim()),
      alpha: parts.length === 4 ? parseFloat(parts[3].trim()) : 1.0
    }
  }

  public setBorderTop(): void {
    const primary: ISelection | null = this.engine.getSelectionModel().getPrimary();
    if (!!primary) {
      this.engine.getBorderModel().setBorder({
        top: {
          size: this.borderSize,
          style: AppComponent._borderStyleNameToStyle(this.borderStyle),
          color: AppComponent._rgbaStringToColor(this.borderColor)
        }
      }, primary.range);

      this.engine.repaint();
    }
  }

  public setBorderLeft(): void {
    const primary: ISelection | null = this.engine.getSelectionModel().getPrimary();
    if (!!primary) {
      this.engine.getBorderModel().setBorder({
        left: {
          size: this.borderSize,
          style: AppComponent._borderStyleNameToStyle(this.borderStyle),
          color: AppComponent._rgbaStringToColor(this.borderColor)
        }
      }, primary.range);

      this.engine.repaint();
    }
  }

  public setBorderBottom(): void {
    const primary: ISelection | null = this.engine.getSelectionModel().getPrimary();
    if (!!primary) {
      this.engine.getBorderModel().setBorder({
        bottom: {
          size: this.borderSize,
          style: AppComponent._borderStyleNameToStyle(this.borderStyle),
          color: AppComponent._rgbaStringToColor(this.borderColor)
        }
      }, primary.range);

      this.engine.repaint();
    }
  }

  public setBorderRight(): void {
    const primary: ISelection | null = this.engine.getSelectionModel().getPrimary();
    if (!!primary) {
      this.engine.getBorderModel().setBorder({
        right: {
          size: this.borderSize,
          style: AppComponent._borderStyleNameToStyle(this.borderStyle),
          color: AppComponent._rgbaStringToColor(this.borderColor)
        }
      }, primary.range);

      this.engine.repaint();
    }
  }

  public zoomIn(): void {
    this.engine.setZoom(this.engine.getZoom() + 0.25);
  }

  public zoomOut(): void {
    this.engine.setZoom(this.engine.getZoom() - 0.25);
  }

  public getCurrentZoom(): number {
    return !!this.engine ? this.engine.getZoom() : 1.0;
  }

  /**
   * Called after the view is initialized.
   */
  public ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const cellModel = AppComponent.initializeCellModel();
      this.engine = new TableEngine(this.tableContainer.nativeElement, cellModel);

      // Set row/column header selection transform
      this.engine.getOptions().selection.selectionTransform = ROW_COLUMN_HEADER_TRANSFORM;

      // Set initial state of fixed rows/columns
      this.engine.getOptions().renderer.view.fixedRows = 1;
      this.engine.getOptions().renderer.view.fixedColumns = 1;

      // Register needed cell renderers
      this.engine.registerCellRenderer(new BaseCellRenderer());
      this.engine.registerCellRenderer(new RowColumnHeaderRenderer());
      this.engine.registerCellRenderer(new ImageCellRenderer());
      this.engine.registerCellRenderer(new LoadingCellRenderer());

      // Set an example border
      this.engine.getBorderModel().setBorder({
        right: {
          style: BorderStyle.SOLID,
          size: 1,
          color: {red: 255, blue: 0, green: 0, alpha: 1},
        },
        bottom: {
          style: BorderStyle.SOLID,
          size: 2,
          color: {red: 0, blue: 0, green: 255, alpha: 1},
        },
        left: {
          style: BorderStyle.SOLID,
          size: 3,
          color: {red: 0, blue: 255, green: 0, alpha: 1},
        },
        top: {
          style: BorderStyle.SOLID,
          size: 4,
          color: {red: 255, blue: 0, green: 100, alpha: 1},
        }
      }, {
        startRow: 2,
        endRow: 4,
        startColumn: 2,
        endColumn: 3
      });

      this.engine.initialize();
    });
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
            startRow: 5,
            endRow: 10,
            startColumn: 5,
            endColumn: 8
          },
          rendererName: "loading",
          value:
            {
              cellRenderer: "image",
              promiseSupplier: async () => {
                return new Promise(resolve => setTimeout(() => resolve({
                  src: "assets/sloth.svg"
                } as IImageCellRendererValue), 3000))
              },
            } as ILoadingCellRendererValue
        },
        {
          range: CellRange.fromSingleRowColumn(1000, 1000),
          rendererName: "base",
          value: "Last cell with more text than normally"
        },
        {
          range: CellRange.fromSingleRowColumn(10, 2),
          rendererName: "loading",
          value: {
            cellRenderer: "base",
            promiseSupplier: async () => {
              return new Promise(resolve => setTimeout(() => resolve("Done 😀"), 2000))
            },
          } as ILoadingCellRendererValue
        }
      ],
      (row, column) => row * column,
      (row, column) => {
        if (row === 0 || column === 0) {
          return "row-column-header";
        } else {
          return "base";
        }
      },
      (row) => 25,
      (column) => column === 0 ? 50 : 120,
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
