#!/usr/bin/env node
/** Render original listing artwork. Usage: node render.cjs /absolute/output-dir */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  if (!process.argv[2]) throw new Error('Supply an output directory.');
  const output = path.resolve(process.argv[2]);
  await fs.mkdir(output, { recursive: true });
  const assets = [
    { source: 'icon.svg', name: 'Transcenlutions-Arcade-icon.png', width: 512, height: 512, alpha: true },
    { source: 'feature.svg', name: 'Transcenlutions-Arcade-feature.png', width: 1024, height: 500, alpha: false },
  ];
  for (const asset of assets) {
    let pipeline = sharp(await fs.readFile(path.join(__dirname, asset.source)))
      .resize(asset.width, asset.height, { fit: 'fill' }).toColourspace('srgb');
    pipeline = asset.alpha ? pipeline.ensureAlpha(1) : pipeline.flatten({ background: '#0a0b16' }).removeAlpha();
    const destination = path.join(output, asset.name);
    await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(destination);
    const metadata = await sharp(destination).metadata();
    const { size } = await fs.stat(destination);
    if (metadata.width !== asset.width || metadata.height !== asset.height || metadata.hasAlpha !== asset.alpha) {
      throw new Error(`Unexpected output format: ${asset.name}`);
    }
    if (asset.name.endsWith('-icon.png') && size >= 1024 * 1024) throw new Error('The store icon must stay below 1 MiB.');
    console.log(JSON.stringify({ file: destination, width: metadata.width, height: metadata.height,
      channels: metadata.channels, hasAlpha: metadata.hasAlpha, bytes: size }));
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
