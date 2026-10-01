/* ================================================================
   短剧之家 · 官网脚本
   ================================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 发布通道 ----------
     下载按钮统一跳到 GitHub Release 页：
       · releases/latest —— 自动跳转到最新版本，发新版后这里不用改
       · releases        —— 全部版本列表，方便翻历史 / 找 TV 包
     因此官网上永远指向最新版，维护成本为零。 */
  var RELEASE = {
    repo: 'https://github.com/jackson977800/duanjuapp-release',
    latest: 'https://github.com/jackson977800/duanjuapp-release/releases/latest',
    all: 'https://github.com/jackson977800/duanjuapp-release/releases',
    // 仅用于展示的参考信息，不影响下载去向
    version: 'v1.0.18+19',
    updated: '2026-10-01',
    androidSize: '30.1 MB',
    windowsSize: '90.7 MB'
  };

  /* ---------- 导航 ---------- */
  function initNav() {
    var nav = $('#nav');
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var toggle = $('#navToggle');
    if (!toggle) return;
    var drawer = document.createElement('div');
    drawer.className = 'nav__drawer';
    drawer.style.display = 'none';
    drawer.innerHTML = '<a href="#exclusive">独家功能</a>' +
      '<a href="#devices">三端下载</a><a href="#faq">常见问题</a>';
    nav.parentNode.insertBefore(drawer, nav.nextSibling);

    function close() {
      toggle.setAttribute('aria-expanded', 'false');
      drawer.classList.remove('open');
      setTimeout(function () { drawer.style.display = 'none'; }, 340);
    }
    function open() {
      drawer.style.display = 'flex';
      requestAnimationFrame(function () { drawer.classList.add('open'); });
      toggle.setAttribute('aria-expanded', 'true');
    }
    toggle.addEventListener('click', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') close(); else open();
    });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', close); });
  }

  /* ---------- 滚动显现 ---------- */
  function initReveal() {
    var els = $$('.reveal');
    var root = document.documentElement;

    function showAll() {
      els.forEach(function (el) { el.classList.add('in'); });
    }

    // 截图 / 打印 / 无动画偏好 / 无观察器：全部静态显示，不启用隐藏
    var forceStatic = /[?&]static\b/.test(location.search) ||
      !('IntersectionObserver' in window) ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (forceStatic) { showAll(); return; }

    // 启用隐藏态（类加上去之后，未进视口的元素才隐藏）
    root.classList.add('js-reveal');

    /* 编排型区块：整块作为一个观察目标，进入视口后让卡内元素依次弹出。
       为什么不逐卡观察：7 张卡各自 255px 高，逐卡触发时滚过一屏会有
       四五张同时进入，错峰被淹没 —— 看起来就是「唰」地一下全出来。
       改成整块触发 + 按行分组延迟，才有一层层铺开的节奏。 */
    var CHOREO = '.excl-grid';
    var choreographed = [];

    $$(CHOREO).forEach(function (grid) {
      var items = $$('.reveal', grid);
      if (!items.length) return;

      // 按渲染位置分行：同一行的卡共享延迟，行与行之间递增
      var rows = [];
      items.forEach(function (el) {
        var top = Math.round(el.getBoundingClientRect().top);
        var row = rows.filter(function (r) { return Math.abs(r.top - top) < 8; })[0];
        if (!row) { row = { top: top, items: [] }; rows.push(row); }
        row.items.push(el);
      });
      rows.sort(function (a, b) { return a.top - b.top; });

      items.forEach(function (el) {
        el.classList.remove('reveal');
        el.classList.add('reveal-card');
        choreographed.push(el);
      });

      rows.forEach(function (row, i) {
        row.items.forEach(function (el) {
          // 行间 0.16s、行内错 0.07s：
          // 单卡动效加大后（位移 72px + 缩放 + 模糊），错峰也要相应拉开，
          // 否则前一张还没落位后一张就起来了，看不出「一张张」。
          var slot = row.items.indexOf(el);
          el.style.transitionDelay = (i * 0.16 + slot * 0.07).toFixed(3) + 's';
        });
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    els.forEach(function (el) {
      if (choreographed.indexOf(el) === -1) io.observe(el);
    });

    // 编排区块：给整块挂观察器，一进视口就放整组动画
    var ioBlock = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        ioBlock.unobserve(e.target);
        // 先让卡片回到初始隐藏态，再加 in，确保过渡一定被触发
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            choreographed.forEach(function (el) { el.classList.add('in'); });
          });
        });
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    $$(CHOREO).forEach(function (g) { ioBlock.observe(g); });

    /* 兜底：位置已在视口内的直接显示。
       ⚠️ 这里只作用于「非编排」元素 —— 编排区块交给它自己的观察器，
       否则 pass() 会在滚动到位之前就把整组点亮，把节奏抹平。 */
    var pass = function () {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        if (el.classList.contains('in')) return;
        if (choreographed.indexOf(el) !== -1) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh * 1.08 && r.bottom > -120) el.classList.add('in');
      });
    };
    pass();
    setTimeout(pass, 700);
    window.addEventListener('load', pass);

    // 锚点跳转后等滚动稳定再判定一次
    function onHash() { setTimeout(pass, 120); setTimeout(pass, 900); }
    window.addEventListener('hashchange', onHash);
    if (location.hash) onHash();

    // 兜底 3：确保「用户真的滚到了却还看不见」时才强制显示。
    // ⚠️ 绝不能用「页面加载后 N 秒」当判据 —— 那样用户还没滚到，
    // 编排好的整组就已经被 showAll 点亮，滚动到位时什么都不剩。
    // 这里改成：只有元素确实进入视口（说明观察器失效了）才兜底。
    var guard = function () {
      var vh = window.innerHeight;
      var stuck = els.filter(function (el) {
        if (el.classList.contains('in')) return false;
        var r = el.getBoundingClientRect();
        return r.top < vh * 0.92 && r.bottom > 0;
      });
      if (stuck.length) stuck.forEach(function (el) { el.classList.add('in'); });
    };
    setInterval(guard, 1200);
    window.addEventListener('scroll', function () {
      // 滚动过程中若发现已在视口内却没显示，立即补上（防观察器被禁用）
      guard();
    }, { passive: true });
  }

  /* ---------- 数字动画 ---------- */
  function initCounters() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; io.unobserve(el);
        var target = parseInt(el.dataset.count, 10) || 0;
        var suffix = el.dataset.suffix || '';
        if (target === 0) { el.textContent = '0' + suffix; return; }
        var t0 = null, dur = 1500;
        (function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, { threshold: 0.4 });
    $$('.stat__num').forEach(function (el) { io.observe(el); });
  }

  /* ---------- 工具 ---------- */
  function pick(arr, n, seedOffset) {
    var out = [], pool = arr.slice();
    var seed = (seedOffset || 0) + 1;
    for (var i = 0; i < n && pool.length; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      out.push(pool.splice(Math.floor((seed / 233280) * pool.length), 1)[0]);
    }
    return out;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  /* 去掉剧名尾部的季号标记，用来展示"基础剧名" */
  var SEASON_TAIL = /第\s*([0-9一二三四五六七八九十百零两]+)\s*季\s*$/;
  var CN_DIGIT = { '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9 };
  function cnToNum(s) {
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (s === '十') return 10;
    // 十X / X十 / X十Y
    var i = s.indexOf('十');
    if (i >= 0) return (i === 0 ? 1 : (CN_DIGIT[s[0]] || 0)) * 10 +
      (i + 1 < s.length ? (CN_DIGIT[s[i + 1]] || 0) : 0);
    return CN_DIGIT[s] || 0;
  }
  function seasonNumber(title) {
    var m = SEASON_TAIL.exec(String(title || '').trim());
    var n = m ? cnToNum(m[1]) : 0;
    return n > 0 ? n : null;
  }
  function stripSeason(title) {
    var t = String(title || '').trim();
    var out = t.replace(SEASON_TAIL, '').trim();
    return out || t;
  }

  function artHTML(d) {    if (d.cover) {
      return '<img src="' + d.cover + '" alt="' + esc(d.title) + '" loading="lazy" decoding="async">';
    }
    var ch = (d.title || '剧').charAt(0);
    return '<div style="width:100%;height:100%;display:flex;align-items:center;' +
      'justify-content:center;background:linear-gradient(150deg,#25252e,#141419);">' +
      '<span style="font-size:26px;font-weight:600;color:rgba(255,255,255,.16)">' +
      esc(ch) + '</span></div>';
  }

  var PLAY_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
    '<path d="M8 5.5v13c0 .8.9 1.3 1.6.8l9.4-6.5c.6-.4.6-1.3 0-1.7L9.6 4.7C8.9 4.2 8 4.7 8 5.5Z" fill="currentColor"/></svg>';

  /* ---------- 数据 ----------
     剧库网格已按需求整区移除，但 DATA.items 仍在用：
     首屏 3D 海报墙、以及 7 个功能区里的 mock 演示都从它取数据，
     所以 data/dramas.json 与本地封面资源必须保留。 */
  var DATA = { items: [] };

  /* ---------- HERO 3D 海报墙 ---------- */  /* ---------- HERO 3D 海报墙 ---------- */
  function buildStage() {
    var stage = $('#stage3d');
    var posters = DATA.items.filter(function (d) { return d.cover; });
    if (!posters.length) return;
    var pool = pick(posters, 15, 7);
    var cols = [[], [], []];
    pool.forEach(function (d, i) { cols[i % 3].push(d); });

    var classes = ['col--up', '', 'col--down'];
    cols.forEach(function (col, ci) {
      var c = document.createElement('div');
      c.className = 'col ' + classes[ci];
      col.forEach(function (d, ri) {
        var s = document.createElement('div');
        s.className = 'sc';
        s.style.animationDelay = (ci * 90 + ri * 130) + 'ms';
        s.innerHTML = '<img src="' + d.cover + '" alt="" decoding="async">';
        c.appendChild(s);
      });
      stage.appendChild(c);
    });

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var p = Math.min(window.scrollY / window.innerHeight, 1.15);
        stage.style.transform = 'rotateX(' + (34 + p * 7) + 'deg) translateY(' +
          (-p * 46) + 'px) scale(' + (1.06 + p * 0.07) + ')';
        stage.style.opacity = String(Math.max(1 - p * 1.25, 0));
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- 功能 1：无感加载下集 ---------- */
  function buildNext() {
    var withCover = DATA.items.filter(function (d) { return d.cover; });
    if (withCover.length < 3) return;
    var now = withCover[0], up = withCover[1];

    var nc = $('#nextCover');
    if (nc) { nc.src = up.cover; nc.alt = ''; }
    var nn = $('#nextNow'), nu = $('#nextUp');
    if (nn) { nn.src = now.cover; nn.alt = ''; }
    if (nu) { nu.src = up.cover; nu.alt = ''; }
    var nnt = $('#nextNowTitle'); if (nnt) nnt.textContent = now.title;
    var nut = $('#nextUpTitle'); if (nut) nut.textContent = up.title;

    var bar = $('#nextCover') && $('#nextCover').parentNode.querySelector('.nextmock__progress i');
    var pct = $('#nextPct');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (bar) {
          bar.style.transition = 'width 2.6s cubic-bezier(.4,0,.2,1)';
          setTimeout(function () { bar.style.width = '72%'; }, 260);
        }
        if (pct) {
          var n = 0;
          var t = setInterval(function () {
            n += 4; if (n > 100) n = 100;
            pct.textContent = n + '%';
            if (n >= 100) clearInterval(t);
          }, 96);
        }
      });
    }, { threshold: 0.3 });
    if (bar) io.observe(bar.closest('.nextmock'));
  }

  /* ---------- 功能 2：弹幕 ---------- */
  var DM_TEXTS = [
    '哈哈哈哈这段笑死我了', '男主终于开窍了', '这剧情反转可以啊', '前面的等等我',
    '第 3 遍来打卡', '演技在线', '这段配乐绝了', '啊啊啊甜到了',
    '妈呀吓我一跳', '女主太美了', '蹲一个后续', '这编剧脑洞真大',
    '熬夜追到这里', '谁跟我一样在补番', '终于等到更新', '这段台词我记住了'
  ];

  function buildDanmaku() {
    var withCover = DATA.items.filter(function (d) { return d.cover; });
    if (!withCover.length) return;
    var dmCover = $('#dmCover');
    if (dmCover) { dmCover.src = withCover[2] ? withCover[2].cover : withCover[0].cover; dmCover.alt = ''; }

    var tracks = [$('#dmTrackA'), $('#dmTrackB'), $('#dmTrackC')];
    var speed = [11, 14, 17];
    var pool = pick(DM_TEXTS, DM_TEXTS.length, 5);
    var pi = 0;

    tracks.forEach(function (track, ti) {
      if (!track) return;
      for (var k = 0; k < 3; k++) {
        var s = document.createElement('span');
        s.textContent = pool[pi++ % pool.length];
        s.style.top = '0';
        s.style.animationDuration = (speed[ti] + k * 2.5) + 's';
        s.style.animationDelay = (-(k * 4.2)) + 's';
        if (k % 3 === 1) s.style.color = '#ffd166';
        if (k % 3 === 2) s.style.color = '#7fd1ff';
        track.appendChild(s);
      }
    });

    // 屏蔽词演示：点击按钮，带"笑死/妈呀"的弹幕淡出
    $$('.dmmock__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.dataset.dm === 'toggle') {
          var on = btn.classList.toggle('dmmock__btn--on');
          btn.textContent = on ? '弹幕 · 开' : '弹幕 · 关';
          tracks.forEach(function (t) {
            if (t) t.style.opacity = on ? '1' : '0';
          });
        } else {
          var blocked = false;
          tracks.forEach(function (t) {
            if (!t) return;
            $$('span', t).forEach(function (s) {
              if (/笑死|妈呀|啊啊/.test(s.textContent)) {
                s.style.transition = 'opacity .5s';
                s.style.opacity = '0';
                blocked = true;
              }
            });
          });
          btn.textContent = blocked ? '已屏蔽这类弹幕' : '屏蔽词 3';
          btn.classList.add('dmmock__btn--on');
          setTimeout(function () { btn.textContent = '屏蔽词 3'; }, 2400);
        }
      });
    });
  }

  /* ---------- 功能 3：批量下载（带弹幕） ---------- */
  function buildBatch() {
    var withCover = DATA.items.filter(function (d) { return d.cover; });
    if (!withCover.length) return;
    var show = withCover[3] || withCover[0];

    var sn = $('#dlShowName'); if (sn) sn.textContent = show.title.slice(0, 10);
    var rows = $('#dlRows');
    if (!rows) return;

    var eps = ['第 1 集', '第 2 集', '第 3 集', '第 4 集', '第 5 集'];
    var states = [
      { w: 100, tag: '已完成', cls: 'dlmrow__tag--done' },
      { w: 100, tag: '含弹幕', cls: 'dlmrow__tag--dm' },
      { w: 78, tag: '含弹幕', cls: 'dlmrow__tag--dm' },
      { w: 41, tag: '下载中', cls: '' },
      { w: 0, tag: '等待中', cls: '' }
    ];

    eps.forEach(function (name, i) {
      var r = document.createElement('div');
      r.className = 'dlrow';
      r.innerHTML =
        '<span class="dlrow__idx">' + name + '</span>' +
        '<div class="dlrow__body">' +
          '<div class="dlrow__t">' + esc(show.title.slice(0, 14)) + '</div>' +
          '<div class="dlrow__bar"><i data-w="' + states[i].w + '"></i></div>' +
        '</div>' +
        '<span class="dlrow__tag ' + states[i].cls + '">' + states[i].tag + '</span>';
      rows.appendChild(r);
    });

    var cnt = $('#dlCount');
    if (cnt) cnt.textContent = '共 ' + (show.episodes ? show.episodes.replace('全', '').replace('集', '') : 78) + ' 集 · 含弹幕';

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        $$('.dlrow__bar i', rows).forEach(function (bar, i) {
          setTimeout(function () { bar.style.width = bar.dataset.w + '%'; }, i * 130);
        });
        var mainBar = $('#dlBar');
        if (mainBar) setTimeout(function () { mainBar.style.width = '64%'; }, 300);
        var pct = $('#dlPct');
        if (pct) {
          var n = 0;
          var t = setInterval(function () {
            n += 3; if (n > 64) n = 64;
            pct.textContent = n + '%';
            if (n >= 64) clearInterval(t);
          }, 90);
        }
      });
    }, { threshold: 0.3 });
    io.observe(rows);
  }

  /* ---------- 功能 4：热播榜单 ---------- */
  var RANK_PREVIEW = 6;

  function renderRankBoard(board) {
    var list = $('#rankList');
    if (!list) return;

    var bn = $('#rankBoardName'); if (bn) bn.textContent = board.name;
    var bd = $('#rankBoardDesc'); if (bd) bd.textContent = board.desc;

    list.innerHTML = '';
    (board.items || []).slice(0, RANK_PREVIEW).forEach(function (it, i) {
      var row = document.createElement('div');
      row.className = 'rankrow' + (it.rank <= 3 ? ' rankrow--top' : '');
      row.style.animationDelay = (i * 55) + 'ms';
      row.innerHTML =
        '<span class="rankrow__no">' + esc(it.rank) + '</span>' +
        '<span class="rankrow__art">' +
          (it.cover
            ? '<img src="' + it.cover + '" alt="" loading="lazy" decoding="async">'
            : esc((it.title || '剧').charAt(0))) +
        '</span>' +
        '<span class="rankrow__body">' +
          '<span class="rankrow__t">' + esc(it.title) + '</span>' +
          '<span class="rankrow__m">' +
            (it.heat ? '<span class="rankrow__heat">' + esc(it.heat) + '</span>' : '') +
            (it.fav ? '<span>' + esc(it.fav) + '</span>' : '') +
          '</span>' +
        '</span>' +
        (it.badge ? '<span class="rankrow__badge">' + esc(it.badge) + '</span>' : '');
      list.appendChild(row);
    });
  }

  function buildRankings(boards) {
    var tabs = $('#rankTabs');
    if (!tabs || !boards || !boards.length) return;

    tabs.innerHTML = '';
    boards.forEach(function (b, i) {
      var btn = document.createElement('button');
      btn.className = 'ranktab' + (i === 0 ? ' on' : '');
      btn.type = 'button';
      btn.textContent = b.name;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      btn.addEventListener('click', function () {
        $$('.ranktab', tabs).forEach(function (x) {
          x.classList.remove('on');
          x.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('on');
        btn.setAttribute('aria-selected', 'true');
        renderRankBoard(b);
      });
      tabs.appendChild(btn);
    });

    renderRankBoard(boards[0]);

    // 滚进视口时自动轮播一次，让三个榜单都被看见
    var mock = $('.rankmock');
    if (!mock) return;
    var idx = 0, timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          if (timer) return;
          timer = setInterval(function () {
            idx = (idx + 1) % boards.length;
            var t = $$('.ranktab', tabs)[idx];
            if (t) t.click();
          }, 4200);
        } else {
          stop();
        }
      });
    }, { threshold: 0.4 });
    io.observe(mock);
    tabs.addEventListener('mouseenter', stop, { once: true });
  }

  /* ---------- 功能 5：查全季 · 自动连播 ---------- */
  var SEASON_TAIL_ANY = /第\s*[0-9一二三四五六七八九十百零两]+\s*季\s*$/;
  var CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  function buildSeason() {
    var box = $('#seasList');
    if (!box) return;

    // 优先挑一部**剧名里真的带季号**的剧，这样"当前是第 N 季"才讲得通
    var pool = DATA.items.filter(function (d) {
      return d.cover && SEASON_TAIL_ANY.test(String(d.title).trim());
    });
    var cur = pool[5] || pool[0] || DATA.items.filter(function (d) { return d.cover; })[0];
    if (!cur) return;

    var base = stripSeason(cur.title);
    var curNo = seasonNumber(cur.title) || 1;
    var eps = parseInt(String(cur.episodes || '').replace(/\D/g, ''), 10) || 80;

    // 当前季 ±1，拼出「全 3 季」的上下文
    var seasons = [];
    for (var n = Math.max(1, curNo - 1); n <= curNo + 1; n++) {
      seasons.push({
        n: n,
        title: base + '第' + (CN_NUM[n] || n) + '季',
        eps: n === curNo ? eps : eps - (n - curNo) * 14 + 18,
        now: n === curNo
      });
    }
    var idx = seasons.findIndex(function (s) { return s.now; });

    var nh = $('.seasmock__name');
    if (nh) {
      nh.innerHTML = '<b>' + esc(base) + '</b><span>· 共 ' + seasons.length + ' 季</span>';
    }

    var hint = $('.seasmock__hint');
    if (hint) hint.textContent = '当前是第 ' + curNo + ' 季，' +
      (idx + 1 < seasons.length ? '下一季是第 ' + (curNo + 1) + ' 季。' : '也是最后一季。');

    box.innerHTML = '';
    seasons.forEach(function (s, i) {
      var row = document.createElement('div');
      row.className = 'seasrow' + (s.now ? ' seasrow--now' : '');
      row.style.animationDelay = (i * 80) + 'ms';
      row.innerHTML =
        '<span class="seasrow__no">' + s.n + '</span>' +
        '<span class="seasrow__body">' +
          '<span class="seasrow__t">' + esc(s.title) + '</span>' +
          '<span class="seasrow__m">共 ' + s.eps + ' 集</span>' +
        '</span>' +
        (s.now
          ? '<span class="seasrow__now">' +
              '<svg viewBox="0 0 12 12" width="11" height="11"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3.9 6.1 5.4 7.6 8.2 4.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '正在看</span>'
          : '<span class="seasrow__go">' +
              '<svg viewBox="0 0 12 12" width="12" height="12"><path d="M4.3 2.2 8.5 6l-4.2 3.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</span>');
      box.appendChild(row);
    });

    var tt = $('#seasToastText');
    if (tt && idx + 1 < seasons.length) {
      tt.textContent = '已找到下一季：' + seasons[idx + 1].title;
    }

    var toast = $('#seasToast');
    if (!toast) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        setTimeout(function () { toast.classList.add('show'); }, 1100);
      });
    }, { threshold: 0.4 });
    io.observe(box);
  }

  /* ---------- 功能 7：画质增强（电脑版） ---------- */
  function buildQuality() {
    var frame = $('.hqmock__frame');
    if (!frame) return;

    var withCover = DATA.items.filter(function (d) { return d.cover; });
    var pic = withCover[5] || withCover[0];
    var img = $('#hqCover');
    if (img && pic) { img.src = pic.cover; img.alt = ''; }

    var right = true;                       // 当前分隔线停在 58% 还是 42%
    function setSplit(left) {
      frame.style.setProperty('--split', (left ? 58 : 42) + '%');
    }
    setSplit(true);

    // 滚进视口后自动来回推一次，把"增强前 / 增强后"的差异演示出来
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var n = 0;
        var t = setInterval(function () {
          right = !right; setSplit(right); n++;
          if (n >= 3) clearInterval(t);
        }, 1500);
      });
    }, { threshold: 0.45 });
    io.observe(frame);

    // 点击「原画对比」手动来回切
    var btn = $('#hqCmp');
    if (btn) btn.addEventListener('click', function () {
      right = !right; setSplit(right);
      btn.textContent = right ? '原画对比' : '恢复增强';
    });
  }

  /* ---------- 功能 6：WebDAV 同步 ---------- */  function buildSync() {
    var withCover = DATA.items.filter(function (d) { return d.cover; });
    var title = withCover.length ? withCover[0].title.slice(0, 8) : '某部短剧';
    var posText = '《' + title + '》第 17 集 12:31';

    var pp = $('#syncPhonePos'), pc = $('#syncPcPos');
    if (pp) pp.textContent = posText;
    if (pc) pc.textContent = '尚未同步';

    var mock = $('.syncmock');
    if (!mock) return;

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        setTimeout(function () {
          if (pc) { pc.textContent = posText; pc.classList.add('synced'); }
          var tag = $('#syncTagText');
          if (tag) tag.textContent = '已通过 WebDAV 同步 · 2 台设备';
        }, 1500);
      });
    }, { threshold: 0.35 });
    io.observe(mock);
  }

  /* ---------- 下载入口 ----------
     所有下载入口统一指向 GitHub Release 页：
       releases/latest 会自动跳转到最新版本，所以官网不需要随版本改动。 */
  function fillRelease() {
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

    function link(el, url, openNew) {
      if (!el) return;
      el.href = url;
      el.target = openNew ? '_blank' : '_self';
      el.rel = 'noopener';
    }

    // 手机 / 电脑 / TV：统一直达最新版发布页
    link($('#devPhoneBtn'), RELEASE.latest, true);
    link($('#devPcBtn'), RELEASE.latest, true);
    link($('#devTvBtn'), RELEASE.latest, true);

    var am = $('#devPhoneMeta');
    if (am) am.textContent = 'APK · 约 ' + RELEASE.androidSize;
    var wm = $('#devPcMeta');
    if (wm) wm.textContent = 'ZIP · 约 ' + RELEASE.windowsSize;
    // TV 包按需发布，不给具体体积，避免承诺一个不存在的文件
    var tm = $('#devTvMeta');
    if (tm) tm.textContent = 'APK · 按需发布';
  }

  /* ---------- 启动 ---------- */
  function boot(data) {
    DATA.items = (data && data.items) || [];
    buildStage();
    buildNext();
    buildDanmaku();
    buildBatch();
    buildSeason();
    buildQuality();
    buildSync();
    fillRelease();
    initReveal();
    initCounters();
  }

  initNav();

  fetch('data/dramas.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(boot)
    .catch(function (err) {
      console.warn('[短剧之家] 剧库数据加载失败：', err);
      boot({ items: [] });
    });

  // 榜单独立加载：即使剧库挂了，榜单也照常展示
  fetch('data/rankings.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { buildRankings(d && d.boards); })
    .catch(function (err) { console.warn('[短剧之家] 榜单数据加载失败：', err); });
})();
