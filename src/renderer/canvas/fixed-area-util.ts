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
		const endIndex: number = count - 1;
		const size: number =
			count > 0
				? cellModel.getRowOffset(endIndex) +
				  (cellModel.isRowHidden(endIndex)
						? 0.0
						: cellModel.getRowSize(endIndex))
				: 0;

		return {
			count,
			startIndex: 0,
			endIndex,
			startOffset: 0,
			endOffset: size,
			size,
		};
	}

	private static _calculateBottomFixedAreaInfo(
		optionsCount: number,
		cellModel: ICellModel
	): IFixedAreaInfo {
		const count: number = Math.min(optionsCount, cellModel.getRowCount());
		const startIndex = cellModel.getRowCount() - count;
		const startOffset = cellModel.getRowOffset(startIndex);
		const endOffset = cellModel.getHeight();
		const size: number = count > 0 ? endOffset - startOffset : 0;

		return {
			count,
			startIndex,
			endIndex: cellModel.getRowCount() - 1,
			startOffset,
			endOffset,
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
		const endIndex: number = count - 1;
		const size: number =
			count > 0
				? cellModel.getColumnOffset(endIndex) +
				  (cellModel.isColumnHidden(endIndex)
						? 0.0
						: cellModel.getColumnSize(endIndex))
				: 0;

		return {
			count,
			startIndex: 0,
			endIndex,
			startOffset: 0,
			endOffset: size,
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
		const startIndex: number = cellModel.getColumnCount() - count;
		const startOffset = cellModel.getColumnOffset(startIndex);
		const endOffset = cellModel.getWidth();
		const size: number = count > 0 ? endOffset - startOffset : 0;

		return {
			count,
			startIndex,
			endIndex: cellModel.getColumnCount() - 1,
			startOffset,
			endOffset,
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
	 * Row or column index the area starts at.
	 */
	startIndex: number;

	/**
	 * Row or column index the area starts at.
	 */
	endIndex: number;

	/**
	 * Offset the row or column starts at.
	 */
	startOffset: number;

	/**
	 * Offset the row or column ends at.
	 */
	endOffset: number;

	/**
	 * The width/height of the area.
	 */
	size: number;
}
