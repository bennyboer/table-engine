import {INotification} from "../notification";
import {NotificationType} from "../notification-type";
import {NotificationIDs} from "../notification-ids";

export class CopyPerformanceWarningNotification implements INotification {

	/**
	 * Limit of cells to copy.
	 */
	private readonly limit: number;

	/**
	 * Count of cells the user is trying to copy.
	 */
	private readonly cellCountToCopy: number;

	/**
	 * Callback used to copy despite the warning.
	 */
	private _callback?: (copyAnyway: boolean) => void;

	constructor(limit: number, cellCountToCopy: number) {
		this.limit = limit;
		this.cellCountToCopy = cellCountToCopy;
	}

	get type(): NotificationType {
		return NotificationType.WARNING;
	}

	get id(): string {
		return NotificationIDs.COPY_PERFORMANCE_WARNING;
	}

	get message(): string {
		return `Copy prevented. You are trying to copy about ${this.cellCountToCopy} cells which is above the limit of ${this.limit} cells. If you try to copy despite this warning, you may face performance issues.`;
	}

	get callback(): (copyAnyway: boolean) => void {
		return this._callback;
	}

	set callback(value: (copyAnyway: boolean) => void) {
		this._callback = value;
	}

}
