# StaveSpil

A game training kids to spell Danish words.

- Language: Deno
- Core game module in `src/` folder.
- Test driven development.
  - For example `src/score/calculate.test.ts` has test cases for
    `src/score/calculate.ts`.
  - Complete one test case, implementation and verification at a time.
- Use jsr modules, not npm modules.
- Use jsr:@std/assert for testing
- SOLID coding principles
- All public symbols are documented using JSdoc
- Architecture and game rules in `StaveSpil.md` file.
- Design choices in `design.md`.
- Confirm code quality with `deno check`, `deno lint` and `deno test`.
- Export methods and types in each dir from `mod.ts` file.
