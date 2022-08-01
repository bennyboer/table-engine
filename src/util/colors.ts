import { IColor } from './color';

/**
 * Collection of frequently used colors.
 */
export class Colors {
	public static readonly WHITE: IColor = {
		red: 255,
		green: 255,
		blue: 255,
		alpha: 1.0,
	};
	public static readonly BLACK: IColor = {
		red: 0,
		green: 0,
		blue: 0,
		alpha: 1.0,
	};
	public static readonly TRANSPARENT: IColor = {
		red: 0,
		green: 0,
		blue: 0,
		alpha: 0.0,
	};

	public static readonly DARKGRAY: IColor = {
		red: 70,
		green: 70,
		blue: 70,
		alpha: 1.0,
	};
	public static readonly GRAY: IColor = {
		red: 127,
		green: 127,
		blue: 127,
		alpha: 1.0,
	};
	public static readonly LIGHTGRAY: IColor = {
		red: 192,
		green: 192,
		blue: 192,
		alpha: 1.0,
	};
	public static readonly LIGHTER_GRAY: IColor = {
		red: 220,
		green: 220,
		blue: 220,
		alpha: 1.0,
	};
	public static readonly LIGHTEST_GRAY: IColor = {
		red: 240,
		green: 240,
		blue: 240,
		alpha: 1.0,
	};

	public static readonly CORAL: IColor = {
		red: 255,
		green: 51,
		blue: 102,
		alpha: 1.0,
	};

	public static readonly DARKCORAL: IColor = {
		red: 225,
		green: 21,
		blue: 72,
		alpha: 1.0,
	};

	public static readonly ORANGE: IColor = {
		red: 255,
		green: 165,
		blue: 0,
		alpha: 1.0,
	};
	public static readonly BRIGHT_ORANGE: IColor = {
		red: 255,
		green: 190,
		blue: 0,
		alpha: 1.0,
	};

	/**
	 * Convert the passed color to a CSS color style representation.
	 * @param color to convert
	 */
	public static toStyleStr(color: IColor): string {
		return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha})`;
	}
}
