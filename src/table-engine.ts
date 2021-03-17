import CanvasKitInit, {CanvasKit, Surface} from "canvaskit-wasm";
import {ICellModel} from "./cell/model/cell-model.interface";
import {CellModel} from "./cell/model/cell-model";
import {CellRange} from "./cell/range/cell-range";

/**
 * Entry point of the table engine library.
 */
export class TableEngine {

	/**
	 * Cell model of the table engine.
	 */
	private readonly _cellModel: ICellModel;

	constructor(canvasElement: HTMLCanvasElement) {
		// TODO: Let the user specify the start state of the cell model
		this._cellModel = CellModel.generate(
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

		// (CanvasKitInit as any)({
		// 	locateFile: (file: string) => 'https://unpkg.com/canvaskit-wasm@0.25.0/bin/' + file, // TODO This needs to be done in a better way
		// }).then((canvasKit: CanvasKit) => {
		// 	const surface: any = canvasKit.MakeCanvasSurface(canvasElement);
		//
		// 	const paint = new canvasKit.Paint();
		// 	paint.setColor(canvasKit.Color4f(0.9, 0, 0, 1.0));
		// 	paint.setStyle(canvasKit.PaintStyle.Stroke);
		// 	paint.setAntiAlias(true);
		// 	const rr = canvasKit.RRectXY(canvasKit.LTRBRect(10, 60, 210, 260), 25, 15);
		//
		// 	function draw(canvas: any) {
		// 		canvas.clear(canvasKit.WHITE);
		// 		canvas.drawRRect(rr, paint);
		// 	}
		//
		// 	surface.drawOnce(draw);
		// });
	}

	/**
	 * Get the table engines cell model.
	 */
	public getCellModel(): ICellModel {
		return this._cellModel;
	}

}
