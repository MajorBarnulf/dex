import { event } from "./deps.ts";
import { DexEvents } from "./events.ts";
import { DexError, isError, Result } from "./error.ts";
import { DexTarget, DexTargetBuilder } from "./DexTarget.ts";
import { DexContext } from "./DexContext.ts";

/**
 * main class of the library, used as handle to prepare the final execution
 */
export class Dex {
	context: DexContext;
	eventEmitter: event.EventEmitter<DexEvents>;

	constructor() {
		this.context = new DexContext();
		this.eventEmitter = new event.EventEmitter();
		// TODO: set default variables ?
	}

	/**
	 * @description add possible targets to the environment
	 */
	target(...targets: DexTargetBuilder[]): this {
		for (const target of targets) {
			const builtTarget = new DexTarget(target);
			this.context.addTarget(builtTarget);
		}
		return this;
	}

	/**
	 * @description sets a variable in the environment of execution that will be accessible froma any target
	 * @param name : name of the variable to create / modify
	 * @param value : value to set for the variable
	 * @todo remove ?
	 */
	set(name: string, value: string): this {
		this.context.environment[name] = value;
		return this;
	}

	/**
	 * @description queries a variable from the dex environment and return it's value
	 * @param name : name of the variable to query
	 * @returns : value of the variable
	 */
	get(name: string): string {
		const result = this.context.getVariable(name);
		if (result === undefined) throw `no variable named: '${name}'`;
		return result;
	}

	/**
	 * @description parse arguments and execute the invoked target
	 * @todo better logging
	 * @todo check for invalid dependency tree
	 */
	async run(args?: string[]) {
		this.eventEmitter.emit("inf_run");
		if (args == undefined) {
			args = Deno.args;
		}
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
		if (isError(targetQueryResult)) {
			return targetQueryResult;
		}

		await this.runDependencies(targetQueryResult);
		this.eventEmitter.emit("inf_starting_target", targetName);
		const executionResult = await targetQueryResult.execution(this.context);
		if (isError(executionResult)) {
			return executionResult;
		}

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
		const found = this.context.getTarget(targetName);
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
}
