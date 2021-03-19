import {ITableEngineRenderer} from "../renderer";
import {IRendererOptions} from "../options";
import {ICellModel} from "../../cell/model/cell-model.interface";
import CanvasKitInit, {CanvasKit, Surface, Canvas} from "canvaskit-wasm";

/**
 * Renderer of the table engine leveraging Skia CanvasKit.
 */
export class CanvasKitRenderer implements ITableEngineRenderer {

	/**
	 * Container the renderer should operate on.
	 */
	private _container: HTMLElement;

	/**
	 * Cell model to render cells from.
	 */
	private _cellModel: ICellModel;

	/**
	 * Options of the renderer.
	 */
	private _options: IRendererOptions;

	/**
	 * HTML canvas element to render on.
	 */
	private _canvasElement: HTMLCanvasElement;

	/**
	 * Skia CanvasKit reference to render with.
	 */
	private _canvasKit: CanvasKit;

	/**
	 * CanvasKit surface we're able to draw on.
	 */
	private _surface: Surface;

	/**
	 * Set the given width and height to the passed canvas HTML element.
	 * @param element the canvas element to set the size to
	 * @param width new width of the element to set
	 * @param height new height of the element to set
	 */
	private static _setCanvasSize(element: HTMLCanvasElement, width: number, height: number): void {
		/*
		We honor window.devicePixelRatio here to support high-DPI screens.
		To support High-DPI screens we will set the canvas element size twice:
			1. As style: width and height will be the same as in the container element bounds
			2. As attributes to the HTML canvas element: width and height need to be multiplied by
			   window.devicePixelRatio (for example 2.0 for most SmartPhones and 4K screens).

		If we don't do this the table will be rendered blurry on High-DPI screens/devices.
		 */

		const devicePixelRatio: number = window.devicePixelRatio;

		element.width = width * devicePixelRatio;
		element.height = height * devicePixelRatio;

		element.style.width = `${width}px`;
		element.style.height = `${height}px`;
	}

	/**
	 * Initialize the renderer with the given options on the passed HTML container.
	 * @param container to initialize renderer in
	 * @param cellModel to render cells from
	 * @param options of the renderer
	 */
	public async initialize(container: HTMLElement, cellModel: ICellModel, options: IRendererOptions): Promise<void> {
		this._container = container;
		this._cellModel = cellModel;
		this._options = options;

		this._initializeRenderingCanvasElement();
		await this._initializeCanvasKit();
	}

	/**
	 * Initialize the rendering canvas element to use.
	 */
	private _initializeRenderingCanvasElement(): void {
		const bounds: DOMRect = this._container.getBoundingClientRect();

		// The container might have children -> clear them just to make sure
		while (this._container.hasChildNodes()) {
			this._container.removeChild(this._container.lastChild);
		}

		// Create HTML canvas element
		this._canvasElement = document.createElement("canvas");
		CanvasKitRenderer._setCanvasSize(this._canvasElement, bounds.width, bounds.height);

		// Append it to the container
		this._container.appendChild(this._canvasElement);
	}

	/**
	 * Initialize Skia CanvasKit.
	 */
	private async _initializeCanvasKit(): Promise<void> {
		const canvasKitInitializer = (CanvasKitInit as any);

		this._canvasKit = await canvasKitInitializer({
			locateFile: (file: string) => `${this._options.canvasKit.canvasKitLibBinURL}${file}`
		});

		this._surface = this._canvasKit.MakeCanvasSurface(this._canvasElement);
	}

	/**
	 * (Re)-Render the table.
	 */
	public render(): void {
		const kit = this._canvasKit;
		const surface = this._surface;

		// TODO Draw a table!

		const paint = new kit.Paint();
		paint.setColor(kit.Color4f(0.9, 0, 0, 1.0));
		paint.setStyle(kit.PaintStyle.Stroke);
		paint.setAntiAlias(true);
		const rr = kit.RRectXY(kit.LTRBRect(10, 60, 210, 260), 25, 15);

		(surface as any).drawOnce(function draw(canvas: Canvas) {
			canvas.clear(kit.WHITE);
			canvas.drawRRect(rr, paint);
		});
	}

}
