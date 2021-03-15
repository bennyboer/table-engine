import {InlineWorker} from "./util/worker/inline-worker";
import CanvasKitInit, {CanvasKit, Surface} from "canvaskit-wasm";

/**
 * Entry point of the table engine library.
 */
export class TableEngine {
	constructor(canvasElement: HTMLCanvasElement) {
		const worker: TestWorker = new TestWorker();

		worker.postMessage("What are you doing?");

		(CanvasKitInit as any)({
			locateFile: (file: string) => 'https://unpkg.com/canvaskit-wasm@0.25.0/bin/' + file,
		}).then((canvasKit: CanvasKit) => {
			const surface: any = canvasKit.MakeCanvasSurface(canvasElement);

			const paint = new canvasKit.Paint();
			paint.setColor(canvasKit.Color4f(0.9, 0, 0, 1.0));
			paint.setStyle(canvasKit.PaintStyle.Stroke);
			paint.setAntiAlias(true);
			const rr = canvasKit.RRectXY(canvasKit.LTRBRect(10, 60, 210, 260), 25, 15);

			function draw(canvas: any) {
				canvas.clear(canvasKit.WHITE);
				canvas.drawRRect(rr, paint);
			}

			surface.drawOnce(draw);
		});
	}
}

export class TestWorker extends InlineWorker<string> {

	constructor() {
		super(function (this: any) {
			const self = this;

			self.onmessage = (message: MessageEvent<string>) => {
				console.log(`Received message in TestWorker: ${message.data}`);

				self.postMessage("Hello World");
			}
		});

		this.onMessage().subscribe((message) => {
			console.log(`Received message in main thread: ${message.data}`);
		});
	}

}
