import { IPoint, IRectangle, ISize } from '../../../util';
import { IViewportScroller } from './viewport-scroller.interface';
import { CellRange, ICell, ICellModel, ICellRange } from '../../../cell';
import { IFixedAreaInfos } from '../fixed-area-util';
import { IViewportManager } from '../../viewport-manager';

export class ViewportScroller implements IViewportScroller {
	private readonly _scrollOffset: IPoint = {
		x: 0,
		y: 0,
	};

	constructor(
		private readonly _cellModel: ICellModel,
		private readonly _viewportManager: IViewportManager
	) {}

	getScrollOffset(): IPoint {
		return {
			...this._scrollOffset,
		};
	}

	scrollTo(row: number, column: number): boolean {
		const boundsToScrollTo: IRectangle = this._getCellBounds(row, column);

		const fixedAreaInfos: IFixedAreaInfos = this._getFixedAreaInfos();
		const scrollableViewportSize: ISize =
			this._getScrollableViewportSize(fixedAreaInfos);

		// Reduce cell bounds by the fixed top and left areas (they are not scrollable)
		boundsToScrollTo.top -= fixedAreaInfos.top.size;
		boundsToScrollTo.left -= fixedAreaInfos.left.size;

		const changedXScrollOffset = this._scrollToColumn(
			column,
			boundsToScrollTo,
			fixedAreaInfos,
			scrollableViewportSize
		);
		const changedYScrollOffset = this._scrollToRow(
			row,
			boundsToScrollTo,
			fixedAreaInfos,
			scrollableViewportSize
		);

		return changedXScrollOffset || changedYScrollOffset;
	}

	private _scrollToColumn(
		column: number,
		boundsToScrollTo: IRectangle,
		fixedAreaInfos: IFixedAreaInfos,
		scrollableViewportSize: ISize
	): boolean {
		const isColumnInFixedArea =
			column <= fixedAreaInfos.left.endIndex ||
			column >= fixedAreaInfos.right.startIndex;

		if (isColumnInFixedArea) {
			return false;
		}

		const startX: number = this._scrollOffset.x;
		const endX: number =
			this._scrollOffset.x + scrollableViewportSize.width;

		// Check if we need to scroll to the left, right or do nothing because the cell is already contained in the current viewport
		if (boundsToScrollTo.left < startX) {
			// Scroll to the left
			return this._scrollToX(
				boundsToScrollTo.left,
				fixedAreaInfos,
				scrollableViewportSize
			);
		} else if (boundsToScrollTo.left + boundsToScrollTo.width > endX) {
			// Scroll to the right
			return this._scrollToX(
				boundsToScrollTo.left +
					boundsToScrollTo.width -
					scrollableViewportSize.width,
				fixedAreaInfos,
				scrollableViewportSize
			);
		}

		return false;
	}

	private _scrollToRow(
		row: number,
		boundsToScrollTo: IRectangle,
		fixedAreaInfos: IFixedAreaInfos,
		scrollableViewportSize: ISize
	): boolean {
		const isRowInFixedArea =
			row <= fixedAreaInfos.top.endIndex ||
			row >= fixedAreaInfos.bottom.startIndex;

		if (isRowInFixedArea) {
			return false;
		}

		const startY: number = this._scrollOffset.y;
		const endY: number =
			this._scrollOffset.y + scrollableViewportSize.height;

		// Check if we need to scroll to the top, bottom or do nothing because the cell is already contained in the current viewport
		if (boundsToScrollTo.top < startY) {
			// Scroll to the top
			return this._scrollToY(
				boundsToScrollTo.top,
				fixedAreaInfos,
				scrollableViewportSize
			);
		} else if (boundsToScrollTo.top + boundsToScrollTo.height > endY) {
			// Scroll to the bottom
			return this._scrollToY(
				boundsToScrollTo.top +
					boundsToScrollTo.height -
					scrollableViewportSize.height,
				fixedAreaInfos,
				scrollableViewportSize
			);
		}

		return false;
	}

	scrollToOffset(x: number, y: number): boolean {
		const fixedAreaInfos: IFixedAreaInfos = this._getFixedAreaInfos();
		const scrollableViewportSize: ISize =
			this._getScrollableViewportSize(fixedAreaInfos);

		const xChanged: boolean = this._scrollToX(
			x,
			fixedAreaInfos,
			scrollableViewportSize
		);
		const yChanged: boolean = this._scrollToY(
			y,
			fixedAreaInfos,
			scrollableViewportSize
		);

		return xChanged || yChanged;
	}

	private _scrollToX(
		offset: number,
		fixedAreaInfos: IFixedAreaInfos,
		scrollableViewportSize: ISize
	): boolean {
		const tableWidth: number =
			this._cellModel.getWidth() -
			fixedAreaInfos.left.size -
			fixedAreaInfos.right.size;

		// Check if we're able to scroll in the first place
		if (tableWidth <= scrollableViewportSize.width) {
			return false;
		}

		const maxOffset: number = tableWidth - scrollableViewportSize.width;

		if (offset < 0) {
			const changed: boolean = this._scrollOffset.x !== 0;
			this._scrollOffset.x = 0;
			return changed;
		} else if (offset > maxOffset) {
			const changed: boolean = this._scrollOffset.x !== maxOffset;
			this._scrollOffset.x = Math.round(maxOffset);
			return changed;
		} else {
			const newOffset: number = offset;
			if (newOffset !== this._scrollOffset.x) {
				this._scrollOffset.x = newOffset;
				return true;
			}

			return false;
		}
	}
	private _scrollToY(
		offset: number,
		fixedAreaInfos: IFixedAreaInfos,
		scrollableViewportSize: ISize
	): boolean {
		const tableHeight: number =
			this._cellModel.getHeight() -
			fixedAreaInfos.top.size -
			fixedAreaInfos.bottom.size;

		// Check if we're able to scroll in the first place
		if (tableHeight <= scrollableViewportSize.height) {
			return false;
		}

		const maxOffset: number = tableHeight - scrollableViewportSize.height;

		if (offset < 0) {
			const changed: boolean = this._scrollOffset.y !== 0;
			this._scrollOffset.y = 0;
			return changed;
		} else if (offset > maxOffset) {
			const changed: boolean = this._scrollOffset.y !== maxOffset;
			this._scrollOffset.y = Math.round(maxOffset);
			return changed;
		} else {
			const newOffset: number = offset;
			if (newOffset !== this._scrollOffset.y) {
				this._scrollOffset.y = newOffset;
				return true;
			}

			return false;
		}
	}

	private _getCellBounds(row: number, column: number): IRectangle {
		const cell: ICell = this._cellModel.getCell(row, column);
		const range: ICellRange = !!cell
			? cell.range
			: CellRange.fromSingleRowColumn(row, column);
		return this._cellModel.getBounds(range);
	}

	private _getScrollableViewportSize(fixedAreaInfos: IFixedAreaInfos): ISize {
		const viewportSize = this._viewportManager.getViewportSize();

		return {
			width:
				viewportSize.width -
				fixedAreaInfos.left.size -
				fixedAreaInfos.right.size,
			height:
				viewportSize.height -
				fixedAreaInfos.top.size -
				fixedAreaInfos.bottom.size,
		};
	}

	private _getFixedAreaInfos(): IFixedAreaInfos {
		return this._viewportManager.getFixedAreaInfos();
	}
}
