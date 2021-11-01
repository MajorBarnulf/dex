# DEX

## Description

DEX *(Deno EXecute)* is a tool to help you script the building process of your projects with typescript through deno

---
## How to use

### Installation

0. install [deno](https://deno.land) if you haven't already
1. alias the cli's script execution in your shell rc
```sh
alias dex="deno run -A https://raw.githubusercontent.com/MajorBarnulf/dex/master/src/cli/main.ts"
```

### Setup

create a config file named `dex.ts` at the root of a project
```ts
// import the default Dex instance, alternatively you can import the Dex class and instantiate it yourself
import { dex } from "https://raw.githubusercontent.com/MajorBarnulf/dex/master/src/lib/mod.ts";

dex
// add a target for the project
.add_target({
	
	// specify the target name
	name: "target",
	
	// set the execution function
	exec: (ctx) => {
		console.log("building 'main' ...");
	},
	
	// list the target dependencies
	deps: ["dep"],
})

// add as many targets as you need
.add_target({
	name: "dep",
	exec: (ctx) => {
		console.log("building 'dep1 ...");
	},
});

// export the dex modified dex instance
export { dex };
```

### Usage

you will be able to execute any target by running the following command from anywhere in your project:
```sh
dex target
```
