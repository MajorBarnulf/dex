type DexInfoEvents = {
	inf_starting_target: [string]; // [target name]
	inf_finished_target: [string]; // [target name]
	inf_run: [];
};

type DexErrorEvents = {
	err_target_not_found: [string]; // [target name]
	err_circular_deps: [string[], string]; // [[dependent target name stack], required target name]
	err_command_fail: [string, number]; // [command name, command log, exit code]
	err_target_fail: [string, string]; // [target name, message]
};

// possible events called through the Dex event listener
type DexEvents = DexInfoEvents & DexErrorEvents;

export type { DexErrorEvents, DexEvents, DexInfoEvents };
