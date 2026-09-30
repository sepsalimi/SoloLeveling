// Generates installable web app icons from the shared Life Analytics artwork.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const source = "assets/life-analytics-icon.svg";
const outputDirectory = "public/icons";

await mkdir(outputDirectory, { recursive: true });

await Promise.all([
  sharp(source).resize(192, 192).png().toFile(`${outputDirectory}/icon-192.png`),
  sharp(source).resize(512, 512).png().toFile(`${outputDirectory}/icon-512.png`),
  sharp(source).resize(180, 180).png().toFile(`${outputDirectory}/apple-touch-icon.png`)
]);
