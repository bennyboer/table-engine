import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	NgZone,
	OnDestroy,
	ViewChild,
} from '@angular/core';
import {
	BorderStyle,
	CellModel,
	CellRange,
	CheckboxCellRenderer,
	ComboBoxCellRenderer,
	CopyPerformanceWarningNotification,
	DOMCellRenderer,
	HorizontalAlignment,
	ICell,
	ICellModel,
	ICheckboxCellRendererValue,
	IColor,
	IComboBoxCellRendererValue,
	IImageCellRendererValue,
	ILoadingCellRendererValue,
	ImageCellRenderer,
	INotification,
	ISelection,
	ITextCellRendererValue,
	LoadingCellRenderer,
	NotificationIDs,
	RatingCellRenderer,
	ROW_COLUMN_HEADER_TRANSFORM,
	RowColumnHeaderRenderer,
	TableEngine,
	TextCellRenderer,
	VerticalAlignment,
} from '../../../src';
import { environment } from '../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DebugCellRenderer } from './renderer/debug-cell-renderer';
import { ProgressCellRenderer } from '../../../src/renderer/canvas/cell/progress/progress-cell-renderer';
import { IProgressCellRendererValue } from '../../../src/renderer/canvas/cell/progress/progress-cell-renderer-value';
import { ProgressCellRendererStyle } from '../../../src/renderer/canvas/cell/progress/progress-cell-renderer-style';
import {
	ButtonCellRenderer,
	IButtonCellRendererOptions,
	IButtonCellRendererValue,
} from '../../../src/renderer/canvas/cell/button';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements AfterViewInit, OnDestroy {
	@ViewChild('tableContainer')
	public tableContainer!: ElementRef;

	/**
	 * Currently selected border color.
	 */
	public borderColor: string = 'rgba(255, 0, 0, 1.0)';

	/**
	 * Currently selected border size.
	 */
	public borderSize: number = 1;

	/**
	 * Currently selected border style.
	 */
	public borderStyle: string = 'Solid';

	/**
	 * Amount of rows/columns to add.
	 */
	public addCount: number = 1;

	/**
	 * Table engine reference.
	 */
	private engine: TableEngine;

	public libraryVersion: string = environment.tableEngineVersion;

	constructor(
		private readonly zone: NgZone,
		private readonly snackbar: MatSnackBar
	) {}

	public addOneFixedRowsColumns(): void {
		this.engine.getOptions().renderer.view.fixedAreas.top += 1;
		this.engine.getOptions().renderer.view.fixedAreas.left += 1;
		this.engine.repaint();
	}

	public removeOneFixedRowsColumns(): void {
		this.engine.getOptions().renderer.view.fixedAreas.top = Math.max(
			this.engine.getOptions().renderer.view.fixedAreas.top - 1,
			0
		);
		this.engine.getOptions().renderer.view.fixedAreas.left = Math.max(
			this.engine.getOptions().renderer.view.fixedAreas.left - 1,
			0
		);
		this.engine.repaint();
	}

	public focusTable(): void {
		this.engine.requestFocus();
	}

	public setRowHeight(size: number): void {
		if (size < 10) {
			size = 10;
		} else if (size > 500) {
			size = 500;
		}

		const selections: ISelection[] = this.engine
			.getSelectionModel()
			.getSelections();
		if (selections.length <= 0) {
			return;
		}

		// Gather all selected rows
		const rows: Set<number> = new Set<number>();
		for (const selection of selections) {
			for (
				let row = selection.range.startRow;
				row <= selection.range.endRow;
				row++
			) {
				rows.add(row);
			}
		}

		// Set new size for all rows
		this.engine.getCellModel().resizeRows([...rows], size);
		this.engine.repaint();
	}

	public setColumnWidth(size: number): void {
		if (size < 10) {
			size = 10;
		} else if (size > 500) {
			size = 500;
		}

		const selections: ISelection[] = this.engine
			.getSelectionModel()
			.getSelections();
		if (selections.length <= 0) {
			return;
		}

		// Gather all selected columns
		const columns: Set<number> = new Set<number>();
		for (const selection of selections) {
			for (
				let column = selection.range.startColumn;
				column <= selection.range.endColumn;
				column++
			) {
				columns.add(column);
			}
		}

		// Set new size for all columns
		this.engine.getCellModel().resizeColumns([...columns], size);
		this.engine.repaint();
	}

	public mergeSelection(): void {
		const primary: ISelection | null = this.engine
			.getSelectionModel()
			.getPrimary();
		if (!!primary) {
			this.engine.getCellModel().mergeCells(primary.range);
			this.engine.repaint();
		}
	}

	public splitSelection(): void {
		const primary: ISelection | null = this.engine
			.getSelectionModel()
			.getPrimary();
		if (!!primary) {
			this.engine
				.getCellModel()
				.splitCell(primary.range.startRow, primary.range.startColumn);
			this.engine.repaint();
		}
	}

	public showHidden(): void {
		this.engine.getCellModel().showAll();
		this.engine.repaint();
	}

	public hideRows(): void {
		const selections: ISelection[] = this.engine
			.getSelectionModel()
			.getSelections();
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
		const selections: ISelection[] = this.engine
			.getSelectionModel()
			.getSelections();
		const toHide: number[] = [];
		for (const s of selections) {
			for (
				let column = s.range.startColumn;
				column <= s.range.endColumn;
				column++
			) {
				toHide.push(column);
			}
		}

		if (toHide.length > 0) {
			this.engine.getCellModel().hideColumns(toHide);
			this.engine.repaint();
		}
	}

	private static _borderStyleNameToStyle(styleName: string): BorderStyle {
		if (styleName === 'Solid') {
			return BorderStyle.SOLID;
		} else if (styleName === 'Dotted') {
			return BorderStyle.DOTTED;
		} else {
			return BorderStyle.DASHED;
		}
	}

	private static _rgbaStringToColor(rgbaStr: string): IColor {
		rgbaStr = rgbaStr.startsWith('rgba')
			? rgbaStr.substring(5, rgbaStr.length - 1)
			: rgbaStr.substring(4, rgbaStr.length - 1);
		const parts = rgbaStr.split(',');

		return {
			red: parseInt(parts[0].trim()),
			green: parseInt(parts[1].trim()),
			blue: parseInt(parts[2].trim()),
			alpha: parts.length === 4 ? parseFloat(parts[3].trim()) : 1.0,
		};
	}

	public setBorderTop(): void {
		const primary: ISelection | null = this.engine
			.getSelectionModel()
			.getPrimary();
		if (!!primary) {
			this.engine.getBorderModel().setBorder(
				{
					top: {
						size: this.borderSize,
						style: AppComponent._borderStyleNameToStyle(
							this.borderStyle
						),
						color: AppComponent._rgbaStringToColor(
							this.borderColor
						),
					},
				},
				primary.range
			);

			this.engine.repaint();
		}
	}

	public setBorderLeft(): void {
		const primary: ISelection | null = this.engine
			.getSelectionModel()
			.getPrimary();
		if (!!primary) {
			this.engine.getBorderModel().setBorder(
				{
					left: {
						size: this.borderSize,
						style: AppComponent._borderStyleNameToStyle(
							this.borderStyle
						),
						color: AppComponent._rgbaStringToColor(
							this.borderColor
						),
					},
				},
				primary.range
			);

			this.engine.repaint();
		}
	}

	public setBorderBottom(): void {
		const primary: ISelection | null = this.engine
			.getSelectionModel()
			.getPrimary();
		if (!!primary) {
			this.engine.getBorderModel().setBorder(
				{
					bottom: {
						size: this.borderSize,
						style: AppComponent._borderStyleNameToStyle(
							this.borderStyle
						),
						color: AppComponent._rgbaStringToColor(
							this.borderColor
						),
					},
				},
				primary.range
			);

			this.engine.repaint();
		}
	}

	public setBorderRight(): void {
		const primary: ISelection | null = this.engine
			.getSelectionModel()
			.getPrimary();
		if (!!primary) {
			this.engine.getBorderModel().setBorder(
				{
					right: {
						size: this.borderSize,
						style: AppComponent._borderStyleNameToStyle(
							this.borderStyle
						),
						color: AppComponent._rgbaStringToColor(
							this.borderColor
						),
					},
				},
				primary.range
			);

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

	public insertRows(count: number): void {
		let beforeIndex: number;
		const primary: ISelection | null = this.engine
			.getSelectionModel()
			.getPrimary();
		if (!!primary) {
			beforeIndex = primary.initial.row + 1;
		} else {
			beforeIndex = this.engine.getCellModel().getRowCount();
		}

		this.engine
			.getCellModel()
			.insertRows(beforeIndex, count, (row, column) => {
				if (column === 0) {
					return {
						range: {
							startRow: row,
							endRow: row,
							startColumn: column,
							endColumn: column,
						},
						rendererName: RowColumnHeaderRenderer.NAME,
						value: null,
					};
				}

				return null;
			});
		this.engine.repaint();
	}

	public insertColumns(count: number): void {
		let beforeIndex: number;
		const primary: ISelection | null = this.engine
			.getSelectionModel()
			.getPrimary();
		if (!!primary) {
			beforeIndex = primary.initial.column + 1;
		} else {
			beforeIndex = this.engine.getCellModel().getColumnCount();
		}

		this.engine
			.getCellModel()
			.insertColumns(beforeIndex, count, (row, column) => {
				if (row === 0) {
					return {
						range: {
							startRow: row,
							endRow: row,
							startColumn: column,
							endColumn: column,
						},
						rendererName: RowColumnHeaderRenderer.NAME,
						value: null,
					};
				}

				return null;
			});
		this.engine.repaint();
	}

	public deleteRows(): void {
		const primary: ISelection | null = this.engine
			.getSelectionModel()
			.getPrimary();
		if (!!primary) {
			let count: number = 0;
			for (
				let row = primary.range.startRow;
				row <= primary.range.endRow;
				row++
			) {
				if (!this.engine.getCellModel().isRowHidden(row)) {
					count++;
				}
			}
			this.engine
				.getCellModel()
				.deleteRows(primary.range.startRow, count);
			this.engine.repaint();
		}
	}

	public deleteColumns(): void {
		const primary: ISelection | null = this.engine
			.getSelectionModel()
			.getPrimary();
		if (!!primary) {
			let count: number = 0;
			for (
				let column = primary.range.startColumn;
				column <= primary.range.endColumn;
				column++
			) {
				if (!this.engine.getCellModel().isColumnHidden(column)) {
					count++;
				}
			}
			this.engine
				.getCellModel()
				.deleteColumns(primary.range.startColumn, count);
			this.engine.repaint();
		}
	}

	/**
	 * Called after the view is initialized.
	 */
	public ngAfterViewInit(): void {
		this.zone.runOutsideAngular(() => {
			const cellModel = AppComponent.initializeCellModel();
			this.engine = new TableEngine(
				this.tableContainer.nativeElement,
				cellModel
			);

			this.engine.getOptions().misc.debug = true; // Enable/Disable debug mode

			// Setup row/column resizing
			this.engine.getOptions().renderer.canvas.rowColumnResizing.allowResizing =
				true;
			this.engine.getOptions().renderer.canvas.rowColumnResizing.rowCount = 1;
			this.engine.getOptions().renderer.canvas.rowColumnResizing.columnCount = 1;

			// Setup copy-handle
			this.engine.getOptions().selection.copyHandle.showCopyHandle = true;
			this.engine.getOptions().selection.copyHandle.copyHandler = (
				origin,
				target
			) => {
				/*
				NOTE: The copy-handler is very simple and will just copy the value of the initial cell of
				the origin cell range to all the cells of the target cell range.
				You however may wish to have a more elaborate algorithm, which you are free to implement.
				 */

				// Only allow copying when all involved cells have the same size
				const originCells: ICell[] = this.engine
					.getCellModel()
					.getCells(origin);
				const width: number =
					originCells[0].range.endColumn -
					originCells[0].range.startColumn;
				const height: number =
					originCells[0].range.endRow - originCells[0].range.startRow;
				for (const cell of originCells) {
					const cellWidth: number =
						cell.range.endColumn - cell.range.startColumn;
					const cellHeight: number =
						cell.range.endRow - cell.range.startRow;

					if (cellWidth !== width || cellHeight !== height) {
						return; // Abort!
					}
				}

				const targetCells: ICell[] = this.engine
					.getCellModel()
					.getCells(target);
				for (const cell of targetCells) {
					const cellWidth: number =
						cell.range.endColumn - cell.range.startColumn;
					const cellHeight: number =
						cell.range.endRow - cell.range.startRow;

					if (cellWidth !== width || cellHeight !== height) {
						return; // Abort!
					}
				}

				// Copy cells in a very simple way, this can be made very elaborate, but we will simply copy the value of the initial cell to all involved cells
				const initialCell: ICell = this.engine
					.getCellModel()
					.getCell(
						this.engine.getSelectionModel().getPrimary().initial
							.row,
						this.engine.getSelectionModel().getPrimary().initial
							.column
					);
				const valueToCopy: any = !!initialCell ? initialCell.value : '';

				for (const cell of targetCells) {
					cell.value = JSON.parse(JSON.stringify(valueToCopy));
				}

				this.engine.repaint();
			};

			// Set row/column header selection transform
			// this.engine.getOptions().selection.selectionTransform =
			// 	ROW_COLUMN_HEADER_TRANSFORM;

			// Set initial state of fixed rows/columns
			this.engine.getOptions().renderer.view.fixedAreas = {
				top: 1,
				left: 1,
				bottom: 1,
				right: 1,
			};

			// Set notification service
			this.engine.getOptions().renderer.view.maxCellCountToCopy = 10000;
			this.engine.getOptions().renderer.notificationService = {
				notify: (notification: INotification) => {
					this.zone.run(() => {
						if (
							notification.id ===
							NotificationIDs.COPY_PERFORMANCE_WARNING
						) {
							this.snackbar
								.open(notification.message, 'Copy anyway', {
									duration: 6000,
									verticalPosition: 'bottom',
									horizontalPosition: 'center',
								})
								.afterDismissed()
								.subscribe((dismiss) => {
									(
										notification as CopyPerformanceWarningNotification
									).callback(dismiss.dismissedByAction);
								});
						} else if (notification.id === NotificationIDs.COPY) {
							this.snackbar.open(notification.message, 'OK', {
								duration: 3000,
								verticalPosition: 'bottom',
								horizontalPosition: 'center',
							});
						}
					});
				},
			};

			// Register needed cell renderers
			this.engine.registerCellRenderer(
				new TextCellRenderer({
					editable: true,
					horizontalAlignment: HorizontalAlignment.CENTER,
					verticalAlignment: VerticalAlignment.MIDDLE,
				})
			);
			this.engine.registerCellRenderer(new DebugCellRenderer());
			this.engine.registerCellRenderer(new RowColumnHeaderRenderer());
			this.engine.registerCellRenderer(new ImageCellRenderer());
			this.engine.registerCellRenderer(new LoadingCellRenderer());
			this.engine.registerCellRenderer(new CheckboxCellRenderer());
			this.engine.registerCellRenderer(new DOMCellRenderer());
			this.engine.registerCellRenderer(
				new RatingCellRenderer({
					editable: true,
				})
			);
			this.engine.registerCellRenderer(new ComboBoxCellRenderer());
			this.engine.registerCellRenderer(new ProgressCellRenderer());
			this.engine.registerCellRenderer(new ButtonCellRenderer());

			// Set an example border
			this.engine.getBorderModel().setBorder(
				{
					right: {
						style: BorderStyle.SOLID,
						size: 1,
						color: { red: 255, blue: 0, green: 0, alpha: 1 },
					},
					bottom: {
						style: BorderStyle.SOLID,
						size: 2,
						color: { red: 0, blue: 0, green: 255, alpha: 1 },
					},
					left: {
						style: BorderStyle.SOLID,
						size: 3,
						color: { red: 0, blue: 255, green: 0, alpha: 1 },
					},
					top: {
						style: BorderStyle.SOLID,
						size: 4,
						color: { red: 255, blue: 0, green: 100, alpha: 1 },
					},
				},
				{
					startRow: 2,
					endRow: 4,
					startColumn: 2,
					endColumn: 3,
				}
			);

			this.engine.getBorderModel().setBorderLine(
				10,
				2,
				{
					style: BorderStyle.DOTTED,
					size: 3,
					color: { red: 140, blue: 180, green: 160, alpha: 1.0 },
				},
				{ bottom: true, top: true }
			);

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
						endColumn: 8,
					},
					rendererName: LoadingCellRenderer.NAME,
					value: {
						cellRenderer: ImageCellRenderer.NAME,
						promiseSupplier: async () => {
							return new Promise((resolve) =>
								setTimeout(
									() =>
										resolve({
											src: 'assets/sloth.svg',
										} as IImageCellRendererValue),
									3000
								)
							);
						},
					} as ILoadingCellRendererValue,
				},
				{
					range: CellRange.fromSingleRowColumn(25, 4),
					rendererName: TextCellRenderer.NAME,
					value: {
						text: 'This is a cell for which we enabled line wrapping since this text is pretty long and will not fit into the cells available space.',
						options: {
							useLineWrapping: true,
							horizontalAlignment: HorizontalAlignment.LEFT,
							verticalAlignment: VerticalAlignment.BOTTOM,
						},
					} as ITextCellRendererValue,
				},
				{
					range: CellRange.fromSingleRowColumn(1000, 1000),
					rendererName: TextCellRenderer.NAME,
					value: 'Last cell with more text than normally',
				},
				{
					range: {
						startRow: 22,
						endRow: 26,
						startColumn: 9,
						endColumn: 11,
					},
					rendererName: DebugCellRenderer.NAME,
					value: null,
				},
				{
					range: CellRange.fromSingleRowColumn(10, 2),
					rendererName: LoadingCellRenderer.NAME,
					value: {
						cellRenderer: TextCellRenderer.NAME,
						promiseSupplier: async () => {
							return new Promise((resolve) =>
								setTimeout(() => resolve('Done 😀'), 2000)
							);
						},
					} as ILoadingCellRendererValue,
				},
				{
					range: CellRange.fromSingleRowColumn(13, 3),
					rendererName: CheckboxCellRenderer.NAME,
					value: {
						checked: false,
					} as ICheckboxCellRendererValue,
				},
				{
					range: CellRange.fromSingleRowColumn(14, 3),
					rendererName: CheckboxCellRenderer.NAME,
					value: {
						checked: false,
						label: 'with Label',
					} as ICheckboxCellRendererValue,
				},
				{
					range: {
						startRow: 30,
						endRow: 33,
						startColumn: 3,
						endColumn: 3,
					},
					rendererName: TextCellRenderer.NAME,
					value: {
						text: 'HTML/DOM cell renderer:',
						options: {
							horizontalAlignment: HorizontalAlignment.RIGHT,
							verticalAlignment: VerticalAlignment.MIDDLE,
							fontSize: 18,
							useLineWrapping: true,
							editable: false,
						},
					} as ITextCellRendererValue,
				},
				{
					range: {
						startRow: 30,
						endRow: 40,
						startColumn: 4,
						endColumn: 5,
					},
					rendererName: DOMCellRenderer.NAME,
					value: `
<div style='padding: 5px; user-select: none'>
	<p>The Table-Engine is able to render HTML in a cell</p>
	<p><button>A button for example!</button></p>
	<ul>
		<li>Or</li>
		<li>a</li>
		<li>list!</li>
	</ul>
	<p style='color: darkred'>Nevertheless use these types of renderers <strong>sparingly</strong>, as they may result in poor performance</p>
</div>
`,
				},
				{
					range: CellRange.fromSingleRowColumn(16, 3),
					rendererName: RatingCellRenderer.NAME,
					value: 3.5,
				},
				{
					range: CellRange.fromSingleRowColumn(18, 3),
					rendererName: ComboBoxCellRenderer.NAME,
					value: {
						select_options: {
							apple: { label: 'Apple' },
							banana: { label: 'Banana' },
							orange: { label: 'Orange' },
						},
					} as IComboBoxCellRendererValue,
				},
				{
					range: CellRange.fromSingleRowColumn(19, 3),
					rendererName: ComboBoxCellRenderer.NAME,
					value: {
						selected_option_id: 'cow',
						select_options: {
							cat: { label: 'Meow' },
							dog: { label: 'Woof' },
							wolf: { label: 'Howl' },
							chicken: { label: 'Bah-gawk' },
							cow: { label: 'Moo' },
							bear: { label: 'Roar' },
							bee: { label: 'Buzz' },
							cricket: { label: 'Chirp' },
							duck: { label: 'Quack' },
						},
					} as IComboBoxCellRendererValue,
				},
				{
					range: CellRange.fromSingleRowColumn(13, 2),
					rendererName: ProgressCellRenderer.NAME,
					value: 0.4,
				},
				{
					range: CellRange.fromSingleRowColumn(14, 2),
					rendererName: ButtonCellRenderer.NAME,
					value: {
						label: 'Test',
						options: {
							onClick: (cell) =>
								alert("You pressed the 'Test' button!"),
						},
					} as IButtonCellRendererValue,
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
			new Set<number>(),
			new Set<number>()
		);

		model.mergeCells({
			startRow: 2,
			endRow: 4,
			startColumn: 2,
			endColumn: 3,
		});

		// Resize row with index 25
		model.resizeRows([25], 100);

		return model;
	}
}
