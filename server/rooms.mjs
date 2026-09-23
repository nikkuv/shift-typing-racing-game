import { randomBytes, randomInt } from 'node:crypto';

export const PASSAGES = [
 'The lights turn green and the city comes alive. Keep your eyes on the road and your hands steady. Every corner is a chance to find your rhythm, every straight a chance to push a little further.',
 'Beyond the last bend, the mountains opened into a wide valley. The road stretched toward the horizon like a ribbon of silver. We had nowhere to be and every reason to enjoy the ride.',
 'Speed is only part of the story. The best drivers know when to push forward and when to find their balance. Stay sharp, trust your practice, and let every small decision take you closer to the finish.'
];
const cleanName = value => typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 18) : '';
const validColor = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#b58aff';
const token = () => randomBytes(24).toString('base64url');
const fail = (message,code='INVALID_ACTION') => { const e = new Error(message); e.code = code; throw e; };

export class RoomService {
 constructor({now=Date.now, countdownMs=4000, raceMs=120000, idleMs=1800000, reconnectMs=60000}={}) {
  Object.assign(this,{now,countdownMs,raceMs,idleMs,reconnectMs}); this.rooms=new Map(); this.members=new Map();
 }
 player(socket,name,color) {
  const safeName=cleanName(name);if(!safeName)fail('Enter a driver name to join the grid.');
  return {id:token().slice(0,12),token:token(),name:safeName,color:validColor(color),socket,connected:true,ready:false,text:'',attempts:0,errors:0,progress:0,finishedAt:null,dnf:false,lastSeq:-1,disconnectedAt:null};
 }
 create(socket,{name,color}) {
  if(this.rooms.size>=250)fail('The server is busy. Try again shortly.');
  if(this.members.has(socket))fail('Leave your current room first.');
  const p=this.player(socket,name,color);let code;do{code=randomBytes(5).toString('hex').toUpperCase();}while(this.rooms.has(code));
  const room={code,players:[p],hostId:p.id,status:'lobby',raceId:0,passage:'',startsAt:null,endsAt:null,updatedAt:this.now()};
  this.rooms.set(code,room);this.members.set(socket,{room,player:p});this.send(socket,{type:'joined',code,token:p.token});this.broadcast(room);return room;
 }
 join(socket,{code,name,color}) {
  if(this.members.has(socket))fail('Leave your current room first.');
  const room=this.rooms.get(String(code).toUpperCase());if(!room)fail('Room not found or expired. Check the invite code.','ROOM_NOT_FOUND');
  if(room.status!=='lobby')fail('This race has already started. Join after the host opens the next race.');
  if(room.players.length>=3)fail('This room is full. Each race has three driver slots.','ROOM_FULL');
  const p=this.player(socket,name,color);room.players.push(p);room.updatedAt=this.now();this.members.set(socket,{room,player:p});this.send(socket,{type:'joined',code:room.code,token:p.token});this.broadcast(room);
 }
 resume(socket,{code,token:resumeToken}) {
  const room=this.rooms.get(String(code).toUpperCase()),p=room?.players.find(p=>p.token===resumeToken);
  if(!p)fail('Your previous room expired. Create or join a new room.','RESUME_FAILED');
  if(p.socket && p.socket!==socket){this.members.delete(p.socket);this.send(p.socket,{type:'replaced'});p.socket.close?.(1000,'Session resumed elsewhere');}
  Object.assign(p,{socket,connected:true,disconnectedAt:null});room.updatedAt=this.now();this.members.set(socket,{room,player:p});
  if(!room.players.some(p=>p.id===room.hostId&&p.connected))room.hostId=p.id;
  this.send(socket,{type:'joined',code:room.code,token:p.token});this.broadcast(room);
 }
 member(socket){const m=this.members.get(socket);if(!m)fail('Join a room first.');return m;}
 ready(socket,{value}){const {room,player}=this.member(socket);if(room.status!=='lobby')fail('The race is already underway.');player.ready=value===true;room.updatedAt=this.now();this.broadcast(room);}
 start(socket){const {room,player}=this.member(socket);if(player.id!==room.hostId)fail('Only the host can start the race.','HOST_ONLY');if(room.status!=='lobby')fail('The race has already started.');if(room.players.length<2 || room.players.some(p=>!p.connected||!p.ready))fail('At least two drivers must join, and everyone must be ready.');
  room.raceId++;room.passage=PASSAGES[randomInt(PASSAGES.length)];room.startsAt=this.now()+this.countdownMs;room.endsAt=room.startsAt+this.raceMs;room.status='countdown';room.updatedAt=this.now();for(const p of room.players)Object.assign(p,{text:'',attempts:0,errors:0,progress:0,finishedAt:null,dnf:false,lastSeq:-1});this.broadcast(room);
 }
 input(socket,{text,seq,raceId}){
  const {room,player:p}=this.member(socket);this.advance(room);
  if(room.status!=='racing'||this.now()<room.startsAt||p.finishedAt!==null||p.dnf)return;
  if(raceId!==room.raceId||!Number.isSafeInteger(seq)||seq<=p.lastSeq)return;
  if(typeof text!=='string'||text.length>room.passage.length)fail('Invalid typing update.');
  let prefix=0;while(prefix<Math.min(p.text.length,text.length)&&p.text[prefix]===text[prefix])prefix++;
  for(let i=prefix;i<text.length;i++){p.attempts++;if(text[i]!==room.passage[i])p.errors++;}
  p.text=text;p.lastSeq=seq;
  let correct=0;while(correct<text.length && text[correct]===room.passage[correct])correct++;
  p.progress=correct/room.passage.length;
  if(text===room.passage)p.finishedAt=this.now();
  room.updatedAt=this.now();this.advance(room);this.broadcast(room);
 }
 rematch(socket){const {room,player}=this.member(socket);if(player.id!==room.hostId)fail('Only the host can open the next race.','HOST_ONLY');if(room.status!=='finished')fail('Wait for this race to finish.');room.players=room.players.filter(p=>p.connected);room.status='lobby';room.startsAt=null;room.endsAt=null;room.passage='';room.updatedAt=this.now();for(const p of room.players)Object.assign(p,{ready:false,text:'',attempts:0,errors:0,progress:0,finishedAt:null,dnf:false,lastSeq:-1});this.broadcast(room);}
 leave(socket){const m=this.members.get(socket);if(!m)return;const {room,player}=m;this.members.delete(socket);player.socket=null;player.connected=false;player.ready=false;player.disconnectedAt=this.now();if(room.status==='lobby'||room.status==='finished')room.players=room.players.filter(p=>p!==player);else player.dnf=true;this.electHost(room);this.advance(room);this.send(socket,{type:'left'});if(!room.players.some(p=>p.connected))this.rooms.delete(room.code);else this.broadcast(room);}
 disconnect(socket){const m=this.members.get(socket);if(!m)return;const {room,player}=m;this.members.delete(socket);player.socket=null;player.connected=false;player.disconnectedAt=this.now();if(room.status==='lobby')player.ready=false;this.electHost(room);this.broadcast(room);}
 electHost(room){if(!room.players.some(p=>p.id===room.hostId&&p.connected))room.hostId=room.players.find(p=>p.connected)?.id ?? room.hostId;}
 advance(room){const now=this.now();if(room.status==='countdown'&&now>=room.startsAt)room.status='racing';if(room.status==='racing'&&(now>=room.endsAt||room.players.every(p=>p.finishedAt!==null||p.dnf))){for(const p of room.players)if(p.finishedAt===null)p.dnf=true;room.status='finished';}}
 tick(){for(const [code,room]of this.rooms){const old=room.status;this.advance(room);let changed=old!==room.status;
  if(room.status==='lobby'){const before=room.players.length;room.players=room.players.filter(p=>p.connected||this.now()-p.disconnectedAt<this.reconnectMs);changed||=before!==room.players.length;this.electHost(room);}
  if(this.now()-room.updatedAt>this.idleMs){for(const p of room.players){this.send(p.socket,{type:'error',code:'ROOM_EXPIRED',message:'This inactive room expired. Create a new room.'});this.members.delete(p.socket);}this.rooms.delete(code);continue;}
  if(!room.players.length||room.players.every(p=>!p.connected&&this.now()-p.disconnectedAt>=this.reconnectMs)){this.rooms.delete(code);continue;}
  if(changed||room.status==='racing')this.broadcast(room);
 }}
 snapshot(room,viewer){const now=this.now();const ranked=[...room.players].sort((a,b)=>{if(a.finishedAt!==null&&b.finishedAt!==null)return a.finishedAt-b.finishedAt;if(a.finishedAt!==null)return -1;if(b.finishedAt!==null)return 1;return b.progress-a.progress;});return {type:'state',serverTime:now,code:room.code,hostId:room.hostId,status:room.status,raceId:room.raceId,startsAt:room.startsAt,endsAt:room.endsAt,passage:room.passage,you:viewer.id,yourText:viewer.text,players:room.players.map(p=>{const seconds=room.startsAt===null?0:Math.max(0,((p.finishedAt??Math.min(now,room.endsAt))-room.startsAt)/1000);const correct=[...p.text].filter((c,i)=>c===room.passage[i]).length;return {id:p.id,name:p.name,color:p.color,connected:p.connected,ready:p.ready,progress:p.progress,finishedAt:p.finishedAt,dnf:p.dnf,rank:ranked.indexOf(p)+1,wpm:seconds>0?Math.round(correct/5/(seconds/60)):0,accuracy:p.attempts?Math.round((p.attempts-p.errors)/p.attempts*100):100};})};}
 send(socket,data){if(socket?.readyState===1)socket.send(JSON.stringify(data));}
 broadcast(room){for(const p of room.players)if(p.connected)this.send(p.socket,{...this.snapshot(room,p),ackSeq:p.lastSeq});}
 handle(socket,data){switch(data.type){case'create':return this.create(socket,data);case'join':return this.join(socket,data);case'resume':return this.resume(socket,data);case'ready':return this.ready(socket,data);case'start':return this.start(socket);case'input':return this.input(socket,data);case'inputs':if(!Array.isArray(data.updates)||data.updates.length>12)fail('Invalid typing batch.');for(const update of data.updates){if(!update||typeof update!=='object')fail('Invalid typing update.');this.input(socket,update);}return;case'rematch':return this.rematch(socket);case'leave':return this.leave(socket);case'ping':return this.send(socket,{type:'pong',sentAt:data.sentAt,serverTime:this.now()});default:fail('Unknown action.');}}
}
