import { Event } from "./deps.ts";
import { DexEvents } from "./events.ts";
import { DexError, ErrorName, isError, Result } from "./error.ts";

/**
 * main class of the library, used as handle to prepare the final execution
 */
class Dex {
	targets: DexTarget[];
	context: DexContext;
	eventEmitter: Event.EventEmitter<DexEvents>;

	constructor() {
		this.targets = [];
		this.context = new DexContext();
		this.eventEmitter = new Event.EventEmitter();
		// TODO: set default variables ?
	}

	/**
	 * @description add possible targets to the environment
	 */
	add_target(target: DexTargetBuilder): this {
		const builtTarget = new DexTarget(target);
		this.targets.push(builtTarget);
		return this;
	}

	/**
	 * @description sets a variable in the environment of execution that will be accessible froma any target
	 * @param name : name of the variable to create / modify
	 * @param value : value to set for the variable
	 * @todo remove ?
	 */
	set_variable(name: DexVar, value: string): this {
		this.context.environment[name] = value;
		return this;
	}

	/**
	 * @description parse arguments and execute the invoked target
	 * @todo better logging
	 * @todo check for invalid dependency tree
	 */
	async run(args?: string[]) {
		this.eventEmitter.emit("inf_run");
		if (args == undefined) args = Deno.args;
		// verify given target
		// check for circular dependencies (verifyDeps)

		for (const arg of args) {
			const result = await this.runTarget(arg);

			// propagate errors
			if (isError(result)) {
				this.emmitError(result);
			}
		}
	}

	private async runTarget(
		targetName: string,
	): Promise<Result<void, "err_target_not_found" | "err_target_fail">> {
		const targetQueryResult = this.getTarget(targetName);
		if (isError(targetQueryResult)) return targetQueryResult;

		await this.runDependencies(targetQueryResult);
		this.eventEmitter.emit("inf_starting_target", targetName);
		const executionResult = await targetQueryResult.execution(this.context);
		if (isError(executionResult)) return executionResult;

		this.context.completedTarget.push(targetName);
		this.eventEmitter.emit("inf_finished_target", targetName);
	}

	private async runDependencies(target: DexTarget) {
		for await (const dep of target.dependencies) {
			if (!this.context.completedTarget.includes(dep)) {
				await this.runTarget(dep);
			}
		}
	}

	private getTarget(
		targetName: string,
	): Result<DexTarget, "err_target_not_found"> {
		const found = this.targets.find((e) => e.name == targetName);
		if (found === undefined) {
			return new DexError("err_target_not_found", targetName); // failed
		}
		return found;
	}

	private emmitError(
		error: DexError<"err_target_not_found" | "err_target_fail">,
	) {
		this.eventEmitter.emit(error.name, ...error.params);
	}

	// TODO: return better logs of the circular inclusion
	private verifyDeps(
		dependents: string[],
		dep: DexTarget,
	): Result<void, "err_target_not_found" | "err_circular_deps"> {
		for (const dependency of dep.dependencies) {
			if (dependents.includes(dependency)) {
				return new DexError("err_circular_deps", dep.dependencies, dependency);
			}

			const targetQueryResult = this.getTarget(dependency);
			if (isError(targetQueryResult)) return targetQueryResult;

			let targetValidityResult = this.verifyDeps(
				[dependency, ...dependents],
				targetQueryResult,
			);
			if (isError(targetValidityResult)) return targetValidityResult;
		}
	}
}

type DexVar = "LOREM";

/**
 * encapsulates the context in witch the execution will happen
 * provides a few methods used to replace a lot of common functions
 */
class DexContext {
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
		} else commands = commandArguments as string[][];

		for await (const com of commands) {
			const executionResult = await this.executeCommand(com);
			if (isError(executionResult)) return executionResult;
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
			if (error instanceof Deno.errors.NotFound) return false;
			else throw error;
		}
	}
}

// deno-lint-ignore no-explicit-any
type DexTargetExecution = (context: DexContext) => Promise<any> | any;

/**
 * encapsulates the perameters given to the constructor of a DexTarget
 */
interface DexTargetBuilder {
	name: string;
	exec: DexTargetExecution;
	deps?: string[];
}

/**
 * encapsulates a possible target to run, with all needed informations to do so (metadata, dependencies, execution ..)
 */
class DexTarget {
	dependencies: string[];
	name: string;
	execution: (ctx: DexContext) => Promise<Result<void, "err_target_fail">>;

	constructor(builder: DexTargetBuilder) {
		this.name = builder.name;
		this.dependencies = builder.deps ?? [];
		this.execution = async (ctx: DexContext) => {
			try {
				await builder.exec(ctx);
			} catch (e) {
				return new DexError(
					"err_target_fail",
					builder.name,
					Deno.inspect(e, { colors: true }),
				);
			}
		};
	}
}

// a ready-to-use instance to reduce the need for boilerplate code
const dexInstance = new Dex();
export type { DexEvents, DexTargetBuilder };
export { Dex, DexError, dexInstance as dex, Event };
