import {ICellRange} from "../../cell/range/cell-range";
import {IBorder} from "../border";

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
	 * Get borders for the given cell range.
	 * @param range to get borders for
	 */
	getBorders(range: ICellRange): IBorder[][];

}
