import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inflateSync } from 'node:zlib';
import { Assets } from '../game/assets.js';
import { arcadeUrl } from '../game/visuals.js';

// Read generated PNGs without a browser: this is a pixel inspection, never an asset rewrite.
function rgbaPng(path){
  const bytes=fs.readFileSync(path),width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),chunks=[];
  assert.equal(bytes[24],8);assert.equal(bytes[25],6);assert.equal(bytes[28],0);
  for(let p=8;p<bytes.length;){const n=bytes.readUInt32BE(p);if(bytes.toString('ascii',p+4,p+8)==='IDAT')chunks.push(bytes.subarray(p+8,p+8+n));p+=n+12;}
  const raw=inflateSync(Buffer.concat(chunks)),stride=width*4,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)],row=data.subarray(y*stride,(y+1)*stride),previous=y?data.subarray((y-1)*stride,y*stride):null;
    for(let x=0;x<stride;x++){
      const a=x>=4?row[x-4]:0,b=previous?.[x]||0,c=x>=4?(previous?.[x-4]||0):0,p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
      row[x]=(raw[y*(stride+1)+1+x]+(filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?(pa<=pb&&pa<=pc?a:pb<=pc?b:c):0))&255;
    }
  }
  return {width,height,data};
}
function canvas(){
  let source;const result={width:0,height:0};
  result.getContext=()=>({drawImage(image){source=image;},getImageData(){return {data:source.data};},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(image){result.data=image.data;}});
  return result;
}
test('all 48 Gustavax poses contain isolated transparent actors with stable scale and no empty frames',()=>{
  const previous=globalThis.document;globalThis.document={createElement:canvas};
  try{
    const assets=new Assets();
    for(const atlas of ['gustavaxPatron','gustavaxSmoke','gustavaxLast']){
      const url=arcadeUrl(atlas);assets.images.set(url,rgbaPng('.'+url));
      for(let i=0;i<16;i++){
        const frame=assets.arcadeFrame(atlas,i),[,,w,h]=frame.rect;
        assert.ok(w>80&&w<500,`${atlas}:${i} width ${w}`);assert.ok(h>50&&h<400,`${atlas}:${i} height ${h}`);
        assert.ok(frame.image.data.some((a,n)=>n%4===3&&a===0),'transparent padding survives');
        assert.ok(frame.image.data.filter((a,n)=>n%4===3&&a>32).length>4000,'actor silhouette survives');
        assert.ok(frame.base[3]>200&&frame.base[3]<300,'fixed standing reference height');
      }
      const idle=assets.arcadeFrame(atlas,0),dead=assets.arcadeFrame(atlas,15);
      assert.ok(dead.rect[3]<idle.rect[3]*.55,'lying defeat must not be stretched to standing height');
    }
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
