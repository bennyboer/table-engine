import { IBorderSide } from './border-side';

/**
 * Representation of a border in the table-engine.
 */
export interface IBorder {
	/**
	 * Top border side.
	 */
	top?: IBorderSide;

	/**
	 * Top border side.
	 */
	left?: IBorderSide;

	/**
	 * Top border side.
	 */
	right?: IBorderSide;

	/**
	 * Top border side.
	 */
	bottom?: IBorderSide;
}
