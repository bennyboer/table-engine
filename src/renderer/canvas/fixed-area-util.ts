import { IFixedAreasOptions } from '../renderer-options';
import { ICellModel } from '../../cell';

export class FixedAreaUtil {
	/**
	 * Calculate infos about the size and count of rows/columns in the fixed areas.
	 * @param fixedAreasOptions options defining the fixed areas extend
	 * @param cellModel the cell model
	 */
	static calculateFixedAreaInfos(
		fixedAreasOptions: IFixedAreasOptions,
		cellModel: ICellModel
	): IFixedAreaInfos {
		return {
			top: this._calculateTopFixedAreaInfo(
				fixedAreasOptions.top,
				cellModel
			),
			bottom: this._calculateBottomFixedAreaInfo(
				fixedAreasOptions.bottom,
				cellModel
			),
			left: this._calculateLeftFixedAreaInfo(
				fixedAreasOptions.left,
				cellModel
			),
			right: this._calculateRightFixedAreaInfo(
				fixedAreasOptions.right,
				cellModel
			),
		};
	}

	private static _calculateTopFixedAreaInfo(
		optionsCount: number,
		cellModel: ICellModel
	): IFixedAreaInfo {
		const count: number = Math.min(optionsCount, cellModel.getRowCount());
		const index: number = count - 1;
		const size: number =
			count > 0
				? cellModel.getRowOffset(index) +
				  (cellModel.isRowHidden(index)
						? 0.0
						: cellModel.getRowSize(index))
				: 0;

		return {
			count,
			index,
			size,
		};
	}

	private static _calculateBottomFixedAreaInfo(
		optionsCount: number,
		cellModel: ICellModel
	): IFixedAreaInfo {
		const count: number = Math.min(optionsCount, cellModel.getRowCount());
		const index = cellModel.getRowCount() - count;
		const size: number =
			count > 0
				? cellModel.getHeight() - cellModel.getRowOffset(index)
				: 0;

		return {
			count,
			index,
			size,
		};
	}

	private static _calculateLeftFixedAreaInfo(
		optionsCount: number,
		cellModel: ICellModel
	): IFixedAreaInfo {
		const count: number = Math.min(
			optionsCount,
			cellModel.getColumnCount()
		);
		const index: number = count - 1;
		const size: number =
			count > 0
				? cellModel.getColumnOffset(index) +
				  (cellModel.isColumnHidden(index)
						? 0.0
						: cellModel.getColumnSize(index))
				: 0;

		return {
			count,
			index,
			size,
		};
	}

	private static _calculateRightFixedAreaInfo(
		optionsCount: number,
		cellModel: ICellModel
	): IFixedAreaInfo {
		const count: number = Math.min(
			optionsCount,
			cellModel.getColumnCount()
		);
		const index: number = cellModel.getColumnCount() - count;
		const size: number =
			count > 0
				? cellModel.getWidth() - cellModel.getColumnOffset(index)
				: 0;

		return {
			count,
			index,
			size,
		};
	}
}

export interface IFixedAreaInfos {
	top: IFixedAreaInfo;
	bottom: IFixedAreaInfo;
	left: IFixedAreaInfo;
	right: IFixedAreaInfo;
}

export interface IFixedAreaInfo {
	/**
	 * How many rows/columns the area encompasses.
	 */
	count: number;

	/**
	 * Row or column index the area starts or ends.
	 * For example for the left fixed area this is the index of the last column in the left fixed area.
	 * When having the right fixed area, this represents the index of the first column in the right fixed area.
	 */
	index: number;

	/**
	 * The width/height of the area.
	 */
	size: number;
}
