import { CellRangeUtil } from './cell-range-util';

test('[CellRangeUtil.and] AND operation - 1', () => {
	expect(
		CellRangeUtil.and(
			{
				startRow: 4,
				endRow: 10,
				startColumn: 5,
				endColumn: 7,
			},
			{
				startRow: 8,
				endRow: 12,
				startColumn: 7,
				endColumn: 9,
			}
		)
	).toEqual({
		startRow: 8,
		endRow: 10,
		startColumn: 7,
		endColumn: 7,
	});
});

test('[CellRangeUtil.and] AND operation - 2', () => {
	expect(
		CellRangeUtil.and(
			{
				startRow: 4,
				endRow: 10,
				startColumn: 5,
				endColumn: 7,
			},
			{
				startRow: 5,
				endRow: 6,
				startColumn: 5,
				endColumn: 5,
			}
		)
	).toEqual({
		startRow: 5,
		endRow: 6,
		startColumn: 5,
		endColumn: 5,
	});
});

test('[CellRangeUtil.and] AND operation - 3', () => {
	expect(
		CellRangeUtil.and(
			{
				startRow: 4,
				endRow: 10,
				startColumn: 5,
				endColumn: 7,
			},
			{
				startRow: 20,
				endRow: 20,
				startColumn: 20,
				endColumn: 20,
			}
		)
	).toBeNull();
});
