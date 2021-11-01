import { DexError, isError, Result } from "./error.ts";

/**
 * encapsulates the context in witch the execution will happen
 * provides a few methods used to replace a lot of common functions
 */

export class DexContext {
	environment: Record<string, string>;
	completedTarget: string[];

	constructor() {
		this.environment = {};
		this.completedTarget = [];
	}

	/**
	 * @description execute a command as a sub-process
	 * @param commandArguments list of arguments to execute (ex: ["echo", "lorem ipsum"])
	 * @returns status code at the end of execution
	 */
	async execute(
		commandArguments: string[][] | string[],
	): Promise<Result<void, "err_command_fail">> {
		let commands: string[][];
		if (this.IsSingleCommand(commandArguments)) {
			commands = [commandArguments as string[]];
		} else {
			commands = commandArguments as string[][];
		}

		for await (const com of commands) {
			const executionResult = await this.executeCommand(com);
			if (isError(executionResult)) {
				return executionResult;
			}
		}
	}

	private IsSingleCommand(cmdArgs: string[][] | string[]): boolean {
		return cmdArgs[0] == undefined || typeof cmdArgs[0] == "string";
	}

	private async executeCommand(
		command: string[],
	): Promise<Result<void, "err_command_fail">> {
		const execution = Deno.run({ cmd: command });
		const status = await execution.status();
		if (status.code != 0) {
			return new DexError("err_command_fail", command.join(` `), status.code);
		}
	}

	/**
	 * @description a way to verify wether a path exists or not, the intended way to check if a compilated file already exists
	 * @param path the path to verify the existence of
	 * @returns wether the path exists or not
	 */
	async file_exists(path: string): Promise<boolean> {
		try {
			await Deno.stat(path);
			return true;
		} catch (error) {
			if (error instanceof Deno.errors.NotFound) {
				return false;
			} else {
				throw error;
			}
		}
	}
}
