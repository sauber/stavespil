const SOUNDS_DIR = "public/sounds";
const WMPLAYER =
  "C:\\Program Files\\Windows Media Player\\wmplayer.exe";

/**
 * CLI tool and end-to-end integrity check for word sound playback.
 *
 * Plays the pre-generated MP3 for a word (created by `deno task sound:download`).
 *
 * Usage: `deno task sound <word>`
 */
async function main(): Promise<void> {
  const word = Deno.args[0];
  if (!word) {
    console.error("Usage: deno task sound <word>");
    Deno.exit(1);
  }

  const source = `${SOUNDS_DIR}/${word}.mp3`;
  let exists = true;
  try {
    await Deno.stat(source);
  } catch {
    exists = false;
  }
  if (!exists) {
    console.error(
      `No sound file for '${word}'. Run 'deno task sound:download' first.`,
    );
    Deno.exit(1);
  }

  const tempFile = await Deno.makeTempFile({ suffix: ".mp3" });
  await Deno.copyFile(source, tempFile);
  console.log(`Playing '${word}'...`);

  const command = new Deno.Command("powershell", {
    args: [
      "-Command",
      `& "${WMPLAYER}" /play /quit "${tempFile}"`,
    ],
  });
  const { code } = await command.output();
  if (code !== 0) {
    console.error(`wmplayer exited with code ${code}`);
  }
  console.log("Playback complete");

  await Deno.remove(tempFile);
}

main();
