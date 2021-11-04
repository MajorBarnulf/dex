import { DexError, Result } from "./error.ts";
import { DexTarget } from "./DexTarget.ts";
import { exec } from "./deps.ts";

/**
 * encapsulates the context in witch the execution will happen
 * provides a few methods used to replace a lot of common functions
 */

export class DexContext {
	environment: Record<string, string>;
	target: Record<string, DexTarget>;
	completedTarget: string[];

	constructor() {
		this.target = {};
		this.environment = {};
		this.completedTarget = [];
	}

	/**
	 * @description execute a command as a sub-process
	 * @param commandArguments list of arguments to execute (ex: ["echo", "lorem ipsum"])
	 * @returns status code at the end of execution
	 */
	async execute(
		...command: string[]
	): Promise<Result<void, "err_command_fail">> {
		const concatenated = command.join(` `);
		const result = await exec(concatenated);
		if (result.status.code != 0) return new DexError("err_command_fail", concatenated, result.status.code);
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
	async exists(path: string): Promise<boolean> {
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

	addTarget (target: DexTarget) {
		this.target[target.name] = target;
	}

	getTarget (name: string): DexTarget | undefined {
		return this.target[name];
	}

	setVariable (name: string, value: string) {
		this.environment[name] = value;
	}
	getVariable (name: string): string | undefined {
		return this.environment[name];
	}
}
