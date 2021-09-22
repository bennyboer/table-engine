import {ICanvasCellRenderer} from "../canvas-cell-renderer";
import {ICell} from "../../../../cell/cell";
import {IRectangle} from "../../../../util/rect";
import {TableEngine} from "../../../../table-engine";
import {IRenderContext} from "../../canvas-renderer";
import {ICellRendererEventListener} from "../../../cell/event/cell-renderer-event-listener";

/**
 * Cell renderer for rendering images.
 */
export class ImageCellRenderer implements ICanvasCellRenderer {

	/**
	 * Name of the cell renderer.
	 */
	public static readonly NAME: string = "image";

	/**
	 * Cache for already loaded images.
	 */
	private readonly _imageCache: Map<string, CanvasImageSource> = new Map<string, CanvasImageSource>();

	/**
	 * Reference to the table-engine.
	 */
	private _engine: TableEngine;

	/**
	 * Initialize the cell renderer.
	 * This is only called once.
	 * @param engine reference to the table-engine
	 */
	public initialize(engine: TableEngine): void {
		this._engine = engine;
	}

	/**
	 * Get the name of the cell renderer.
	 * This must be unique.
	 */
	public getName(): string {
		return ImageCellRenderer.NAME;
	}

	/**
	 * Called before rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 * @param context of the current rendering cycle
	 */
	public before(ctx: CanvasRenderingContext2D, context: IRenderContext): void {
		ctx.font = "12px sans-serif";
		ctx.fillStyle = "#333333";
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
	}

	/**
	 * Called after rendering ALL cells to render for this renderer
	 * in the current rendering cycle.
	 * @param ctx to render with
	 */
	public after(ctx: CanvasRenderingContext2D): void {
		// Nothing to do
	}

	/**
	 * Called when there are no cells that need to be rendered with the renderer in
	 * the current viewport.
	 */
	public cleanup(): void {
		// Nothing to cleanup
	}

	/**
	 * Get the event listeners on cells for this cell renderer.
	 */
	public getEventListener(): ICellRendererEventListener | null {
		return null;
	}

	/**
	 * Render the given cell in the passed bounds.
	 * @param ctx context to render with
	 * @param cell to render
	 * @param bounds to render cell in
	 */
	public render(ctx: CanvasRenderingContext2D, cell: ICell, bounds: IRectangle): void {
		if (cell.value !== null) {
			const value: IImageCellRendererValue = cell.value as IImageCellRendererValue;

			const image: CanvasImageSource | null = this._getImageIfLoaded(value.src);
			if (!!image) {
				// Scale image to bounds
				const hasWidth: boolean = value.width !== null && value.width !== undefined;
				const hasHeight: boolean = value.height !== null && value.height !== undefined;

				const originalWidth: number = image.width as number;
				const originalHeight: number = image.height as number;

				const aspectRatio: number = originalWidth / originalHeight;

				let width: number = value.width;
				let height: number = value.height;
				if (hasWidth && !hasHeight) {
					// Calculate height
					height = value.width / aspectRatio;
				} else if (hasHeight && !hasWidth) {
					// Calculate width
					width = value.height * aspectRatio;
				} else if (!hasWidth && !hasHeight) {
					// Scale image to cell size
					const scaleFactor: number = Math.min(bounds.width / originalWidth, bounds.height / originalHeight);
					width = originalWidth * scaleFactor;
					height = originalHeight * scaleFactor;
				}

				if (width > bounds.width || height > bounds.height) {
					// Image dimensions do not really fit into cell -> crop image
					const overlapX: number = width > bounds.width ? width - bounds.width : 0;
					const overlapY: number = height > bounds.height ? height - bounds.height : 0;

					const actualWidth: number = width - overlapX;
					const actualHeight: number = height - overlapY;

					ctx.drawImage(
						image,
						overlapX / 2,
						overlapY / 2,
						actualWidth,
						actualHeight,
						bounds.left + (bounds.width - actualWidth) / 2,
						bounds.top + (bounds.height - actualHeight) / 2,
						actualWidth,
						actualHeight
					);
				} else {
					ctx.drawImage(
						image,
						bounds.left + (bounds.width - width) / 2,
						bounds.top + (bounds.height - height) / 2,
						width,
						height
					);
				}
			} else {
				ctx.fillText("Loading...", Math.round(bounds.left + bounds.width / 2), Math.round(bounds.top + bounds.height / 2));
			}
		}
	}

	/**
	 * Get the image with the given src path/url if already loaded.
	 * Otherwise load it and return null in the mean time.
	 * @param src to get image from
	 */
	private _getImageIfLoaded(src: string): CanvasImageSource | null {
		const result = this._imageCache.get(src);
		if (!!result) {
			return result;
		}

		this._loadImage(src).then((image) => {
			// Cache image
			this._imageCache.set(src, image);

			// Repaint table
			this._engine.repaint();
		});

		return null;
	}

	/**
	 * Load the image with the given src path/url.
	 * @param src to load image from
	 */
	private async _loadImage(src: string): Promise<CanvasImageSource> {
		const image = new Image();
		const promise = new Promise<void>((resolve) => {
			image.addEventListener("load", () => {
				resolve();
			}, false);
		})
		image.src = src;

		await promise;

		return image;
	}

	/**
	 * Get the copy value of the passed cell rendered with this renderer.
	 * This may be a HTML representation of the value (for example for copying formatting, lists, ...).
	 */
	public getCopyValue(cell: ICell): string {
		const image: CanvasImageSource | null = this._getImageIfLoaded(cell.value.src);
		if (!!image) {
			const bounds: IRectangle = this._engine.getCellModel().getBounds(cell.range);

			const copyCanvas: HTMLCanvasElement = document.createElement("canvas");
			copyCanvas.width = bounds.width;
			copyCanvas.height = bounds.height;

			const ctx: CanvasRenderingContext2D = copyCanvas.getContext("2d");

			this.render(ctx, cell, {
				left: 0,
				top: 0,
				width: bounds.width,
				height: bounds.height
			});

			return `<img src="${copyCanvas.toDataURL()}">`;
		} else {
			return "";
		}
	}

	/**
	 * Called when the passed cell is disappearing from the visible area (viewport).
	 * @param cell that is disappearing
	 */
	public onDisappearing(cell: ICell): void {
		// Do nothing
	}

}

/**
 * Value for the image cell renderer.
 */
export interface IImageCellRendererValue {

	/**
	 * Src to load image from.
	 */
	src: string;

	/**
	 * Width of the image (or null).
	 */
	width?: number;

	/**
	 * Height of the image (or null).
	 */
	height?: number;

}
