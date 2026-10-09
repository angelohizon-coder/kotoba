// Copy only public assets into a GitHub Pages artifact. No npm or bundler.
import { mkdir, cp, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=join(root,'_site');
const repository=process.env.GITHUB_REPOSITORY;
let homeBase=null;
if(repository){
  const match=/^([a-zA-Z0-9][a-zA-Z0-9-]*)\/([a-zA-Z0-9_.-]+)$/.exec(repository);
  if(!match||match[2]==='.'||match[2]==='..')throw new Error('GITHUB_REPOSITORY must contain the actual owner/repository name.');
  const [,owner,name]=match;
  homeBase=name.toLowerCase()===`${owner.toLowerCase()}.github.io`?'/':`/${encodeURIComponent(name)}/`;
}
if(dirname(resolve(destination))!==root||destination!==join(root,'_site'))throw new Error('Unexpected artifact directory; cleanup refused.');
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
const html=await readFile(join(root,'index.html'),'utf8');
if (/\b(?:src|href)=["']\/(?!\/)/.test(html)) throw new Error('Public assets must use relative paths for GitHub project Pages.');
await copyFile(join(root,'index.html'),join(destination,'index.html'));
await copyFile(join(root,'sw.js'),join(destination,'sw.js'));
const notFound=await readFile(join(root,'404.html'),'utf8');
const homeMarker='href="./index.html#dashboard" data-home-link';
if(!notFound.includes(homeMarker))throw new Error('404.html must include its relative home link marker.');
await writeFile(join(destination,'404.html'),notFound.replace(homeMarker,`href="${homeBase?`${homeBase}#dashboard`:'./index.html#dashboard'}" data-home-link`));
await cp(join(root,'web'),join(destination,'web'),{recursive:true});
await writeFile(join(destination,'.nojekyll'),'');
console.log(`GitHub Pages artifact ready in _site/. ${homeBase?`404 home base: ${homeBase}`:'No repository environment supplied; 404 uses its relative local home link.'}`);
