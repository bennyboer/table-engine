import {ITableEngineRenderer} from "../renderer";
import {IRendererOptions} from "../options";
import {ICellModel} from "../../cell/model/cell-model.interface";
import CanvasKitInit, {CanvasKit, Surface, Canvas, FontMgr} from "canvaskit-wasm";
import {IRectangle} from "../../util/rect";
import {ICell} from "../../cell/cell";

/**
 * Declaration of FontFace as this is currently not supported by the TypeScript lib.
 */
declare const FontFace: any;

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

	private _test_font_mgr: FontMgr;

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

		// TODO Remove - the next code lines are just for testing
		const response = await fetch('https://storage.googleapis.com/skia-cdn/google-web-fonts/Roboto-Regular.ttf');
		const fontData = await response.arrayBuffer();
		this._test_font_mgr = this._canvasKit.FontMgr.FromData(fontData);
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

		const viewPort: IRectangle = {
			top: 0,
			left: 0,
			width: this._canvasElement.width,
			height: this._canvasElement.height
		};
		const cells = this._cellModel.getCellsForRect(viewPort);
		const cellBounds: IRectangle[] = new Array(cells.length);
		for (let i = 0; i < cells.length; i++) {
			cellBounds[i] = this._cellModel.getBounds(cells[i].range);
		}

		const paragraphStyle = new kit.ParagraphStyle({
			textStyle: {
				color: kit.BLACK,
				fontFamilies: ['Roboto'],
				fontSize: 11,
			},
			textAlign: kit.TextAlign.Left,
			ellipsis: '...',
		});

		const time = window.performance.now();
		this._requestAnimationFrame((canvas: Canvas) => {
			canvas.clear(kit.WHITE);

			for (let i = 0; i < cells.length; i++) {
				const cell: ICell = cells[i];
				const bounds: IRectangle = cellBounds[i];

				const paragraphBuilder = kit.ParagraphBuilder.Make(paragraphStyle, this._test_font_mgr);
				paragraphBuilder.addText(`${cell.value}`);
				const paragraph = paragraphBuilder.build();

				paragraph.layout(bounds.width);
				canvas.drawParagraph(paragraph, bounds.left, bounds.top);
			}
		});
		console.log(`Rendering took ${window.performance.now() - time}ms`);
	}

	/**
	 * Draw once with the provided function.
	 * @param drawFct to execute
	 */
	private _requestAnimationFrame(drawFct: (Canvas) => void): void {
		(this._surface as any).requestAnimationFrame(drawFct);
	}

	/**
	 * Cleanup the renderer when no more needed.
	 */
	public cleanup(): void {
		this._surface.dispose();
		this._surface.delete();
	}

}
