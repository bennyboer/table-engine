import {ITableEngineRenderer} from "./renderer";
import {RendererType} from "./renderers";
import {CanvasKitRenderer} from "./canvaskit/canvas-kit-renderer";
import {CanvasRenderer} from "./canvas/canvas-renderer";

/**
 * Factory for table-engine renderers.
 */
export class RendererFactory {

	/**
	 * Mapping of renderer types to their concrete implementation supplier.
	 */
	private static _AVAILABLE_RENDERERS: Map<RendererType, () => ITableEngineRenderer>;

	/**
	 * Initialize the renderer map.
	 */
	private static _initializeRendererMap(): void {
		// Check if already initialized
		const isAlreadyInitialized: boolean = !!RendererFactory._AVAILABLE_RENDERERS;
		if (isAlreadyInitialized) {
			return; // Nothing to do
		}

		// Initialize map
		RendererFactory._AVAILABLE_RENDERERS = new Map<RendererType, () => ITableEngineRenderer>()

		// Register renderers
		RendererFactory.registerRenderer(RendererType.CANVAS, () => new CanvasRenderer());
		RendererFactory.registerRenderer(RendererType.CANVAS_KIT, () => new CanvasKitRenderer());
	}

	/**
	 * Register a renderer for the table engine.
	 * Note that this method may override already registered renderer types.
	 * @param type of the renderer to register
	 * @param initializer supplier to initialize the renderer instance
	 */
	public static registerRenderer(type: RendererType, initializer: () => ITableEngineRenderer): void {
		this._initializeRendererMap();

		this._AVAILABLE_RENDERERS.set(type, initializer);
	}

	/**
	 * Retrieve a new instance of a renderer for the given type.
	 * @param type of the renderer to fetch
	 */
	public static getRendererInstance(type: RendererType): ITableEngineRenderer {
		this._initializeRendererMap();

		const rendererInitializer = this._AVAILABLE_RENDERERS.get(type);

		if (!rendererInitializer) {
			throw new Error(`There is no initializer for the renderer type '${RendererType[type]}' defined`);
		}

		return rendererInitializer();
	}

}
