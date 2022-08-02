import { IRectangle, ISize } from '../util';
import { IFixedAreaInfos } from './canvas';

export interface IViewportManager {
	getViewportSize(): ISize;
	getViewport(): IRectangle;

	/**
	 * Get infos about the fixed areas in the viewport.
	 */
	getFixedAreaInfos(): IFixedAreaInfos;
}
