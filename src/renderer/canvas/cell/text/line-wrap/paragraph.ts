import { ILine } from './line';

/**
 * Representation of a paragraph.
 */
export interface IParagraph {
	/**
	 * Lines in the paragraph.
	 */
	lines: ILine[];

	/**
	 * Height of a line.
	 */
	lineHeight: number;

	/**
	 * Width of the paragraph.
	 */
	width: number;
}
