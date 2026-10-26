import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  for (const [layout, width, height] of [['mobile',390,844], ['desktop',1440,900], ['small-phone',320,568]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const results = await page.evaluate(async () => {
      const data = await import('/src/people.js');
      const scene = window.__interwoven.scene;
      const c = scene.ctx;
      const originals = { dot:scene.drawDot, thread:scene.drawThread, labels:scene.drawLabels, text:c.fillText, move:c.moveTo, line:c.lineTo, curve:c.quadraticCurveTo };
      let capture, isChild = false;
      scene.drawDot = function(p,x,y,alpha) { capture.dots.push({id:p.id,x,y,alpha}); return originals.dot.apply(this,arguments); };
      scene.drawLabels = function(labels) { capture.labels.push(...labels.map(l=>l.p.id)); return originals.labels.apply(this,arguments); };
      scene.drawThread = function(p) { capture.threads.push(p.id); isChild = p.id==='child'; try { return originals.thread.apply(this,arguments); } finally { isChild=false; } };
      c.moveTo = function(x,y) { if(isChild)capture.path.push([x,y]); return originals.move.apply(this,arguments); };
      c.lineTo = function(x,y) { if(isChild)capture.path.push([x,y]); return originals.line.apply(this,arguments); };
      c.quadraticCurveTo = function(cx,cy,x,y) { if(isChild)capture.path.push([cx,cy],[x,y]); return originals.curve.apply(this,arguments); };
      c.fillText = function(text) { capture.text.push({text:String(text),alpha:this.globalAlpha,font:this.font}); return originals.text.apply(this,arguments); };
      const at = age => { capture={age,dots:[],threads:[],labels:[],text:[],path:[]}; scene.render(age/85); return structuredClone(capture); };
      const dot = (sample,id) => sample.dots.find(d=>d.id===id);
      const departures = [];
      try {
        for(const person of data.PEOPLE.filter(p=>p.endAge!=null)) {
          const before=at(person.endAge-.1), middle=at(person.endAge+2), above=at(person.endAge+4), hold=at(person.endAge+4.5), fade=at(person.endAge+6.5), after=at(person.endAge+8.1);
          const sky=scene.skyPoint(person);
          departures.push({ id:person.id,
            startsOnLine:Math.abs(dot(before,person.id).y-scene.nowY)<.01,
            risesBeforeFading:dot(middle,person.id).alpha===1 && dot(middle,person.id).y<scene.nowY && dot(middle,person.id).y>sky.y,
            fullyVisibleAbove:dot(above,person.id).alpha===1 && Math.abs(dot(above,person.id).y-sky.y)<.01,
            restsAbove:dot(hold,person.id).alpha===1 && Math.abs(dot(hold,person.id).y-sky.y)<.01,
            slowFade:Math.abs(dot(fade,person.id).alpha-.5)<.01,
            threadDissolves:!above.threads.includes(person.id),
            goneAfter:!dot(after,person.id) && !after.labels.includes(person.id) && !after.text.some(t=>t.text===person.name)
          });
        }
        let childSafe=true, childAttached=true;
        for(let age=66;age<=85;age+=.5) {
          const sample=at(age), child=dot(sample,'child');
          childSafe &&= !!child && child.x>scene.axisX+20 && child.x<scene.w-30 && Math.abs(child.y-scene.nowY)<.01 && sample.path.every(([x])=>x>scene.axisX+15 && x<scene.w-22);
          childAttached &&= !!sample.path.length && Math.abs(sample.path[0][0]-child.x)<.01 && Math.abs(sample.path[0][1]-child.y)<.01;
        }
        const childChange=dot(at(79),'child').x-dot(at(68),'child').x;
        const firstPath=at(82).path, lastPath=at(85).path;
        const pathsStop=JSON.stringify(firstPath)===JSON.stringify(lastPath);
        const early=at(81.5), reveal=at(82.6), final=at(85);
        const title = sample => sample.text.filter(t=>t.text==='L' && t.font.includes('Cormorant') && parseFloat(t.font)>=35);
        const endingAfterRise=!title(early).length && title(reveal).some(t=>t.alpha>0);
        const finalText=final.text.filter(t=>t.text.startsWith('Some threads end.') || t.text.startsWith('And somehow,'));
        let deterministic=true;
        for(const age of [11,61,79,83.5]) { at(age); const bitmap=scene.canvas.toDataURL(); at(85-age);at(age); deterministic &&= bitmap===scene.canvas.toDataURL(); }
        return {departures,childSafe,childAttached,childChange,pathsStop,endingAfterRise,finalDots:final.dots.map(d=>d.id).sort(),finalClosingLines:finalText.map(t=>({text:t.text,alpha:t.alpha})),deterministic};
      } finally {
        scene.drawDot=originals.dot;scene.drawThread=originals.thread;scene.drawLabels=originals.labels;c.fillText=originals.text;c.moveTo=originals.move;c.lineTo=originals.line;c.quadraticCurveTo=originals.curve;
      }
    });
    for(const departure of results.departures) for(const [test,pass] of Object.entries(departure)) if(test!=='id') assert.ok(pass,`${layout}: ${departure.id} ${test}`);
    for(const key of ['childSafe','childAttached','pathsStop','endingAfterRise','deterministic']) assert.ok(results[key],`${layout}: ${key}`);
    assert.ok(results.childChange>width*.08,`${layout}: child has a distinct route`);
    assert.deepEqual(results.finalDots,['child','partner']);
    assert.equal(results.finalClosingLines.length,2);
    assert.ok(results.finalClosingLines.every(t=>Math.abs(t.alpha-.85)<.001));
    for(const age of [12.5,73,79,81.5,83.5,85]) {
      await page.evaluate(age=>window.__interwoven.seek(age),age);
      await page.waitForFunction(age=>Math.abs(window.__interwoven.progress*85-age)<.02,age);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.screenshot({ path:`/home/user/qa/${layout}-rise-${age}.png` });
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({layout,results,errors},null,2));
    await page.close();
  }
} finally { await browser.close(); }
