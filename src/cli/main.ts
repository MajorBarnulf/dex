import { crayon, path, lib } from "./deps.ts";
type Dex = lib.Dex;
const { dirname, join } = path;

// deno-lint-ignore no-explicit-any
type DexConfig = any;

async function main() {
	const configPath = await findConfig();
	if (configPath == undefined) configNotFound();

	const dex = await tryParseConfig(configPath);
	if (dex == undefined) failedToParse();

	setupLogs(dex);
	const args = Deno.args;
	dex.run(args);
}

const yellow = crayon().yellow.bold;
const white = crayon().white.bold;
const green = crayon().green.bold;
const red = crayon().red;

function setupLogs(dex: Dex) {
	dex.eventEmitter.on(
		"inf_starting_target",
		(targetName) =>
			console.log(yellow(`┌── starting target `) + white(`'${targetName}'`)),
	);

	dex.eventEmitter.on(
		"inf_finished_target",
		(targetName) =>
			console.log(green(`└-> finished target `) + white(`'${targetName}'`)),
	);

	dex.eventEmitter.on(
		"err_circular_deps",
		(deps, dep) =>
			console.log(
				red(`└─x circular dependencies `) + white(`'${deps.join(`/`)}'`) +
					red(` requires `) + white(`'${dep}'`),
			),
	);

	dex.eventEmitter.on(
		"err_target_fail",
		(targetName, error) =>
			console.log(
				red(`└─x failed target `) + white(`'${targetName}'`) +
					red(` with error:\n`) + error,
			),
	);
}

async function findConfig(): Promise<string | undefined> {
	const configName = "dex.ts";
	const currentPath = Deno.cwd();

	let path = currentPath;
	let old = path;
	do {
		const potentialPath = join(path, configName);
		if (await fileExists(potentialPath)) return potentialPath;
		old = path;
		path = dirname(path);
	} while (old != path);

	return undefined;
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await Deno.stat(path);
		return true;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) return false;
		else throw error;
	}
}

function configNotFound(): never {
	throw "please, create a 'dex.ts' file at the root of your project that imports";
}

async function tryParseConfig(path: string): Promise<Dex | undefined> {
	const explicitPath = join(`file://`, path);
	const mod = await importConfig(explicitPath);
	const dex = mod["dex"];
	if (isDex(dex)) return dex;
	else return undefined;
}

async function importConfig(path: string): Promise<DexConfig> {
	const result = await import(path);
	return result;
}

// TODO: better type checking
function isDex(some: any): some is Dex {
	if (typeof some["targets"] != "object") return false;
	if (typeof some["context"] != "object") return false;
	return true;
}

function failedToParse(): never {
	throw "please, export an instance of 'Dex' from your 'dex.ts' file, one is already exported for you";
}

await main();
