/**
 * All available renderers.
 */
export enum RendererType {

	/**
	 * Renderer using HTML5 canvas to draw a table.
	 */
	CANVAS,

	/**
	 * Skia CanvasKit renderer.
	 */
	CANVAS_KIT,

	/**
	 * A custom renderer you may define yourself.
	 */
	CUSTOM

}


