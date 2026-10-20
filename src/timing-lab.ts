import './timing-lab.css';
import {sampleSwingTorsoStudy} from './swing-torso-study.ts';
import {sampleStudy, FLUENT_TIMING_PROFILE, DEFAULT_TIMING_PROFILE, type ExecutionTimingProfile} from './execution-timing-study.ts';

const root=document.querySelector<HTMLDivElement>('#timing-app')!;
const slider=(key:string,title:string,min:number,max:number,step:number,help:string)=>`<label class="slider"><span class="slider-title">${title}<output id="${key}-value" for="${key}"></output></span><input id="${key}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${title}"><small>${help}</small></label>`;
const floor=(id:string,title:string,subtitle:string,badge:string)=>`<section class="floor-card ${id==='adjustable'?'adjustable':''}" aria-label="${title} pair"><div class="floor-heading"><div><h2>${title}</h2><p>${subtitle}</p></div><span class="badge">${badge}</span></div><svg id="${id}-floor" class="floor" viewBox="-170 -140 340 280" role="img" aria-label="${title} pair viewed from above"></svg><div class="phase"><strong id="${id}-phase">Balance forward</strong><span id="${id}-status">On the beat</span></div></section>`;
root.innerHTML=`
  <header><a class="brand" href="./">Contra <span>Studio</span></a><a href="./">← Back to the dance floor</a></header>
  <main>
    <div class="eyebrow">Timing study</div>
    <h1>Same music. A different feel.</h1>
    <p class="intro">Arrive ready for count 1. Step forward, step back, then push from the fourth step into the swing. Explore what changes when the preparation is quick—or the response comes late.</p>
    <div class="workspace">
      <div class="comparison">${floor('fluent','Fluent','Timing and frame reference','Ready ahead')}${floor('adjustable','Your timing','Adjust the feel on the right','Try a variation')}</div>
      <aside class="controls" aria-label="Adjustable pair timing">
        <h2>How does the pair move?</h2>
        <p>Both pairs hear the same counts. These controls change their movement, not the music.</p>
        <div class="presets" role="group" aria-label="Timing presets"><button class="preset" data-preset="fluent" aria-pressed="false">Fluent</button><button class="preset" data-preset="measured" aria-pressed="true">Measured</button><button class="preset" data-preset="late" aria-pressed="false">Late</button></div>
        ${slider('anticipationCounts','Ready ahead',0,1,.05,'Finish preparing this many counts before the next balance.')}
        ${slider('transitionCounts','Time to prepare',.25,2,.05,'A shorter transition makes the change more decisive.')}
        ${slider('responseDelayCounts','Late response',0,1,.05,'Start moving this far behind the musical count.')}
        ${slider('recoveryCounts','Time to catch up',2,8,.25,'Recover the delay over this many counts.')}
        <h3 class="frame-title">Swing frame</h3>
        ${slider('torsoTurn','Torso turn inward',-35,70,1,'Turn the shoulders relative to the hips. Positive turns toward your partner.')}
        ${slider('bodyCloseness','Body closeness',0,1,.05,'Bring the shoulders closer while the feet and hips keep their paths.')}
        <p id="frame-status" class="profile-note" role="status">Try the swing to inspect the shoulder connection.</p>
        <div class="profile-note">One back-of-shoulder hold per dancer is shown. Arms keep their length; the torso can turn over the attached hips.</div>
      </aside>
      <section class="timeline" aria-label="Shared musical clock">
        <div class="transport"><button id="play" class="play" aria-label="Play timing study">Play</button><button id="reset" class="reset" aria-label="Reset timing study">Reset</button><button id="click" class="reset" aria-label="Enable count click" aria-pressed="false">Click off</button><label class="tempo">Tempo <input id="tempo" type="number" min="60" max="160" value="112" step="1" aria-label="Tempo in beats per minute"> bpm</label></div>
        <div class="clock-line"><strong id="music-phase">Balance · forward</strong><span id="step-cue">Step 1 · left foot</span></div>
        <div class="counts" role="group" aria-label="Musical counts">${Array.from({length:8},(_,i)=>`<div class="count" data-count="${i+1}">${i+1}</div>`).join('')}</div>
        <label class="screen-reader" for="seek">Seek within the sixteen-count study</label><input id="seek" class="seek" type="range" min="0" max="15.99" step=".01" value="0"><div class="seek-labels"><span>Balance 1–4</span><span>Swing</span><span>Prepare → balance</span></div>
        <div class="chart-heading"><h3>Space between the hips</h3><div class="legend"><span>Fluent</span><span>Your timing</span></div></div>
        <svg id="distance-chart" class="chart" viewBox="0 0 760 174" role="img" aria-label="Distance between the dancers across sixteen counts. Forward for two counts, back for two, then swing and prepare."></svg>
        <p class="chart-caption">Moving in lowers the line; moving back raises it. Balance: planted steps and a fourth-step inward push. Swing: right feet step every count on a small shared circle; outside left feet push between steps. The hip bar faces outward; the oblong torso turns inward. The hand connects to the back of the partner's shoulder.</p>
      </section>
    </div>
    <p class="study-note"><strong>A focused timing study.</strong> This simple pair repeats a balance, swing and preparation. It explores timing choices; it does not yet change the dances in the main studio or simulate individual dancers missing connections. The paths and thin arm links are schematic, not a physically validated dance performance.</p>
    <footer><span>One shared clock · one step per count · no change to the written counts</span><a href="./">Return to Contra Studio</a></footer>
  </main>`;

const $=<T extends Element=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const presets:Record<string,ExecutionTimingProfile>={
  fluent:{...FLUENT_TIMING_PROFILE},
  measured:{...DEFAULT_TIMING_PROFILE},
  late:{anticipationCounts:0,transitionCounts:1.5,responseDelayCounts:.75,recoveryCounts:4},
};
let torsoTurn=50,bodyCloseness=.75;
let profile={...presets.measured},beat=12,playing=false,bpm=112,previousTime=performance.now();
let clickEnabled=false,audioContext:AudioContext|undefined,lastClickedBeat=-1;
function countClick(){
  if(!clickEnabled||!audioContext||audioContext.state!=='running')return;
  const count=Math.floor(beat);if(count===lastClickedBeat)return;lastClickedBeat=count;
  const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),time=audioContext.currentTime;
  oscillator.frequency.value=count%8===0?1100:760;
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.06,time+.003);gain.gain.exponentialRampToValueAtTime(.0001,time+.045);
  oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(time);oscillator.stop(time+.05);
}
async function enableAudio(){
  try{audioContext??=new AudioContext();await audioContext.resume();if(playing)countClick();}
  catch{clickEnabled=false;$('#click').textContent='Click unavailable';$('#click').setAttribute('aria-pressed','false');$('#click').setAttribute('aria-label','Retry count click');}
}
const phaseLabel=(sample:ReturnType<typeof sampleStudy>)=>sample.phase==='balance'?(sample.executionCycleBeat<2?'Balance - step forward':sample.executionCycleBeat<3.65?'Balance - step back':'Fourth step - push toward the catch'):sample.phase==='swing'?'Buzz swing - right step every count':'Prepare for the balance';
const palette={fluent:'#285e4d',adjustable:'#b76b49'};
const wrap=(n:number,d:number)=>((n%d)+d)%d;
function updateControls(){
  for(const key of Object.keys(profile) as (keyof ExecutionTimingProfile)[]){
    $<HTMLInputElement>(`#${key}`).value=String(profile[key]);
    $<HTMLOutputElement>(`#${key}-value`).value=`${Number(profile[key].toFixed(2))} ${profile[key]===1?'count':'counts'}`;
  }
  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button=>button.setAttribute('aria-pressed',String(Object.entries(presets[button.dataset.preset!]).every(([k,v])=>profile[k as keyof ExecutionTimingProfile]===v))));
}
function drawFloor(id:'fluent'|'adjustable',timing:ExecutionTimingProfile){
  const sample=sampleStudy(beat,timing),color=palette[id],scale=110;
  const frameWeight=sample.phase==='swing'?sample.readiness:sample.phase==='preparation'?1-sample.readiness:0;
  const frame=sampleSwingTorsoStudy(sample.poses,{torsoTwistDegrees:-(id==='fluent'?50:torsoTurn)*frameWeight,inwardLean:(id==='fluent'?.06:bodyCloseness*.08)*frameWeight,contactStrength:frameWeight});
  const line=sample.poses.map(p=>({x:p.position.x*scale,y:p.position.z*scale}));
  let markup=`<defs><pattern id="${id}-grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M 34 0 L 0 0 0 34" fill="none" stroke="#e9ece2" stroke-width=".8"/></pattern></defs><rect x="-150" y="-120" width="300" height="240" rx="16" fill="#f6f7ef"/><rect x="-150" y="-120" width="300" height="240" rx="16" fill="url(#${id}-grid)"/><circle r="85" fill="none" stroke="#dde4d6" stroke-dasharray="3 6"/><path d="M-7 0H7 M0-7V7" stroke="#cdd6c7"/>`;
  if(sample.readiness>0)markup+=`<line x1="${line[0].x}" y1="${line[0].y}" x2="${line[1].x}" y2="${line[1].y}" stroke="${color}" stroke-width="2" stroke-dasharray="4 5" opacity="${.15+.55*sample.readiness}"/>`;
  if(sample.phase==='swing'&&sample.readiness>.99)markup+=`<circle r="${.07*scale}" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="2 3"/><circle r="2" fill="${color}"/>`;
  let armMarkup='';
  for(const arm of frame.arms)if(frameWeight>.01){
    const good=arm.reachable&&arm.routeClear,stroke=good?(arm.comfortable?color:'#ad7025'):'#ba5347';
    armMarkup+=`<path data-arm="${arm.actorId}" data-reachable="${arm.reachable}" data-route-clear="${arm.routeClear}" d="M${arm.shoulder.x*scale} ${arm.shoulder.z*scale} L${arm.elbow.x*scale} ${arm.elbow.z*scale} L${arm.hand.x*scale} ${arm.hand.z*scale}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" opacity="${frameWeight}" ${good?'':'stroke-dasharray="3 3"'}/><circle data-shoulder-contact="${arm.actorId}" cx="${arm.target.x*scale}" cy="${arm.target.z*scale}" r="3.5" fill="${good?stroke:'#fffefa'}" stroke="${stroke}" stroke-width="1.5" opacity="${frameWeight}"/>`;
  }
  for(const p of sample.poses){
    const torso=frame.torsos.find(t=>t.id===p.id)!;
    const hips=p.feet.map(f=>{const side=f.side==='left'?1:-1;return{x:(p.position.x+side*.09*Math.cos(p.pelvisYaw))*scale,y:(p.position.z-side*.09*Math.sin(p.pelvisYaw))*scale};});
    markup+=`<line x1="${hips[0].x}" y1="${hips[0].y}" x2="${hips[1].x}" y2="${hips[1].y}" stroke="${color}" stroke-width="4" opacity=".65"/>`;
    p.feet.forEach((f,i)=>{markup+=`<line x1="${hips[i].x}" y1="${hips[i].y}" x2="${f.position.x*scale}" y2="${f.position.z*scale-f.lift*scale}" stroke="${color}" stroke-width="2.5" opacity=".55"/>`;});
    const x=torso.center.x*scale,y=torso.center.z*scale,rotation=-torso.torsoYaw*180/Math.PI;
    const sx=p.supportPoint.x*scale,sy=p.supportPoint.z*scale;
    markup+=`<line x1="${sx}" y1="${sy}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="${1.5+2*p.pushOff}" opacity=".55"/><circle cx="${sx}" cy="${sy}" r="2.5" fill="${color}"/>`;
    for(const f of p.feet){
      const fx=f.position.x*scale,fy=f.position.z*scale,lift=f.lift*scale;
      markup+=`<g data-actor="${p.id}" data-foot="${f.side}" data-planted="${f.planted}" data-contact="${f.contact}" transform="translate(${fx} ${fy})"><ellipse rx="5" ry="9" fill="#263d3520" transform="rotate(${-f.yaw*180/Math.PI})"/><g transform="translate(0 ${-lift}) rotate(${-f.yaw*180/Math.PI})"><ellipse rx="4.5" ry="8" fill="${f.contact!=='airborne'?color:'#fffefa'}" stroke="${color}" stroke-width="1.5"/><path d="M-2 3H2" stroke="${f.contact!=='airborne'?'#fffefa':color}" stroke-width="1"/></g></g>`;
    }
    markup+=`<line x1="${p.position.x*scale}" y1="${p.position.z*scale}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="7" opacity=".5"/><g data-body="${p.id}" data-pelvis-yaw="${p.pelvisYaw}" data-torso-yaw="${torso.torsoYaw}" transform="translate(${x} ${y})"><g transform="rotate(${rotation})"><ellipse data-torso="${p.id}" rx="${torso.width*scale/2}" ry="${torso.depth*scale/2}" fill="${p.id===0?color:'#fffefa'}" fill-opacity=".72" stroke="${color}" stroke-width="2"/><path d="M-4 5L0 10L4 5" fill="none" stroke="${p.id===0?'#fffefa':color}" stroke-width="1.5"/></g><text y="2" text-anchor="middle" fill="${p.id===0?'white':color}" font-family="sans-serif" font-size="9" font-weight="600">${p.id+1}</text></g>`;
  }
  markup+=armMarkup;
  if(id==='adjustable')$('#frame-status').textContent=frameWeight<.95?'Shoulder hold forms as the pair closes.':frame.arms.some(a=>!a.reachable)?'Out of reach: bring the shoulders closer.':frame.arms.some(a=>!a.routeClear)?'Arm path crosses the torso: adjust the frame.':frame.arms.some(a=>!a.comfortable)?'Nearly straight arms: bring the shoulders closer.':`Back-of-shoulder contact: ${Math.round(Math.min(...frame.arms.map(a=>a.bendDegrees)))} degrees of elbow bend`;
  $(`#${id}-floor`).innerHTML=markup;
  $(`#${id}-phase`).textContent=phaseLabel(sample);
  $(`#${id}-status`).textContent=sample.lag>.025?`${sample.lag.toFixed(2)} count behind`:sample.phase==='preparation'&&sample.readiness>.98?'Ready for count 1':'On the beat';
}
const chart={left:30,right:742,top:18,bottom:135};
const chartX=(t:number)=>chart.left+t/16*(chart.right-chart.left);
const chartY=(distance:number)=>chart.bottom-distance/2.2*(chart.bottom-chart.top);
function pathFor(timing:ExecutionTimingProfile){
  return Array.from({length:513},(_,i)=>{
    const t=i/32,s=sampleStudy(t,timing),a=s.poses[0].position,b=s.poses[1].position;
    return `${i?'L':'M'}${chartX(t).toFixed(2)},${chartY(Math.hypot(a.x-b.x,a.z-b.z)).toFixed(2)}`;
  }).join(' ');
}
function drawChart(){
  const width=Math.max(260,$('#distance-chart').getBoundingClientRect().width);
  chart.right=width-16;
  $('#distance-chart').setAttribute('viewBox',`0 0 ${width} 174`);
  let grid='';
  for(let t=0;t<=16;t+=2)grid+=`<line x1="${chartX(t)}" x2="${chartX(t)}" y1="${chart.top}" y2="${chart.bottom}" stroke="#e5e9de"/><text x="${chartX(t)}" y="153" text-anchor="middle" fill="#748172" font-size="10">${t===16?'1 ↻':t%8+1}</text>`;
  $('#distance-chart').innerHTML=`<rect x="${chartX(0)}" y="${chart.top}" width="${chartX(4)-chartX(0)}" height="${chart.bottom-chart.top}" fill="#eef2e7"/><text x="${chartX(2)}" y="12" text-anchor="middle" fill="#748172" font-size="9">${width<400?'in / back':'2 forward · 2 back'}</text><text x="${chartX(8)}" y="12" text-anchor="middle" fill="#748172" font-size="9">swing</text><text x="${chartX(14)}" y="12" text-anchor="middle" fill="#748172" font-size="9">prepare</text>${grid}<path d="${pathFor(FLUENT_TIMING_PROFILE)}" fill="none" stroke="${palette.fluent}" stroke-width="2.5"/><path d="${pathFor(profile)}" fill="none" stroke="${palette.adjustable}" stroke-width="2.5" stroke-dasharray="5 3"/><line id="chart-cursor" x1="0" x2="0" y1="${chart.top}" y2="${chart.bottom}" stroke="#263d35" stroke-width="1.5"/><text transform="translate(11 79) rotate(-90)" text-anchor="middle" fill="#748172" font-size="9">farther apart ↑</text>`;
}
function render(){
  drawFloor('fluent',FLUENT_TIMING_PROFILE);drawFloor('adjustable',profile);
  const local=wrap(beat,16),count=Math.floor(local)%8+1;
  document.querySelectorAll<HTMLElement>('[data-count]').forEach(el=>{const active=Number(el.dataset.count)===count;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
  $('#music-phase').textContent=local<2?'Balance - two steps forward':local<3.65?'Balance - step back':local<4?'Fourth step - push toward the catch':local<12?'Swing - keep stepping':'Previous phrase - prepare for count 1';
  $('#step-cue').textContent=local>=4&&local<12?`Count ${count} - right foot steps`: `Count ${count} - ${Math.floor(beat)%2===0?'left':'right'} foot`;
  $<HTMLInputElement>('#seek').value=String(local);
  const x=String(chartX(local));$('#chart-cursor').setAttribute('x1',x);$('#chart-cursor').setAttribute('x2',x);
}
function setPlaying(value:boolean){playing=value;previousTime=performance.now();$('#play').textContent=playing?'Pause':'Play';$('#play').setAttribute('aria-label',`${playing?'Pause':'Play'} timing study`);if(playing&&clickEnabled)void enableAudio();}
$('#play').addEventListener('click',()=>setPlaying(!playing));
$('#reset').addEventListener('click',()=>{setPlaying(false);beat=12;lastClickedBeat=-1;render();});
$('#click').addEventListener('click',()=>{clickEnabled=!clickEnabled;$('#click').textContent=clickEnabled?'Click on':'Click off';$('#click').setAttribute('aria-pressed',String(clickEnabled));$('#click').setAttribute('aria-label',`${clickEnabled?'Disable':'Enable'} count click`);if(clickEnabled)void enableAudio();});
$('#tempo').addEventListener('change',()=>{bpm=Math.max(60,Math.min(160,Number($<HTMLInputElement>('#tempo').value)||112));$<HTMLInputElement>('#tempo').value=String(bpm);});
$('#seek').addEventListener('input',()=>{beat=Number($<HTMLInputElement>('#seek').value);lastClickedBeat=-1;render();});
for(const key of Object.keys(profile) as (keyof ExecutionTimingProfile)[])$('#'+key).addEventListener('input',()=>{profile={...profile,[key]:Number($<HTMLInputElement>('#'+key).value)};updateControls();drawChart();render();});
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button=>button.addEventListener('click',()=>{profile={...presets[button.dataset.preset!]};updateControls();drawChart();render();}));
document.addEventListener('keydown',event=>{if(event.code==='Space'&&event.target===document.body){event.preventDefault();setPlaying(!playing);}});
document.addEventListener('visibilitychange',()=>{previousTime=performance.now();});
window.addEventListener('resize',()=>{drawChart();render();});
function animate(now:number){const elapsed=Math.max(0,(now-previousTime)/1000);previousTime=now;if(playing&&!document.hidden){beat+=elapsed*bpm/60;countClick();render();}requestAnimationFrame(animate);}
function updateFrameControls(){
  $<HTMLInputElement>('#torsoTurn').value=String(torsoTurn);$<HTMLOutputElement>('#torsoTurn-value').value=`${torsoTurn} degrees`;
  $<HTMLInputElement>('#bodyCloseness').value=String(bodyCloseness);$<HTMLOutputElement>('#bodyCloseness-value').value=`${Math.round(bodyCloseness*100)}%`;
}
$('#torsoTurn').addEventListener('input',()=>{torsoTurn=Number($<HTMLInputElement>('#torsoTurn').value);updateFrameControls();render();});
$('#bodyCloseness').addEventListener('input',()=>{bodyCloseness=Number($<HTMLInputElement>('#bodyCloseness').value);updateFrameControls();render();});
updateControls();updateFrameControls();drawChart();render();requestAnimationFrame(animate);
