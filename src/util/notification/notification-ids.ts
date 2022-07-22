/**
 * Available notification IDs.
 */
export class NotificationIDs {
	/**
	 * Warning that is emitted, when trying to copy more cells than configured using the
	 * IViewOptions.maxCellCountToCopy option.
	 */
	public static readonly COPY_PERFORMANCE_WARNING: string =
		'copy.performance-warning';

	/**
	 * Info about a successful copy operation.
	 */
	public static readonly COPY: string = 'copy.success';
}
