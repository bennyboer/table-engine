import {IComboBoxCellRendererOptions} from "./combobox-cell-renderer-options";

export interface IComboBoxCellRendererValue {
	selected_option_id?: string;
	select_options: IComboBoxSelectOptions;
	options?: IComboBoxCellRendererOptions;
}

export interface IComboBoxSelectOptions {
	[id: string]: IComboBoxOption;
}

export interface IComboBoxOption {
	label: string;
}
