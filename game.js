(function () {
  'use strict';

  /* =====================================================
     ค่าคงที่และข้อมูลด่าน
     ===================================================== */
  var POINTS_PER_CORRECT = 10;
  var TOTAL_QUESTIONS = 20;

  var LEVELS = [
    {
      id: 1, name: 'ทุ่งหญ้าตัวเลข', icon: '🌿', theme: 'level1',
      max: 20, count: 7, pass: 4, near: 5, item: '🍎',
      story: 'ยินดีต้อนรับสู่ทุ่งหญ้าตัวเลข! ช่วยเปรียบเทียบจำนวนตั้งแต่ 0 ถึง 20 ให้ถูกต้อง เพื่อเปิดประตูไปสู่ป่ามหัศจรรย์'
    },
    {
      id: 2, name: 'ป่ามหัศจรรย์', icon: '🌳', theme: 'level2',
      max: 50, count: 7, pass: 4, near: 10, item: '🍄',
      story: 'ป่ามหัศจรรย์เต็มไปด้วยเห็ดและนกฮูกใจดี เปรียบเทียบจำนวนตั้งแต่ 0 ถึง 50 ให้ถูกต้อง เพื่อเดินทางต่อไปยังปราสาท'
    },
    {
      id: 3, name: 'ปราสาทราชาตัวเลข', icon: '🏰', theme: 'level3',
      max: 100, count: 6, pass: 3, near: 15, item: '💎',
      story: 'ถึงปราสาทราชาตัวเลขแล้ว! เปรียบเทียบจำนวนตั้งแต่ 0 ถึง 100 ให้ถูกต้อง เพื่อพิชิตอาณาจักรตัวเลข'
    }
  ];

  var PRAISE = ['เก่งมาก!', 'ยอดเยี่ยม!', 'เยี่ยมไปเลย!', 'สุดยอด!', 'ฉลาดจริง ๆ!'];
  var TRY_AGAIN = ['ลองอีกครั้งนะ', 'ไม่เป็นไรนะ ลองใหม่ได้', 'สู้ ๆ นะ'];
  var GUIDE_TEXT = [
    'เลือกเครื่องหมายที่ถูกต้องนะ',
    'ดูตัวเลขดี ๆ นะ',
    'ปากจระเข้ต้องเปิดไปทางเลขที่มากกว่า!',
    'ถ้าสองจำนวนเท่ากัน ใช้เครื่องหมายเท่ากับนะ'
  ];

  var DECO = {
    home: ['🌳', '🌼', '🍄', '🌷', '🌳'],
    map: ['🌴', '⛵', '🗺️', '🌴', '🐚'],
    level1: ['🌼', '🦋', '🌷', '🐑', '🌻'],
    level2: ['🌲', '🍄', '🦉', '🌲', '🐿️'],
    level3: ['🏰', '⭐', '🐉', '⭐', '🏰'],
    result: ['🎉', '🏆', '🎈', '🏆', '🎉']
  };

  var state = {
    name: '',
    cur: 0,            // ด่านที่กำลังเล่น (0-2)
    qIndex: 0,         // ข้อที่กำลังเล่นในด่าน
    questions: [],
    attempt: 0,        // จำนวนข้อที่ถูกในรอบนี้
    levelCorrect: [0, 0, 0], // ผลที่ดีที่สุดของแต่ละด่านที่ผ่านแล้ว
    levelDone: [false, false, false],
    unlocked: 1,       // จำนวนด่านที่ปลดล็อก
    justUnlocked: -1,
    answered: false,
    sound: true
  };

  /* =====================================================
     ตัวช่วยทั่วไป
     ===================================================== */
  function $(id) { return document.getElementById(id); }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function sum(arr) { return arr.reduce(function (s, v) { return s + v; }, 0); }
  function compare(a, b) { return a > b ? '>' : (a < b ? '<' : '='); }
  function symWord(sym) { return sym === '>' ? 'มากกว่า' : (sym === '<' ? 'น้อยกว่า' : 'เท่ากับ'); }

  /* =====================================================
     เสียงเอฟเฟกต์ (Web Audio) และเสียงอ่านภาษาไทย
     ===================================================== */
  var actx = null;
  function audio() {
    try {
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) actx = new AC();
      }
      if (actx && actx.state === 'suspended') actx.resume();
    } catch (e) { actx = null; }
    return actx;
  }
  function tone(freq, start, dur, type, vol) {
    if (!state.sound) return;
    var c = audio();
    if (!c) return;
    try {
      var o = c.createOscillator();
      var g = c.createGain();
      var t = c.currentTime + start;
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch (e) { /* ไม่ต้องทำอะไร */ }
  }
  var sfx = {
    click: function () { tone(660, 0, 0.08, 'square', 0.07); },
    correct: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.2, 'triangle', 0.22); });
    },
    coin: function () { tone(1319, 0, 0.1, 'square', 0.08); tone(1760, 0.09, 0.28, 'square', 0.08); },
    wrong: function () { tone(220, 0, 0.2, 'sawtooth', 0.1); tone(165, 0.17, 0.32, 'sawtooth', 0.1); },
    win: function () {
      [523, 659, 784, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.12, 0.25, 'triangle', 0.22); });
    },
    lose: function () { tone(392, 0, 0.2, 'triangle', 0.15); tone(330, 0.2, 0.2, 'triangle', 0.15); tone(262, 0.4, 0.35, 'triangle', 0.15); }
  };

  var thVoice = null;
  var voicesLoaded = false;
  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    var vs = window.speechSynthesis.getVoices();
    voicesLoaded = vs && vs.length > 0;
    thVoice = null;
    for (var i = 0; i < vs.length; i++) {
      if (/^th/i.test(vs[i].lang)) { thVoice = vs[i]; break; }
    }
  }
  if ('speechSynthesis' in window) {
    loadVoices();
    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    } else {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }
  function speak(text) {
    if (!state.sound || !('speechSynthesis' in window)) return;
    // ถ้าเครื่องมีรายการเสียงแล้ว แต่ไม่มีเสียงภาษาไทย จะไม่อ่าน เพื่อไม่ให้ออกเสียงผิด
    if (voicesLoaded && !thVoice) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'th-TH';
      if (thVoice) u.voice = thVoice;
      u.rate = 0.85;
      u.pitch = 1.15;
      window.speechSynthesis.speak(u);
    } catch (e) { /* ไม่ต้องทำอะไร */ }
  }

  /* =====================================================
     การสร้างโจทย์ (ตรวจสอบความถูกต้องทุกข้อ)
     ===================================================== */
  function isValidQuestion(q, lv) {
    if (!q) return false;
    if (!Number.isInteger(q.a) || !Number.isInteger(q.b)) return false;
    if (q.a < 0 || q.b < 0 || q.a > lv.max || q.b > lv.max || q.a > 100 || q.b > 100) return false;
    if (q.answer !== compare(q.a, q.b)) return false;
    return true;
  }

  function pairKey(a, b) { return Math.min(a, b) + '-' + Math.max(a, b); }

  function makePair(lv, type, used) {
    for (var k = 0; k < 400; k++) {
      var a, b, big, small;
      if (type === '=') {
        a = b = randInt(1, lv.max);
      } else {
        var mode = Math.random();
        if (lv.id > 1 && mode < 0.2) {
          // เลขสลับหลัก เช่น 36 กับ 63
          var t = randInt(1, 9), u = randInt(0, 9);
          if (t === u) continue;
          var x = t * 10 + u, y = u * 10 + t;
          if (x > lv.max || y > lv.max || x === y) continue;
          big = Math.max(x, y); small = Math.min(x, y);
        } else if (mode < 0.65) {
          // เลขใกล้กัน
          big = randInt(1, lv.max);
          small = big - randInt(1, Math.min(big, lv.near));
        } else {
          big = randInt(1, lv.max);
          small = randInt(0, big - 1);
        }
        if (type === '>') { a = big; b = small; } else { a = small; b = big; }
      }
      var key = pairKey(a, b);
      if (used[key]) continue;
      var q = { a: a, b: b, answer: compare(a, b) };
      if (q.answer !== type || !isValidQuestion(q, lv)) continue;
      used[key] = true;
      return q;
    }
    // สำรอง: หาคู่ตัวเลขที่ยังไม่ซ้ำแบบเรียงลำดับ
    for (var bg = 1; bg <= lv.max; bg++) {
      for (var sm = 0; sm <= bg; sm++) {
        if (type === '=' && sm !== bg) continue;
        if (type !== '=' && sm === bg) continue;
        var kk = pairKey(bg, sm);
        if (used[kk]) continue;
        var qa = type === '<' ? sm : bg;
        var qb = type === '<' ? bg : sm;
        if (type === '=') { qa = bg; qb = bg; }
        var qq = { a: qa, b: qb, answer: compare(qa, qb) };
        if (qq.answer === type && isValidQuestion(qq, lv)) { used[kk] = true; return qq; }
      }
    }
    return { a: 1, b: 0, answer: '>' };
  }

  function buildQuestions(idx) {
    var lv = LEVELS[idx];
    var types = ['>', '>', '<', '<'];
    var equalCount = (idx === 0) ? 2 : 1;
    for (var i = 0; i < equalCount; i++) types.push('=');
    while (types.length < lv.count) types.push(pick(['>', '<']));
    shuffle(types);
    var used = {};
    var list = types.map(function (t) { return makePair(lv, t, used); });
    // ตรวจซ้ำอีกครั้งหลังสร้างเสร็จ
    list.forEach(function (q) {
      if (!isValidQuestion(q, lv)) { q.answer = compare(q.a, q.b); }
    });
    return list;
  }

  /* =====================================================
     คำอธิบายเฉลย
     ===================================================== */
  function explain(a, b) {
    if (a === b) {
      return a + ' กับ ' + b + ' เป็นจำนวนที่เท่ากัน จึงใช้เครื่องหมายเท่ากับ';
    }
    var big = Math.max(a, b), small = Math.min(a, b);
    var tb = Math.floor(big / 10), ts = Math.floor(small / 10);
    var ub = big % 10, us = small % 10;
    var why;
    if (big <= 10) {
      if (small === 0) {
        why = '0 คือไม่มีเลย ส่วน ' + big + ' มีอยู่ ' + big + ' ชิ้น';
      } else {
        why = 'ถ้านับเลขทีละหนึ่ง จะนับถึง ' + small + ' ก่อน แล้วจึงนับถึง ' + big;
      }
    } else if (tb !== ts) {
      if (ts === 0) {
        why = small + ' มีไม่ถึง 1 สิบ แต่ ' + big + ' มี ' + tb + ' สิบ';
      } else {
        why = big + ' มี ' + tb + ' สิบ ส่วน ' + small + ' มี ' + ts + ' สิบ ' + tb + ' สิบมากกว่า ' + ts + ' สิบ';
      }
    } else {
      why = big + ' กับ ' + small + ' มี ' + tb + ' สิบเท่ากัน จึงดูหลักหน่วย ' + ub + ' มากกว่า ' + us;
    }
    return why + ' ดังนั้น ' + big + ' มากกว่า ' + small + ' ปากจระเข้เปิดไปทางเลข ' + big;
  }

  /* =====================================================
     การแสดงภาพตัวเลข
     ===================================================== */
  function repeatHtml(str, n) {
    var s = '';
    for (var i = 0; i < n; i++) s += str;
    return s;
  }
  function visualize(n, item) {
    if (n === 0) return '<div class="empty-vis">ไม่มีเลย</div>';
    if (n <= 10) {
      return '<div class="emoji-row">' + repeatHtml('<span>' + item + '</span>', n) + '</div>';
    }
    var tens = Math.floor(n / 10), ones = n % 10;
    var html = '<div class="tens">' + repeatHtml('<div class="ten">' + repeatHtml('<i></i>', 10) + '</div>', tens) + '</div>';
    if (ones > 0) html += '<div class="ones">' + repeatHtml('<i></i>', ones) + '</div>';
    return html;
  }
  function captionOf(n) {
    if (n < 10) return '';
    var t = Math.floor(n / 10), o = n % 10;
    return o === 0 ? (t + ' สิบ') : (t + ' สิบ ' + o + ' หน่วย');
  }

  /* =====================================================
     การเปลี่ยนหน้าจอ
     ===================================================== */
  function setDeco(theme) {
    var arr = DECO[theme] || DECO.home;
    $('decoBottom').innerHTML = arr.map(function (e) { return '<span>' + e + '</span>'; }).join('');
  }
  function showScreen(name, theme) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    $('screen-' + name).classList.add('active');
    var th = theme || (name === 'learn' ? 'home' : name);
    $('app').setAttribute('data-theme', th);
    setDeco(th);
    window.scrollTo(0, 0);
  }

  /* =====================================================
     กล่องข้อความ
     ===================================================== */
  function showModal(opt) {
    $('modalIcon').textContent = opt.icon || '⭐';
    $('modalTitle').textContent = opt.title || '';
    $('modalText').textContent = opt.text || '';
    var box = $('modalBtns');
    box.innerHTML = '';
    (opt.buttons || []).forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'btn ' + (b.cls || '');
      btn.textContent = b.label;
      btn.addEventListener('click', function () {
        hideModal();
        if (b.action) b.action();
      });
      box.appendChild(btn);
    });
    $('modal').hidden = false;
  }
  function hideModal() { $('modal').hidden = true; }
  function modalOpen() { return !$('modal').hidden; }

  /* =====================================================
     เอฟเฟกต์เหรียญและพลุกระดาษ
     ===================================================== */
  function coinBurst(fromEl) {
    var fx = $('fx');
    var r = fromEl.getBoundingClientRect();
    var t = $('coinChip').getBoundingClientRect();
    var sx = r.left + r.width / 2, sy = r.top + r.height / 2;
    var tx = t.left + t.width / 2, ty = t.top + t.height / 2;

    var plus = document.createElement('div');
    plus.className = 'plus-ten';
    plus.textContent = '+10 🪙';
    plus.style.left = sx + 'px';
    plus.style.top = (sy - 30) + 'px';
    fx.appendChild(plus);
    setTimeout(function () { plus.remove(); }, 1300);

    for (var i = 0; i < 10; i++) {
      (function (i) {
        var c = document.createElement('div');
        c.className = 'fly-coin';
        c.textContent = '🪙';
        c.style.left = sx + 'px';
        c.style.top = sy + 'px';
        fx.appendChild(c);
        if (!c.animate) { c.remove(); return; }
        var ang = Math.random() * Math.PI * 2;
        var dist = 40 + Math.random() * 70;
        var mx = Math.cos(ang) * dist, my = Math.sin(ang) * dist;
        var anim = c.animate([
          { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
          { transform: 'translate(calc(-50% + ' + mx + 'px), calc(-50% + ' + my + 'px)) scale(1.2)', opacity: 1, offset: 0.35 },
          { transform: 'translate(calc(-50% + ' + (tx - sx) + 'px), calc(-50% + ' + (ty - sy) + 'px)) scale(.6)', opacity: 0.9 }
        ], { duration: 900 + Math.random() * 300, delay: i * 40, easing: 'ease-in-out', fill: 'forwards' });
        anim.onfinish = function () { c.remove(); };
      })(i);
    }
    setTimeout(sfx.coin, 450);
  }

  function confetti() {
    var fx = $('fx');
    var items = ['🎉', '⭐', '🪙', '✨', '🎈'];
    for (var i = 0; i < 36; i++) {
      var s = document.createElement('span');
      s.className = 'confetti';
      s.textContent = pick(items);
      s.style.left = (Math.random() * 100) + 'vw';
      s.style.fontSize = (18 + Math.random() * 22) + 'px';
      s.style.animationDuration = (2.2 + Math.random() * 2) + 's';
      s.style.animationDelay = (Math.random() * 0.6) + 's';
      fx.appendChild(s);
      (function (el) { setTimeout(function () { el.remove(); }, 5200); })(s);
    }
  }

  /* =====================================================
     หน้าแผนที่
     ===================================================== */
  function starText(c, total) {
    var r = c / total;
    return r >= 0.85 ? '⭐⭐⭐' : (r >= 0.7 ? '⭐⭐' : '⭐');
  }
  function renderMap() {
    $('mapName').textContent = state.name;
    $('mapCoins').textContent = sum(state.levelCorrect) * POINTS_PER_CORRECT;
    $('mapHint').textContent = 'แตะที่ด่านเพื่อเริ่มผจญภัย';
    var nodes = document.querySelectorAll('.level-node');
    for (var i = 0; i < nodes.length; i++) {
      var lv = LEVELS[i];
      var locked = (i + 1) > state.unlocked;
      var done = state.levelDone[i];
      var node = nodes[i];
      node.classList.toggle('locked', locked);
      node.classList.toggle('done', done);
      node.classList.toggle('new', state.justUnlocked === i);
      node.querySelector('.node-icon').textContent = locked ? '🔒' : lv.icon;
      var st = node.querySelector('.node-status');
      if (locked) st.textContent = '🔒 ต้องผ่านด่านก่อนหน้าก่อน';
      else if (done) st.textContent = starText(state.levelCorrect[i], lv.count) + ' ผ่านแล้ว ถูก ' + state.levelCorrect[i] + ' จาก ' + lv.count + ' ข้อ';
      else st.textContent = '▶ พร้อมลุยแล้ว!';
    }
    if (state.justUnlocked >= 0) {
      $('mapHint').textContent = '🔓 ปลดล็อกด่านใหม่แล้ว! ไปต่อกันเลย';
    }
    state.justUnlocked = -1;
  }

  /* =====================================================
     การเล่นเกม
     ===================================================== */
  function levelOffset() {
    var off = 0;
    for (var i = 0; i < state.cur; i++) off += LEVELS[i].count;
    return off;
  }
  function currentScore() {
    var total = 0;
    for (var i = 0; i < state.levelCorrect.length; i++) {
      if (i !== state.cur) total += state.levelCorrect[i];
    }
    total += state.attempt;
    return total * POINTS_PER_CORRECT;
  }
  function updateHud(bump) {
    var lv = LEVELS[state.cur];
    var num = levelOffset() + state.qIndex + 1;
    var score = currentScore();
    $('hudName').textContent = '🦁 ' + state.name;
    $('hudLevel').textContent = 'ด่านที่ ' + lv.id + ' ' + lv.name;
    $('hudQ').textContent = num + '/' + TOTAL_QUESTIONS;
    $('hudScore').textContent = score;
    $('hudCoins').textContent = score;
    var done = levelOffset() + state.qIndex + (state.answered ? 1 : 0);
    $('progressFill').style.width = Math.round(done * 100 / TOTAL_QUESTIONS) + '%';
    $('progressText').textContent = 'ทำไปแล้ว ' + done + ' จาก ' + TOTAL_QUESTIONS + ' ข้อ';
    if (bump) {
      var chips = [$('hudScore').parentNode, $('coinChip')];
      chips.forEach(function (c) {
        c.classList.remove('bump');
        void c.offsetWidth;
        c.classList.add('bump');
      });
    }
  }

  function startLevel(idx) {
    state.cur = idx;
    state.qIndex = 0;
    state.attempt = 0;
    state.answered = false;
    state.questions = buildQuestions(idx);
    var lv = LEVELS[idx];
    showScreen('game', lv.theme);
    updateHud(false);
    showModal({
      icon: lv.icon,
      title: 'ด่านที่ ' + lv.id + ' ' + lv.name,
      text: lv.story + ' (ต้องตอบถูกอย่างน้อย ' + lv.pass + ' ข้อ จึงจะผ่านด่าน)',
      buttons: [{ label: 'ลุยเลย! ▶', cls: 'btn-green btn-big', action: renderQuestion }]
    });
    speak('ด่านที่ ' + lv.id + ' ' + lv.name);
  }

  function renderQuestion() {
    var lv = LEVELS[state.cur];
    var q = state.questions[state.qIndex];
    state.answered = false;

    $('numA').textContent = q.a;
    $('numB').textContent = q.b;
    $('visA').innerHTML = visualize(q.a, lv.item);
    $('visB').innerHTML = visualize(q.b, lv.item);
    $('capA').textContent = captionOf(q.a);
    $('capB').textContent = captionOf(q.b);

    var slot = $('slot');
    slot.textContent = '?';
    slot.className = 'slot';

    ['cardA', 'cardB'].forEach(function (id) {
      var c = $(id);
      c.className = 'num-card';
      void c.offsetWidth;
      c.className = 'num-card enter';
    });

    var btns = document.querySelectorAll('.ans-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = false;
      btns[i].classList.remove('correct', 'wrong', 'dim');
    }
    $('feedback').hidden = true;
    $('guideAvatar').textContent = '🦁';
    $('guideBubble').textContent = pick(GUIDE_TEXT);
    updateHud(false);
    speak(questionSpeech(q));
  }

  function questionSpeech(q) {
    return 'เลข ' + q.a + ' กับ เลข ' + q.b + ' ใช้เครื่องหมายอะไรดี';
  }

  function onAnswer(sym) {
    if (state.answered || modalOpen()) return;
    var q = state.questions[state.qIndex];
    var lv = LEVELS[state.cur];
    state.answered = true;

    var correct = (sym === q.answer);
    var btns = document.querySelectorAll('.ans-btn');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      b.disabled = true;
      var s = b.getAttribute('data-sym');
      if (s === q.answer) b.classList.add('correct');
      else if (s === sym) b.classList.add('wrong');
      else b.classList.add('dim');
    }

    var slot = $('slot');
    slot.textContent = sym;
    slot.className = 'slot ' + (correct ? 'ok' : 'bad');

    // ไฮไลต์ตัวเลขที่มากกว่า
    if (q.answer === '>') { $('cardA').classList.add('win'); $('cardB').classList.add('lose'); }
    else if (q.answer === '<') { $('cardB').classList.add('win'); $('cardA').classList.add('lose'); }
    else { $('cardA').classList.add('win'); $('cardB').classList.add('win'); }

    var praise = pick(PRAISE), retry = pick(TRY_AGAIN);
    var fb = $('feedback');
    fb.className = 'feedback ' + (correct ? 'ok' : 'bad');
    $('fbFace').textContent = correct ? '🥳' : '🤗';
    $('fbTitle').textContent = correct ? praise : retry;
    $('fbEq').textContent = q.a + ' ' + q.answer + ' ' + q.b;

    var expl = explain(q.a, q.b);
    var textShow = correct
      ? 'ถูกต้อง! ' + expl
      : 'คำตอบที่ถูกคือ "' + symWord(q.answer) + '" ' + expl;
    $('fbText').textContent = textShow;

    var isLast = (state.qIndex === lv.count - 1);
    $('nextBtn').textContent = isLast ? 'ดูผลด่าน 🏁' : 'ข้อต่อไป ▶';
    fb.hidden = false;

    if (correct) {
      state.attempt++;
      $('guideAvatar').textContent = '🥳';
      sfx.correct();
      coinBurst(slot);
      speak(praise + ' ' + q.a + ' ' + symWord(q.answer) + ' ' + q.b + ' ' + expl);
    } else {
      $('guideAvatar').textContent = '🤗';
      sfx.wrong();
      speak(retry + ' คำตอบที่ถูกคือ ' + q.a + ' ' + symWord(q.answer) + ' ' + q.b + ' ' + expl);
    }
    updateHud(correct);

    setTimeout(function () {
      try { fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { /* ไม่ต้องทำอะไร */ }
    }, 150);
  }

  function nextQuestion() {
    var lv = LEVELS[state.cur];
    if (!state.answered) return;
    if (state.qIndex < lv.count - 1) {
      state.qIndex++;
      renderQuestion();
      window.scrollTo(0, 0);
    } else {
      finishLevel();
    }
  }

  function finishLevel() {
    var lv = LEVELS[state.cur];
    var got = state.attempt;
    var passed = got >= lv.pass;
    var isLastLevel = (state.cur === LEVELS.length - 1);

    if (passed) {
      state.levelCorrect[state.cur] = Math.max(state.levelCorrect[state.cur], got);
      state.levelDone[state.cur] = true;
      var unlockText = '';
      if (!isLastLevel && state.unlocked < state.cur + 2) {
        state.unlocked = state.cur + 2;
        state.justUnlocked = state.cur + 1;
      }
      if (!isLastLevel) unlockText = ' ปลดล็อกด่านใหม่แล้ว: ' + LEVELS[state.cur + 1].name;
      sfx.win();
      confetti();
      speak('ผ่านด่านแล้ว ยอดเยี่ยมมาก');
      showModal({
        icon: '🏆',
        title: 'ผ่านด่านแล้ว!',
        text: state.name + ' ตอบถูก ' + got + ' จาก ' + lv.count + ' ข้อ ได้รับ ' + (got * POINTS_PER_CORRECT) + ' เหรียญ' + unlockText,
        buttons: isLastLevel
          ? [{ label: 'ดูผลรวม 🎉', cls: 'btn-green btn-big', action: showResult }]
          : [{ label: 'ไปที่แผนที่ 🗺️', cls: 'btn-green btn-big', action: goMap }]
      });
    } else {
      sfx.lose();
      speak('ลองอีกครั้งนะ สู้ ๆ');
      showModal({
        icon: '💪',
        title: 'ลองอีกครั้งนะ',
        text: 'ด่านนี้ต้องตอบถูกอย่างน้อย ' + lv.pass + ' ข้อ ' + state.name + ' ตอบถูก ' + got + ' ข้อ ลองใหม่อีกครั้ง หนูทำได้แน่นอน!',
        buttons: [
          { label: 'เล่นด่านนี้ใหม่ 🔄', cls: 'btn-green btn-big', action: function () { startLevel(state.cur); } },
          { label: 'กลับไปแผนที่ 🗺️', cls: 'btn-blue', action: goMap }
        ]
      });
    }
  }

  function goMap() {
    renderMap();
    showScreen('map');
  }

  /* =====================================================
     หน้าสรุปผล
     ===================================================== */
  function gradeOf(p) {
    if (p >= 80) return { level: 4, label: 'ดีเยี่ยม', stars: 3, msg: 'เก่งที่สุดเลย! หนูคือนักผจญภัยตัวจริง' };
    if (p >= 70) return { level: 3, label: 'ดี', stars: 2, msg: 'เก่งมาก! อีกนิดเดียวก็เต็มแล้ว' };
    if (p >= 60) return { level: 2, label: 'ปานกลาง', stars: 2, msg: 'ทำได้ดี! ลองเล่นอีกครั้งจะเก่งขึ้นอีก' };
    if (p >= 50) return { level: 1, label: 'พอใช้', stars: 1, msg: 'พยายามได้ดีมาก เล่นอีกครั้งนะ' };
    return { level: 0, label: 'ต้องพยายามอีกนิด', stars: 1, msg: 'ไม่เป็นไรนะ ลองอีกครั้งแล้วจะเก่งขึ้น' };
  }

  function countUp(el, to, suffix) {
    var cur = 0;
    var step = Math.max(1, Math.ceil(to / 25));
    el.textContent = '0' + (suffix || '');
    if (to === 0) return;
    var timer = setInterval(function () {
      cur += step;
      if (cur >= to) { cur = to; clearInterval(timer); }
      el.textContent = cur + (suffix || '');
    }, 40);
  }

  function showResult() {
    var correct = sum(state.levelCorrect);
    var score = correct * POINTS_PER_CORRECT;
    var percent = Math.round(correct * 100 / TOTAL_QUESTIONS);
    var g = gradeOf(percent);

    $('resName').textContent = state.name;
    $('resMsg').textContent = g.msg;
    countUp($('resScore'), score, '');
    $('resCorrect').textContent = correct;
    $('resPercent').textContent = percent + '%';
    $('resCoins').textContent = score;
    $('resGrade').textContent = g.level + ' (' + g.label + ')';
    $('resStars').textContent = repeatHtml('⭐', g.stars);

    var ul = $('resLevels');
    ul.innerHTML = '';
    LEVELS.forEach(function (lv, i) {
      var li = document.createElement('li');
      li.textContent = lv.icon + ' ' + lv.name + ' : ถูก ' + state.levelCorrect[i] + ' จาก ' + lv.count + ' ข้อ';
      ul.appendChild(li);
    });

    showScreen('result');
    sfx.win();
    confetti();
    setTimeout(confetti, 1500);
    speak('ยินดีด้วย ' + state.name + ' ได้ ' + score + ' คะแนน จากเต็ม 200 คะแนน ' + g.msg);
  }

  /* =====================================================
     เริ่มเกมใหม่ / รีเซ็ต
     ===================================================== */
  function resetProgress() {
    state.cur = 0;
    state.qIndex = 0;
    state.attempt = 0;
    state.levelCorrect = [0, 0, 0];
    state.levelDone = [false, false, false];
    state.unlocked = 1;
    state.justUnlocked = -1;
    state.answered = false;
    state.questions = [];
  }

  function goHome() {
    hideModal();
    if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) { /* ไม่ต้องทำอะไร */ } }
    showScreen('home');
  }

  /* =====================================================
     ผูกเหตุการณ์ปุ่มต่าง ๆ
     ===================================================== */
  function init() {
    // ตรวจสอบจำนวนข้อรวมให้เป็น 20 ข้อ
    var totalCheck = LEVELS.reduce(function (s, l) { return s + l.count; }, 0);
    if (totalCheck !== TOTAL_QUESTIONS) {
      console.error('จำนวนข้อรวมต้องเท่ากับ ' + TOTAL_QUESTIONS);
    }

    setDeco('home');

    // จำชื่อล่าสุดในเครื่อง (ถ้าใช้ได้)
    try {
      var saved = window.localStorage.getItem('cai_name');
      if (saved) $('nameInput').value = saved;
    } catch (e) { /* ไม่ต้องทำอะไร */ }

    // เสียงคลิกทุกปุ่ม
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('button')) sfx.click();
    });

    // เปิด/ปิดเสียง
    $('soundBtn').addEventListener('click', function () {
      state.sound = !state.sound;
      $('soundBtn').textContent = state.sound ? '🔊' : '🔇';
      if (!state.sound && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) { /* ไม่ต้องทำอะไร */ }
      }
    });

    // เริ่มเกม
    function startGame() {
      var name = $('nameInput').value.replace(/\s+/g, ' ').trim();
      if (!name) {
        $('nameError').hidden = false;
        var inp = $('nameInput');
        inp.classList.remove('shake');
        void inp.offsetWidth;
        inp.classList.add('shake');
        inp.focus();
        speak('พิมพ์ชื่อก่อนนะ');
        return;
      }
      $('nameError').hidden = true;
      state.name = name;
      try { window.localStorage.setItem('cai_name', name); } catch (e) { /* ไม่ต้องทำอะไร */ }
      resetProgress();
      showScreen('learn');
      speak('สวัสดี ' + name + ' มาเรียนรู้เครื่องหมายกันก่อนนะ');
    }
    $('startBtn').addEventListener('click', startGame);
    $('nameInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') startGame();
    });
    $('nameInput').addEventListener('input', function () { $('nameError').hidden = true; });

    // ปุ่มฟังเสียงในหน้าเรียนรู้
    var minis = document.querySelectorAll('.mini-btn[data-say]');
    for (var i = 0; i < minis.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () { speak(btn.getAttribute('data-say')); });
      })(minis[i]);
    }

    $('toMapBtn').addEventListener('click', function () { goMap(); speak('เลือกด่านที่ต้องการเล่นได้เลย'); });
    $('reviewBtn').addEventListener('click', function () { showScreen('learn'); });

    // แตะเลือกด่านในแผนที่
    var nodes = document.querySelectorAll('.level-node');
    for (var n = 0; n < nodes.length; n++) {
      (function (node) {
        node.addEventListener('click', function () {
          var idx = parseInt(node.getAttribute('data-level'), 10);
          if (idx + 1 > state.unlocked) {
            $('mapHint').textContent = '🔒 ต้องผ่านด่านก่อนหน้าก่อนนะ จึงจะเข้าด่านนี้ได้';
            node.classList.remove('shake');
            void node.offsetWidth;
            node.classList.add('shake');
            sfx.wrong();
            speak('ต้องผ่านด่านก่อนหน้าก่อนนะ');
            return;
          }
          startLevel(idx);
        });
      })(nodes[n]);
    }

    // ปุ่มตอบคำถาม
    var ans = document.querySelectorAll('.ans-btn');
    for (var a = 0; a < ans.length; a++) {
      (function (btn) {
        btn.addEventListener('click', function () { onAnswer(btn.getAttribute('data-sym')); });
      })(ans[a]);
    }

    // คีย์ลัดบนคอมพิวเตอร์
    document.addEventListener('keydown', function (e) {
      if (!$('screen-game').classList.contains('active') || modalOpen()) return;
      if (state.answered) {
        if (e.key === 'Enter') nextQuestion();
        return;
      }
      if (e.key === '>' || e.key === '.') onAnswer('>');
      else if (e.key === '<' || e.key === ',') onAnswer('<');
      else if (e.key === '=') onAnswer('=');
    });

    $('nextBtn').addEventListener('click', nextQuestion);
    $('listenBtn').addEventListener('click', function () {
      var q = state.questions[state.qIndex];
      if (q) speak(questionSpeech(q));
    });

    // ออกจากเกม
    $('quitBtn').addEventListener('click', function () {
      showModal({
        icon: '🏠',
        title: 'อยากกลับหน้าแรกไหม?',
        text: 'ถ้ากลับหน้าแรก ความคืบหน้าจะหายไปนะ',
        buttons: [
          { label: 'เล่นต่อ ▶', cls: 'btn-green btn-big' },
          { label: 'กลับหน้าแรก', cls: 'btn-red', action: goHome }
        ]
      });
    });

    // หน้าสรุปผล
    $('replayBtn').addEventListener('click', function () {
      resetProgress();
      goMap();
      speak('เริ่มผจญภัยอีกครั้งนะ');
    });
    $('homeBtn2').addEventListener('click', goHome);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();