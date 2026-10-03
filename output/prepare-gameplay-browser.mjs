import {readFile,writeFile} from 'node:fs/promises';
let source=await readFile('tests/talent-visuals-browser.mjs','utf8');
source=source.replace("milestones:TALENT_MILESTONES,talents:TALENTS[kind].filter(n=>n.branchIndex===branch).map(n=>n.id)","milestones:Array.from({length:24},(_,i)=>`encounter:0:0:0:${i}`),talents:TALENTS[kind].filter(n=>n.branchIndex===branch).map(n=>n.id),talentRanks:Object.fromEntries(TALENTS[kind].filter(n=>n.branchIndex===branch).map(n=>[n.id,3]))");
source=source.replace('sim.activateSpecial(p);renderer.reset();','sim.activateSpecial(p);if(!p.specialState)throw new Error(`Inactive ${kind}/${branch}`);renderer.reset();');
source=source.replace("TALENTS[kind][branch*5+4].name","TALENTS[kind].find(n=>n.branchIndex===branch).name + ' ★★★'");
source=source.replaceAll('talent-ultimates','talent-gameplay').replace('all 21 ultimates','all 21 fully upgraded branches');
await writeFile('tests/talent-gameplay-browser.mjs',source);
