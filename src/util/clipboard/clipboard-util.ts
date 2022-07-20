import {ICellRange} from "../../cell/range/cell-range";
import {ICellModel} from "../../cell/model/cell-model.interface";
import {ICell} from "../../cell/cell";

/**
 * Utility methods for dealing with the clipboard.
 */
export class ClipboardUtil {

	/**
	 * Set the clipboard to the passed content.
	 * Content may be HTML formatted.
	 * @param content to set to the clipboard
	 */
	public static setClipboardContent(content: string): void {
		const clipboardDummyElement: HTMLElement = document.createElement("div");

		// Hide the dummy element from the user
		clipboardDummyElement.style.position = 'absolute';
		clipboardDummyElement.style.left = '-9999px';
		clipboardDummyElement.style.userSelect = "text";

		// Add to DOM
		document.body.appendChild(clipboardDummyElement);

		// Add content to copy to dummy element
		clipboardDummyElement.innerHTML = content;

		// Select all content on the dummy element
		window.getSelection().selectAllChildren(clipboardDummyElement);

		// Copy the selected content to the clipboard
		document.execCommand("copy");

		// Remove dummy element again from DOM
		document.body.removeChild(clipboardDummyElement);
	}

	/**
	 * Build a string representation of a HTML table for copying.
	 * @param range to copy cell contents from
	 * @param cellModel to get cells from
	 * @param copyValueMapper mapper from cell to copy value
	 */
	public static buildHTMLTableForCopy(
		range: ICellRange,
		cellModel: ICellModel,
		copyValueMapper: (cell: ICell) => string
	): string {
		let result: string = "<table>";
		const alreadySeenCells: Set<ICell> = new Set<ICell>(); // Set to prevent from including merged cells multiple times

		for (let row = range.startRow; row <= range.endRow; row++) {
			const isRowHidden: boolean = cellModel.isRowHidden(row);
			if (isRowHidden) {
				continue;
			}

			result += "<tr>";

			for (let column = range.startColumn; column <= range.endColumn; column++) {
				const isColumnHidden: boolean = cellModel.isColumnHidden(column);
				if (isColumnHidden) {
					continue;
				}

				const cell: ICell | null = cellModel.getCell(row, column);
				let copyValue: string = "";
				let rowSpan: number = 1;
				let columnSpan: number = 1;
				let ignore: boolean = false;
				if (!!cell) {
					if (!alreadySeenCells.has(cell)) {
						alreadySeenCells.add(cell);

						copyValue = copyValueMapper(cell);

						rowSpan = cell.range.endRow - cell.range.startRow + 1;
						columnSpan = cell.range.endColumn - cell.range.startColumn + 1;
					} else {
						ignore = true;
					}
				}

				// Add to table string
				if (!ignore) {
					result += "<td";
					if (rowSpan > 1) {
						result += ` rowspan="${rowSpan}"`;
					}
					if (columnSpan > 1) {
						result += ` colspan="${columnSpan}"`;
					}
					result += `>${copyValue}</td>`;
				}
			}

			result += "</tr>";
		}

		result += "</table>";

		return result;
	}

}
