import {IBorderSide} from "./border-side";

/**
 * The default border collision resolver.
 * @param sideA first side
 * @param sideB second side
 */
const DEFAULT_BORDER_COLLISION_RESOLVER: (sideA: IBorderSide, sideB: IBorderSide) => IBorderSide = (sideA, sideB) => {
	return sideA.priority > sideB.priority ? sideA : sideB;
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

}

/**
 * Function used to fill the options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: IBorderOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.borderCollisionResolver) {
		options.borderCollisionResolver = DEFAULT_BORDER_COLLISION_RESOLVER;
	}

	return options;
};
