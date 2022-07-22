import { NotificationType } from './notification-type';

/**
 * A notification that may carry information of warnings to the user.
 */
export interface INotification {
	/**
	 * Type of the notification.
	 */
	type: NotificationType;

	/**
	 * Unique notification ID.
	 */
	id: string;

	/**
	 * Message of the notification.
	 */
	message: string;
}
