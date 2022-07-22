import { IParagraph } from './paragraph';

/**
 * Algorithm that will break a paragraph into lines.
 */
export interface ILineWrapper {
	/**
	 * Wrap the given text to lines.
	 * @param text to apply line wrapping to
	 * @param maxWidth of the paragraph
	 * @param lineHeight line height of the paragraph
	 * @param widthLookup lookup for the width of individual strings
	 */
	wrap(
		text: string,
		maxWidth: number,
		lineHeight: number,
		widthLookup: (str: string) => number
	): IParagraph;
}
