import {HorizontalAlignment} from "./horizontal-alignment";
import {VerticalAlignment} from "./vertical-alignment";

/**
 * Utility providing methods helping with dealing with alignments.
 */
export class AlignmentUtil {

	/**
	 * Convert a horizontal alignment to its style string representation.
	 * @param alignment to convert
	 */
	public static horizontalAlignmentToStyleStr(alignment: HorizontalAlignment): string {
		switch (alignment) {
			case HorizontalAlignment.CENTER:
				return "center";
			case HorizontalAlignment.LEFT:
				return "left";
			case HorizontalAlignment.RIGHT:
				return "right";
		}
	}

	/**
	 * Convert a vertical alignment to its style string representation.
	 * @param alignment to convert
	 */
	public static verticalAlignmentToStyleStr(alignment: VerticalAlignment): string {
		switch (alignment) {
			case VerticalAlignment.TOP:
				return "top";
			case VerticalAlignment.MIDDLE:
				return "middle";
			case VerticalAlignment.BOTTOM:
				return "bottom";
		}
	}

}
