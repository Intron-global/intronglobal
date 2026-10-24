import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
async function walk(directory) {
  const files = await Promise.all((await readdir(directory)).map(async name => {
    const file = path.join(directory, name);
    return (await stat(file)).isDirectory() ? walk(file) : [file];
  }));
  return files.flat();
}

let updated = 0;
for (const file of (await walk(publicRoot)).filter(file => file.endsWith('.html'))) {
  const original = await readFile(file, 'utf8');
  let html = original;
  const references = [...html.matchAll(/\b(?:href|src)=(['"])([^'"]+\.(?:css|js))(?:\?[^'"]*)?\1/g)];
  for (const [attribute, quote, url] of references) {
    if (/^(?:[a-z]+:|\/\/)/i.test(url)) continue;
    const asset = url.startsWith('/') ? path.resolve(publicRoot, '.' + url) : path.resolve(path.dirname(file), url);
    if (!asset.startsWith(publicRoot)) throw new Error('Asset is outside public directory');
    const hash = createHash('sha256').update(await readFile(asset)).digest('hex').slice(0, 12);
    html = html.replace(attribute, attribute.slice(0, attribute.indexOf('=') + 1) + quote + url + '?v=' + hash + quote);
  }
  if (html !== original) { await writeFile(file, html, 'utf8'); updated++; }
}
console.log(`Versioned CSS and JavaScript references in ${updated} HTML files.`);
