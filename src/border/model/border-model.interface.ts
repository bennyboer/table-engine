import {ICellRange} from "../../cell/range/cell-range";
import {IBorder} from "../border";
import {IBorderMask} from "./border-mask";
import {IBorderSide} from "../border-side";

/**
 * Representation of the table-engines border model.
 */
export interface IBorderModel {

	/**
	 * Set a border on the outlines of the passed range.
	 * @param border to set
	 * @param range to set border on the outsides of
	 */
	setBorder(border: IBorder, range: ICellRange): void;

	/**
	 * Set a border line.
	 * @param row to set border line to
	 * @param column to set border line to
	 * @param borderSide to set
	 * @param mask to apply border with
	 */
	setBorderLine(row: number, column: number, borderSide: IBorderSide, mask: IBorderMask): void;

	/**
	 * Get borders for the given cell range.
	 * @param range to get borders for
	 */
	getBorders(range: ICellRange): IBorder[][];

}
