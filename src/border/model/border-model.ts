import {IBorder} from "../border";
import {IBorderModel} from "./border-model.interface";
import {ICellRange} from "../../cell/range/cell-range";
import {ICellModel} from "../../cell/model/cell-model.interface";
import {IBorderOptions} from "../options";

/**
 * Border model of the table-engine.
 */
export class BorderModel implements IBorderModel {

	/**
	 * Cell model of the table-engine.
	 */
	private readonly _cellModel: ICellModel;

	/**
	 * Options of the border model.
	 */
	private readonly _options: IBorderOptions;

	constructor(cellModel: ICellModel, options: IBorderOptions) {
		this._cellModel = cellModel;
		this._options = options;
	}

	/**
	 * Set a border on the outlines of the passed range.
	 * @param border to set
	 * @param range to set border on the outsides of
	 */
	public setBorder(border: IBorder, range: ICellRange): void {
		// TODO
	}

	/**
	 * Get borders for the given cell range.
	 * @param range to get borders for
	 */
	public getBorders(range: ICellRange): IBorder[][] {
		// TODO
		return [];
	}

}
