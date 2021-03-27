import {BorderStyle} from "./border-style";
import {IColor} from "../util/color";

/**
 * A single side of a border.
 */
export interface IBorderSide {

	/**
	 * Priority of the border side.
	 * This can be used to resolve border collision conflicts when
	 * two neighbouring cells have different borders set between them.
	 * The priority is higher when set later.
	 * For example when we have two sides A and B:
	 * - A's priority = 3
	 * - B's priority = 6
	 * then we can say that B has been set at a later time by the user
	 * than A and show B instead of A.
	 */
	priority?: number;

	/**
	 * Whether the border side is the default border side.
	 */
	isDefault?: boolean;

	/**
	 * Style of the border line.
	 */
	style: BorderStyle;

	/**
	 * Border line size.
	 */
	size: number;

	/**
	 * Color of the line.
	 */
	color: IColor;

}
