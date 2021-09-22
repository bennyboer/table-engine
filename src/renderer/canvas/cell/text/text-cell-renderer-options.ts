import {IColor} from "../../../../util/color";
import {HorizontalAlignment} from "../../../../util/alignment/horizontal-alignment";
import {VerticalAlignment} from "../../../../util/alignment/vertical-alignment";
import {Colors} from "../../../../util/colors";
import {ICell} from "../../../../cell/cell";

/**
 * The default font family in use.
 */
export const DEFAULT_FONT_FAMILY: string = "sans-serif";

/**
 * The default font size in use (in pixel).
 */
export const DEFAULT_FONT_SIZE: number = 12;

/**
 * Default text color in use.
 */
export const DEFAULT_TEXT_COLOR: IColor = Colors.BLACK;

/**
 * Default horizontal alignment in use.
 */
export const DEFAULT_HORIZONTAL_ALIGNMENT: HorizontalAlignment = HorizontalAlignment.LEFT;

/**
 * Default vertical alignment in use.
 */
export const DEFAULT_VERTICAL_ALIGNMENT: VerticalAlignment = VerticalAlignment.MIDDLE;

/**
 * Default line height in use.
 */
export const DEFAULT_LINE_HEIGHT: number = 16;

/**
 * Options of the text cell renderer.
 */
export interface ITextCellRendererOptions {

	/**
	 * Callback called when the value of the text cell renderer has been edited.
	 * @param cell that contains the changed value
	 * @returns whether the change is to be accepted or declined
	 */
	onChange?: (cell: ICell, oldValue: string, newValue: string) => boolean;

	/**
	 * Font family name.
	 */
	fontFamily?: string;

	/**
	 * Font size (in pixel).
	 */
	fontSize?: number;

	/**
	 * Text color.
	 */
	color?: IColor;

	/**
	 * Horizontal alignment of the text.
	 */
	horizontalAlignment?: HorizontalAlignment;

	/**
	 * Vertical alignment of the text.
	 */
	verticalAlignment?: VerticalAlignment;

	/**
	 * Whether to use line wrapping.
	 */
	useLineWrapping?: boolean;

	/**
	 * Line height.
	 * Used when line wrapping is enabled.
	 */
	lineHeight?: number;

	/**
	 * Whether the cell is editable.
	 */
	editable?: boolean;

}

/**
 * Function used to fill the text cell renderer options
 * where there are no options set by the user.
 */
export const fillOptions = (options?: ITextCellRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (!options.fontFamily) {
		options.fontFamily = DEFAULT_FONT_FAMILY;
	}

	if (options.fontSize === null || options.fontSize === undefined) {
		options.fontSize = DEFAULT_FONT_SIZE;
	}

	if (!options.color) {
		options.color = DEFAULT_TEXT_COLOR;
	}

	if (options.horizontalAlignment === null || options.horizontalAlignment === undefined) {
		options.horizontalAlignment = DEFAULT_HORIZONTAL_ALIGNMENT;
	}

	if (options.verticalAlignment === null || options.verticalAlignment === undefined) {
		options.verticalAlignment = DEFAULT_VERTICAL_ALIGNMENT;
	}

	if (options.useLineWrapping === null || options.useLineWrapping === undefined) {
		options.useLineWrapping = false;
	}

	if (options.lineHeight === null || options.lineHeight === undefined) {
		options.lineHeight = DEFAULT_LINE_HEIGHT;
	}

	if (options.editable === null || options.editable === undefined) {
		options.editable = false;
	}

	return options;
}
