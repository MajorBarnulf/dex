import { DexError, Result } from "./error.ts";
import { DexContext } from "./DexContext.ts";

// deno-lint-ignore no-explicit-any
type DexTargetExecution = (context: DexContext) => Promise<any> | any;
/**
 * encapsulates the perameters given to the constructor of a DexTarget
 */
export interface DexTargetBuilder {
	name: string;
	exec: DexTargetExecution;
	deps?: string[];
}
/**
 * encapsulates a possible target to run, with all needed informations to do so (metadata, dependencies, execution ..)
 */

export class DexTarget {
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
