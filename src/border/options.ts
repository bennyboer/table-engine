import {IBorderSide} from "./border-side";
import {IBorder} from "./border";
import {BorderStyle} from "./border-style";

/**
 * The default border collision resolver.
 * @param sideA first side
 * @param sideB second side
 */
const DEFAULT_BORDER_COLLISION_RESOLVER: (sideA: IBorderSide, sideB: IBorderSide) => IBorderSide = (sideA, sideB) => {
	if (!!sideA && !!sideB) {
		return sideA.priority > sideB.priority ? sideA : sideB;
	} else if (!!sideA) {
		return sideA;
	} else if (!!sideB) {
		return sideB;
	}

	return sideA;
};

/**
 * Default border sides to use.
 */
const DEFAULT_BORDER_SIDE: IBorderSide = {
	priority: 0,
	isDefault: true,
	color: {red: 230, green: 230, blue: 230, alpha: 1.0},
	size: 1,
	style: BorderStyle.SOLID
};

/**
 * The default border to display if no custom borders have been set.
 */
const DEFAULT_BORDER: IBorder = {
	left: DEFAULT_BORDER_SIDE,
	right: DEFAULT_BORDER_SIDE,
	bottom: DEFAULT_BORDER_SIDE,
	top: DEFAULT_BORDER_SIDE
};

/**
 * Options for the border model.
 */
export interface IBorderOptions {

	/**
	 * Resolver for a border collision.
	 * It may happen that two neighbouring cells define different border sides
	 * between them.
	 * We need to resolve that conflict via so-called "border collision resolvers".
	 * So this method decides whether to priorize side A or B.
	 *
	 * @param sideA first side
	 * @param sideB second side
	 */
	borderCollisionResolver?: (sideA: IBorderSide, sideB: IBorderSide) => IBorderSide;

	/**
	 * Default border to use when no border has been specified for a cell.
	 * If defaultBorderSupplier is specified as well, the supplier is called instead of this.
	 */
	defaultBorder?: IBorder;

	/**
	 * Supplier for the default border to use.
	 * If you do not want any borders by default just return null.
	 * If this is specified, defaultBorder will not be used anymore.
	 * @param row to display border at
	 * @param column to display border at
	 */
	defaultBorderSupplier?: (row: number, column: number) => IBorder;

}

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: IBorderOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.defaultBorder) {
		options.defaultBorder = DEFAULT_BORDER;
	}

	if (!options.borderCollisionResolver) {
		options.borderCollisionResolver = DEFAULT_BORDER_COLLISION_RESOLVER;
	}

	return options;
};
