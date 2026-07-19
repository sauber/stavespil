# CLI

Terminal interaction helpers for command-line game interfaces.

## Requirements

- Display blockified images from JPEG bytes via a `MediaLoader`
- Print text lines to stdout
- Manage underscore slot arrays for spelling input
- Read single keypresses from stdin in raw mode
- Handle SIGINT (Ctrl-C) for clean exit

## Design Choices

- **Dependency injection**: `showImage` receives a `MediaLoader` rather than importing
  image fetching directly, keeping it testable and reusable.
- **Shared constants**: Flash duration (300ms), mask character (`_`), wrong character (`!`),
  and target image height (20 lines) are module-level constants.
- **Raw mode toggle**: `setRawMode` is a thin wrapper around `Deno.stdin.setRaw`.
  Callers are responsible for restoring normal mode on exit.
- **Slot mutation**: `renderSlots` and `flashWrong` mutate the array in place for
  performance — no allocation per keystroke.
