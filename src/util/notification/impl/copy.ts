import {INotification} from "../notification";
import {NotificationType} from "../notification-type";
import {NotificationIDs} from "../notification-ids";

/**
 * Copy notification signaling a successful copy operation.
 */
export class CopyNotification implements INotification {

	get id(): string {
		return NotificationIDs.COPY;
	}

	get type(): NotificationType {
		return NotificationType.INFO;
	}

	get message(): string {
		return "Copied selected cells.";
	}

}
