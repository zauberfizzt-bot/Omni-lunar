import fs from 'node:fs';
import vm from 'node:vm';
const data=vm.runInNewContext(fs.readFileSync('ephemerides.js','utf8')+'\nDATA');
if(!Array.isArray(data.phases)||!Array.isArray(data.samples))throw Error('Invalid lunar ephemerides');
fs.writeFileSync('cloudflare/ephemerides.mjs','export default '+JSON.stringify(data)+';\n');
