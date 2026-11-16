import {deflateSync} from 'node:zlib';
export function logoFixture(){
  function chunk(name,data){const type=Buffer.from(name),all=Buffer.concat([type,data]);let crc=0xffffffff;for(const v of all){crc^=v;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([head,all,tail]);}
  const header=Buffer.alloc(13);header.writeUInt32BE(2,0);header.writeUInt32BE(2,4);header[8]=8;header[9]=6;
  const row=Buffer.from([0,25,110,160,255,25,110,160,255]);
  return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.concat([row,row]))),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
