import { IProgressCellRendererOptions } from './progress-cell-renderer-options';

export interface IProgressCellRendererValue {
	/**
	 * Progress is a number in range [0.0; 1.0].
	 */
	progress?: number;

	options?: IProgressCellRendererOptions;
}
