import { TableEngineEventType } from './event-type';

/**
 * Event that may occur in the table engine.
 */
export interface ITableEngineEvent {
	/**
	 * Type of the event.
	 */
	type: TableEngineEventType;
}
