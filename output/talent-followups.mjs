import {readFile,writeFile} from 'node:fs/promises';
const changes={
 'karonux-transformations.js':[
  ['a.turboUntil=a.elapsed+.6;','{a.turboUntil=a.elapsed+.6;feedback(this,p,0);}'],
  ['this.karonuxEffect(source.x, source.y, 2);','this.karonuxEffect(source.x, source.y, 2);feedback(this,p,1,source.x,source.y);'],
 ],
 'lorenzo-transformations.js':[
  ['this.lorenzoStrike({...owner,x:cloud.x,y:cloud.y},150,.65,true);','this.lorenzoStrike({...owner,x:cloud.x,y:cloud.y},150,.65,true);feedback(this,owner,2,cloud.x,cloud.y);'],
 ],
 'jualos-transformations.js':[
  ['r.commandTarget=hits[0].id;','feedback(this,p,3,hits[0].x,hits[0].y);r.commandTarget=hits[0].id;'],
 ],
 'yanu-transformations.js':[
  ['plants.push({id:this.nextId++','if(reproduction)feedback(this,p,4,x,y);plants.push({id:this.nextId++'],
 ],
 'jo-transformations.js':[
  ['this.joFX(p.x,p.y-70,7);','this.joFX(p.x,p.y-70,7);feedback(this,p,5);'],
 ],
 'kikor-transformations.js':[
  ['a.turboUntil=a.elapsed+.7;a.figures=0;','a.turboUntil=a.elapsed+.7;a.figures=0;feedback(this,p,0);'],
 ],
 'gustavax-transformations.js':[
  ['this.gustavaxFX(e.x,e.y,final?14:a.rank>=4?13:12);','this.gustavaxFX(e.x,e.y,final?14:a.rank>=4?13:12);feedback(this,p,7,e.x,e.y);'],
 ],
};
for(const [file,patches] of Object.entries(changes)){
 const url=new URL('../game/'+file,import.meta.url);let s=await readFile(url,'utf8');
 for(const [from,to] of patches){if(!s.includes(from))throw new Error(file+' missing '+from);s=s.replaceAll(from,to);}
 await writeFile(url,s);
}
