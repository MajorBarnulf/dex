import { DexErrorEvents } from "./events.ts";

type ErrorName = keyof DexErrorEvents;

type Result<T, E extends ErrorName> = T | DexError<E>;

class DexError<E extends ErrorName> {
	name: E;
	params: DexErrorEvents[E];

	constructor(name: E, ...params: DexErrorEvents[E]) {
		this.name = name;
		this.params = params;
	}
}
function isError<T, E extends ErrorName>(
	result: Result<T, E>,
): result is DexError<E> {
	return result instanceof DexError;
}

export type { ErrorName, Result };
export { DexError, isError };
