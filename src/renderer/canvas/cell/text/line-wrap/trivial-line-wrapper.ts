import { ILineWrapper } from './line-wrapper';
import { IParagraph } from './paragraph';
import { ILine } from './line';

/**
 * A trivial line wrapping algorithm.
 */
export class TrivialLineWrapper implements ILineWrapper {
	public wrap(
		text: string,
		maxWidth: number,
		lineHeight: number,
		widthLookup: (str: string) => number
	): IParagraph {
		const lines: ILine[] = [];

		// First and foremost determine whether the passed text needs breaking in the first place
		const totalWidth: number = widthLookup(text);
		if (totalWidth <= maxWidth) {
			return {
				lines: [
					{
						text,
						width: totalWidth,
					},
				],
				lineHeight,
				width: totalWidth,
			};
		}

		// Split text into words
		const words: string[] = text.split(' ');
		if (words.length === 0) {
			// Only having one word -> cannot break into lines
			return {
				lines: [
					{
						text,
						width: totalWidth,
					},
				],
				lineHeight,
				width: totalWidth,
			};
		}

		const wordWidths: number[] = words.map((word) => widthLookup(word));
		const whiteSpaceWidth: number = widthLookup(' ');

		let curLine: string[] = [];
		let curWidth: number = 0;

		for (let i = 0; i < words.length; i++) {
			const word: string = words[i];
			const wordWidth: number = wordWidths[i];

			const newWidth: number =
				curWidth + (curWidth > 0 ? whiteSpaceWidth : 0) + wordWidth;
			if (newWidth > maxWidth) {
				// Do a line break before appending the word
				lines.push({
					text: curLine.join(' '),
					width: curWidth,
				});

				curWidth = wordWidth;
				curLine = [word];
			} else {
				curLine.push(word);
				curWidth = newWidth;
			}
		}

		if (curLine.length > 0) {
			lines.push({
				text: curLine.join(' '),
				width: curWidth,
			});
		}

		return {
			lines,
			lineHeight,
			width: maxWidth,
		};
	}
}
