// Reward flow + particle background (auto-confirm subscription on open)
(() => {
  // Elements
  const visitSiteBtn = document.getElementById('visitSiteBtn');
  const openYTBtn = document.getElementById('openYTBtn');
  const subConfirm = document.getElementById('subConfirm');
  const awayTimeEl = document.getElementById('awayTime');
  const siteTaskStateEl = document.getElementById('siteTaskState');
  const subStateEl = document.getElementById('subState');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const statusEl = document.getElementById('status');
  const progressEl = document.getElementById('progress');

  // Config
  const SITE_URL = 'https://sites.google.com/students.mcpasd.k12.wi.us/kromeryunbl0ked/kromery-navagation?authuser=0';
  const YT_URL = 'https://www.youtube.com/@Frostsonscripts';
  const REQUIRED_AWAY_MS = 15000;

  // State
  let awayAccum = 0; // ms
  let hiddenStart = null;
  let siteTaskComplete = false;
  let subscribeConfirmed = false;

  // Open site in new tab and try to focus it
  visitSiteBtn.addEventListener('click', () => {
    const newWin = window.open(SITE_URL, '_blank', 'noopener,noreferrer');
    try { if (newWin) newWin.focus(); } catch(e) {}
    // If the page is already hidden, start measuring immediately
    if (document.hidden) {
      if (!hiddenStart) hiddenStart = Date.now();
    }
    siteTaskStateEl.textContent = 'waiting...';
    updateUI();
    // Tip for user if the new tab opened in background:
    if (!document.hidden) {
      alert('If the site opened in a background tab, switch to it and stay there 15 seconds so the task can complete.');
    }
  });

  // Open YT channel and auto-confirm subscription (cannot verify real subscription)
  openYTBtn.addEventListener('click', () => {
    const newWin = window.open(YT_URL, '_blank', 'noopener,noreferrer');
    try { if (newWin) newWin.focus(); } catch(e) {}
    // Auto-mark subscription as confirmed because browsers can't verify YouTube subscription
    subscribeConfirmed = true;
    subConfirm.checked = true;
    subStateEl.textContent = 'yes';
    checkAllTasks();
    alert('Subscription marked as confirmed locally. (This does not verify the real YouTube subscription.)');
  });

  // Manual subscription checkbox (still available)
  subConfirm.addEventListener('change', () => {
    subscribeConfirmed = subConfirm.checked;
    subStateEl.textContent = subscribeConfirmed ? 'yes' : 'no';
    checkAllTasks();
  });

  // Page visibility changes: accumulate hidden time
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (!hiddenStart) hiddenStart = Date.now();
    } else {
      if (hiddenStart) {
        awayAccum += Date.now() - hiddenStart;
        hiddenStart = null;
      }
    }
    evaluateAway();
  });

  // Also track blur/focus
  window.addEventListener('blur', () => {
    if (!hiddenStart) hiddenStart = Date.now();
  });
  window.addEventListener('focus', () => {
    if (hiddenStart) {
      awayAccum += Date.now() - hiddenStart;
      hiddenStart = null;
    }
    evaluateAway();
  });

  // Periodic UI update (timer)
  const tickInterval = setInterval(() => {
    let currentAccum = awayAccum;
    if (hiddenStart) currentAccum += (Date.now() - hiddenStart);
    awayTimeEl.textContent = Math.floor(currentAccum / 1000);
    evaluateAway();
  }, 200);

  function evaluateAway(){
    let currentAccum = awayAccum;
    if (hiddenStart) currentAccum += (Date.now() - hiddenStart);
    if (!siteTaskComplete && currentAccum >= REQUIRED_AWAY_MS) {
      siteTaskComplete = true;
      siteTaskStateEl.textContent = 'done';
      siteTaskStateEl.style.color = '#7cf7ff';
      updateUI();
      checkAllTasks();
      return;
    }
    if (!siteTaskComplete) {
      siteTaskStateEl.textContent = 'incomplete';
      siteTaskStateEl.style.color = '';
    }
  }

  function checkAllTasks(){
    if (siteTaskComplete && subscribeConfirmed) {
      enableReward();
    } else {
      disableReward();
    }
  }

  function enableReward(){
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'Get Reward';
    statusEl.textContent = 'ready';
  }

  function disableReward(){
    downloadBtn.disabled = true;
    statusEl.textContent = 'idle';
  }

  downloadBtn.addEventListener('click', () => {
    if (!(siteTaskComplete && subscribeConfirmed)) {
      alert('Please complete both tasks first.');
      return;
    }

    // Short progress animation then download the TXT file
    statusEl.textContent = 'preparing';
    progressEl.style.width = '0%';
    let p = 0;
    const anim = setInterval(() => {
      p += 6 + Math.random() * 12;
      if (p > 95) p = 95;
      progressEl.style.width = p + '%';
    }, 140);

    setTimeout(() => {
      clearInterval(anim);
      progressEl.style.width = '100%';
      statusEl.textContent = 'complete';
      downloadTxtFile('leooncode_reward.txt', 'Balls');
      downloadBtn.textContent = 'Done';
      downloadBtn.disabled = true;
    }, 1400);
  });

  resetBtn.addEventListener('click', () => {
    awayAccum = 0;
    hiddenStart = null;
    siteTaskComplete = false;
    subscribeConfirmed = false;
    subConfirm.checked = false;
    awayTimeEl.textContent = '0';
    siteTaskStateEl.textContent = 'not started';
    siteTaskStateEl.style.color = '';
    subStateEl.textContent = 'no';
    progressEl.style.width = '0%';
    downloadBtn.textContent = 'Get Reward';
    disableReward();
  });

  function updateUI(){
    awayTimeEl.textContent = Math.floor(awayAccum / 1000);
    subStateEl.textContent = subscribeConfirmed ? 'yes' : 'no';
  }

  function downloadTxtFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // --- Particle background (canvas) ---
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  let width = 0;
  let height = 0;
  let particles = [];

  function resize(){
    width = canvas.width = innerWidth * devicePixelRatio;
    height = canvas.height = innerHeight * devicePixelRatio;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  addEventListener('resize', () => {
    resize();
    createParticles(Math.round((innerWidth * innerHeight) / 70000));
  });

  function createParticles(count){
    particles = [];
    for(let i=0;i<count;i++){
      particles.push({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 0.6 + Math.random() * 2.6,
        hue: 190 + Math.random() * 60,
        alpha: 0.05 + Math.random() * 0.25
      });
    }
  }

  function draw(){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    for(const p of particles){
      p.x += p.vx;
      p.y += p.vy;

      if(p.x < -20) p.x = innerWidth + 20;
      if(p.x > innerWidth + 20) p.x = -20;
      if(p.y < -20) p.y = innerHeight + 20;
      if(p.y > innerHeight + 20) p.y = -20;

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
      const color = `hsla(${p.hue}, 85%, 60%, ${p.alpha})`;
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(12,10,30,0.06)';
    ctx.fillRect(0,0,innerWidth,innerHeight);
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }

  resize();
  createParticles(Math.round((innerWidth * innerHeight) / 70000));
  requestAnimationFrame(draw);

  // initial UI
  resetBtn.click();

})();
