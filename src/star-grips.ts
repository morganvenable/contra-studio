/** A contact graph for the two distinct four-person star holds.
 * Source: Caller’s Box glossary, Star / Hands-across star; Paul Balliet glossary.
 * This helper never changes trajectories, timing, actor identity or topology.
 */
export type StarHold='hands-across'|'wrist-grip';
export type Hand='left'|'right';
export interface StarActor {id:number;position:{x:number;z:number};yaw:number;}
export interface StarGrip {a:number;b:number;handA:Hand;handB:Hand;point:{x:number;y:number;z:number};strength:number;kind:'joined';target:'hands'|'wrist';}
export function starGrips(actors:readonly StarActor[],hand:Hand,hold:StarHold,strength:number):StarGrip[]{
 if(actors.length!==4||new Set(actors.map(a=>a.id)).size!==4||actors.some(a=>!Number.isSafeInteger(a.id)||a.id<0||![a.position.x,a.position.z,a.yaw].every(Number.isFinite)))throw new Error('A star hold requires four distinct stable actors and finite poses.');
 if(!['left','right'].includes(hand)||!['hands-across','wrist-grip'].includes(hold)||!Number.isFinite(strength)||strength<0||strength>1)throw new Error('A star hold requires an explicit hand, grip and bounded strength.');
 const center={x:actors.reduce((n,a)=>n+a.position.x,0)/4,z:actors.reduce((n,a)=>n+a.position.z,0)/4};
 const order=[...actors].sort((a,b)=>Math.atan2(a.position.z-center.z,a.position.x-center.x)-Math.atan2(b.position.z-center.z,b.position.x-center.x));
 if(order.some((a,i)=>Math.hypot(a.position.x-order[(i+1)%4].position.x,a.position.z-order[(i+1)%4].position.z)<.38))throw new Error('The star hold has overlapping neighboring actor roots.');
 if(hold==='hands-across')return order.slice(0,2).map((a,i)=>{const b=order[i+2];return{a:a.id,b:b.id,handA:hand,handB:hand,point:{x:(a.position.x+b.position.x)/8+center.x*.75,y:1.34,z:(a.position.z+b.position.z)/8+center.z*.75},strength,kind:'joined',target:'hands'};});
 // In a left star dancers advance in decreasing x/z polar angle; right stars
 // advance in increasing angle. Each hand rests on the next dancer's wrist,
 // rather than changing its owner into an opposite-person handshake.
 const direction=hand==='left'?-1:1,side=hand==='left'?1:-1;
 const shoulder=order.map(a=>({x:a.position.x+side*.235*Math.cos(a.yaw),z:a.position.z-side*.235*Math.sin(a.yaw)}));
 // A small four-corner grip shape avoids merging all hands at one point.
 // Each palm lies on the next actor's projected distal forearm toward its
 // shoulder. The fixed-length rig must independently verify that anchor.
 const lambda=.16,remaining=1-lambda,denominator=1-remaining**4;
 const points=order.map((_a,i)=>{let x=0,z=0;for(let k=1;k<=4;k++){const s=shoulder[(i+direction*k+8)%4],weight=lambda*remaining**(k-1)/denominator;x+=s.x*weight;z+=s.z*weight;}return{x,y:1.30,z};});
 return order.map((a,i)=>({a:a.id,b:order[(i+direction+4)%4].id,handA:hand,handB:hand,point:points[i],strength,kind:'joined',target:'wrist'}));
}
