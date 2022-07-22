import { INotification } from './notification';

/**
 * Service receiving notifications from the table (infos and warnings).
 */
export interface INotificationService {
	/**
	 * Called on a notification.
	 * @param notification that has been received
	 */
	notify(notification: INotification): void;
}
