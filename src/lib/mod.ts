import { Event } from "./deps.ts";

type DexErrReason = "TARGET_NOT_FOUND";

// TODO: replace by a type switch between unique types
class DexErr {
	reason: DexErrReason;
	params: string[];
	constructor(reason: DexErrReason, params?: string[]) {
		this.reason = reason, this.params = params ?? [];
	}
}

/**
 * main class of the library, used as handle to prepare the final execution
 */
class Dex {
	targets: DexTarget[];
	context: DexContext;

	constructor() {
		this.targets = [];
		this.context = new DexContext();
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
		if (args == undefined) args = Deno.args;
		// verify given target
		// check for circular dependencies (verifyDeps)

		for (const arg of args) {
			await this.runTarget(arg);
		}
	}

	private getTarget(targetName: string): DexTarget {
		const found = this.targets.find((e) => e.name == targetName);
		if (found === undefined) throw new DexErr("TARGET_NOT_FOUND", [targetName]);
		return found;
	}

	private async runTarget(targetName: string) {
		const target = this.getTarget(targetName);
		for await (const dep of target.dependencies) {
			if (!this.context.completedTarget.includes(dep)) {
				await this.runTarget(dep);
			}
		}
		await target.execution(this.context);
		this.context.completedTarget.push(targetName);
	}

	// TODO: return better logs of the circular inclusion
	private verifyDeps(dependents: string[], dep: DexTarget): boolean {
		let result = true;
		for (const dependency of dep.dependencies) {
			if (dependents.includes(dependency)) return false;
			result &&= this.verifyDeps(
				[dependency, ...dependents],
				this.getTarget(dependency),
			);
		}
		return result;
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
	async execute(commandArguments: string[][] | string[]): Promise<number> {
		let commands: string[][];
		if (IsSingleCommand(commandArguments)) {
			commands = [commandArguments as string[]];
		} else commands = commandArguments as string[][];

		for await (const com of commands) {
			const execution = Deno.run({ cmd: com });
			const status = await execution.status();
			if (status.code != 0) return status.code;
		}

		return 0;

		function IsSingleCommand(cmdArgs: string[][] | string[]): boolean {
			return cmdArgs[0] == undefined || typeof cmdArgs[0] == "string";
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
	execution: DexTargetExecution;

	constructor(builder: DexTargetBuilder) {
		this.name = builder.name;
		this.dependencies = builder.deps ?? [];
		this.execution = builder.exec;
	}
}

// a ready-to-use instance to reduce the need for boilerplate code
const dexInstance = new Dex();
export type { DexTargetBuilder };
export { Dex, dexInstance as dex };
