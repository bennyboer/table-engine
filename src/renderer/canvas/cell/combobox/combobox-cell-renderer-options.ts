import {ICell} from "../../../../cell/cell";
import {IColor} from "../../../../util/color";
import {Colors} from "../../../../util/colors";

export const DEFAULT_PLACEHOLDER: string = "Select...";
export const DEFAULT_LABEL_COLOR: IColor = Colors.BLACK;
export const DEFAULT_PLACEHOLDER_COLOR: IColor = Colors.GRAY;
export const DEFAULT_PADDING: number = 4;

export interface IComboBoxCellRendererOptions {
	onChanged?: (cell: ICell) => void;
	editable?: boolean;
	placeholder?: string;
	labelColor?: IColor;
	placeholderColor?: IColor;
	padding?: number;
}

export const fillOptions = (options?: IComboBoxCellRendererOptions) => {
	if (!options) {
		options = {};
	}

	if (options.editable === undefined || options.editable === null) {
		options.editable = true;
	}

	if (!options.placeholder) {
		options.placeholder = DEFAULT_PLACEHOLDER
	}

	if (!options.labelColor) {
		options.labelColor = DEFAULT_LABEL_COLOR;
	}

	if (!options.placeholderColor) {
		options.placeholderColor = DEFAULT_PLACEHOLDER_COLOR;
	}

	if (options.padding === undefined || options.padding === null) {
		options.padding = DEFAULT_PADDING;
	}

	return options;
}
