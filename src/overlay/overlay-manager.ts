import { IOverlay } from './overlay';

/**
 * Manager for overlays.
 */
export interface IOverlayManager {
	/**
	 * Add an overlay.
	 * @param overlay to add
	 */
	addOverlay(overlay: IOverlay): void;

	/**
	 * Remove the passed overlay.
	 * @param overlay to remove
	 */
	removeOverlay(overlay: IOverlay): void;

	/**
	 * Get all available overlays.
	 */
	getOverlays(): IOverlay[];

	/**
	 * Update the given overlay.
	 * @param overlay to update
	 */
	updateOverlay(overlay: IOverlay): void;
}
