/* سيّار — تفاعلات النماذج الأولية (بدون مكتبات) */
(function () {
  'use strict';
  var root = document.documentElement;
  var RATE = 13000; // سعر الصرف التجريبي: ليرة لكل دولار

  /* ---------- أدوات ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  }

  // تنسيق الليرة: 84,500,000 ← "84.5 مليون ل.س"
  function formatSyp(v) {
    if (!v) return '—';
    if (v >= 1e9) return (v / 1e9).toFixed(2).replace(/\.?0+$/, '') + ' مليار ل.س';
    if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + ' مليون ل.س';
    return v.toLocaleString('en-US') + ' ل.س';
  }
  function num(s) { return parseFloat(String(s).replace(/[^\d.]/g, '')) || 0; }

  // إزالة عنصر بحركة خفيفة، وإظهار حالة فارغة إن فرغت القائمة
  function removeRow(row) {
    if (!row) return;
    var list = row.parentElement;
    row.classList.add('leaving');
    setTimeout(function () {
      row.remove();
      if (list && list.id && !list.querySelector('[data-row]')) {
        var empty = document.querySelector('[data-empty="' + list.id + '"]');
        if (empty) empty.hidden = false;
      }
    }, 200);
  }

  /* ---------- تعبئة القوائم من data.js (المحافظات، الماركات، السنوات) ---------- */
  var D = window.SY_DATA;
  function fillSelect(sel) {
    if (!D) return;
    var kind = sel.getAttribute('data-fill');
    var selected = sel.getAttribute('data-selected');
    // نُبقي الخيار الأول الفارغ (العنوان) ونعيد بناء الباقي
    $$('optgroup, option:not([value=""])', sel).forEach(function (o) { o.remove(); });
    function opt(parent, label) {
      var o = document.createElement('option');
      o.textContent = label;
      if (label === selected) o.selected = true;
      parent.appendChild(o);
    }
    if (kind === 'govs') {
      D.govs.forEach(function (g) { opt(sel, g); });
    } else if (kind === 'years') {
      for (var y = new Date().getFullYear(); y >= D.yearMin; y--) opt(sel, String(y));
    } else if (kind === 'brands') {
      // تتبدّل القائمة إلى ماركات الموتسكلات عند اختيار فئة الموتسكلات
      var by = sel.getAttribute('data-by');
      var picked = by && document.querySelector('input[name="' + by + '"]:checked');
      var groups = picked && picked.value === 'moto' ? D.motoBrands : D.carBrands;
      groups.forEach(function (g) {
        var og = document.createElement('optgroup');
        og.label = g[0];
        g[1].forEach(function (b) { opt(og, b); });
        sel.appendChild(og);
      });
      opt(sel, 'أخرى');
    }
  }
  $$('select[data-fill]').forEach(function (sel) {
    fillSelect(sel);
    var by = sel.getAttribute('data-by');
    if (by) $$('input[name="' + by + '"]').forEach(function (r) {
      r.addEventListener('change', function () { sel.removeAttribute('data-selected'); fillSelect(sel); });
    });
  });
  // رقائق المحافظات (دليل المعارض)
  $$('[data-fill-chips="govs"]').forEach(function (box) {
    if (!D) return;
    var name = box.getAttribute('data-name');
    D.govs.forEach(function (g) {
      var label = document.createElement('label');
      label.className = 'chip';
      var input = document.createElement('input');
      input.type = 'radio'; input.name = name; input.value = g;
      var span = document.createElement('span');
      span.textContent = g;
      label.append(input, span);
      box.appendChild(label);
    });
  });

  /* ---------- عملة العرض (تُحفظ محلياً) ---------- */
  function setCur(c) {
    root.setAttribute('data-cur', c);
    $$('button[data-cur]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cur') === c)); });
    try { localStorage.setItem('sy-cur', c); } catch (e) {}
  }
  setCur(root.getAttribute('data-cur') || 'usd');

  /* ---------- التبويبات (مع دعم الرابط # والأسهم) ---------- */
  function initTabs(group) {
    var tabs = $$('[role="tab"]', group);
    var useHash = group.hasAttribute('data-hash');
    function select(tab, opts) {
      opts = opts || {};
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (opts.focus) tab.focus();
      if (useHash && !opts.init) history.replaceState(null, '', '#' + tab.getAttribute('aria-controls'));
    }
    group._selectById = function (id) {
      var t = tabs.find(function (x) { return x.getAttribute('aria-controls') === id; });
      if (t) { select(t); return true; }
      return false;
    };
    group.addEventListener('click', function (e) {
      var t = e.target.closest('[role="tab"]');
      if (t && group.contains(t)) select(t);
    });
    group.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var n = null;
      // الاتجاه من اليمين لليسار: السهم الأيسر = التالي
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') n = i + 1;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') n = i - 1;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n === null) return;
      e.preventDefault();
      select(tabs[(n + tabs.length) % tabs.length], { focus: true });
    });
    var fromHash = useHash && location.hash && tabs.find(function (t) { return '#' + t.getAttribute('aria-controls') === location.hash; });
    select(fromHash || tabs.find(function (t) { return t.getAttribute('aria-selected') === 'true'; }) || tabs[0], { init: true });
  }
  $$('[data-tabs]').forEach(initTabs);
  window.addEventListener('hashchange', function () {
    $$('[data-tabs][data-hash]').forEach(function (g) { g._selectById(location.hash.slice(1)); });
  });

  /* ---------- لوحة الفلاتر على الموبايل ---------- */
  var filters = $('#filters');
  var lastFocus;
  function openFilters() {
    if (!filters) return;
    lastFocus = document.activeElement;
    filters.classList.add('open');
    document.body.style.overflow = 'hidden';
    var first = $('.f-close', filters);
    if (first) setTimeout(function () { first.focus(); }, 50);
  }
  function closeFilters() {
    if (!filters || !filters.classList.contains('open')) return;
    filters.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  /* ---------- المعرض ---------- */
  function galleryGo(i) {
    var thumbs = $$('.thumbs button');
    var main = $('.g-main .ph');
    if (!thumbs.length || !main) return;
    i = (i + thumbs.length) % thumbs.length;
    thumbs.forEach(function (t, k) { t.setAttribute('aria-current', String(k === i)); });
    main.className = 'ph ' + thumbs[i].getAttribute('data-tone');
    $('.g-count').textContent = (i + 1) + ' / ' + thumbs.length;
    thumbs[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function galleryIndex() {
    return $$('.thumbs button').findIndex(function (t) { return t.getAttribute('aria-current') === 'true'; });
  }

  /* ---------- النقرات ---------- */
  var pendingRow = null; // العنصر الذي فُتحت نافذة التأكيد من أجله

  document.addEventListener('click', function (e) {
    var t = e.target;
    var el;

    if ((el = t.closest('button[data-cur]'))) return setCur(el.getAttribute('data-cur'));

    if ((el = t.closest('.fav'))) {
      e.preventDefault();
      var on = el.getAttribute('aria-pressed') !== 'true';
      el.setAttribute('aria-pressed', String(on));
      el.setAttribute('aria-label', on ? 'إزالة من المفضلة' : 'أضف إلى المفضلة');
      return toast(on ? 'أُضيف الإعلان إلى المفضلة' : 'أُزيل الإعلان من المفضلة');
    }

    if (t.closest('[data-open-filters]')) return openFilters();
    if (t.closest('[data-close-filters]')) return closeFilters();

    if ((el = t.closest('[data-goto-tab]'))) {
      e.preventDefault();
      var id = el.getAttribute('data-goto-tab');
      $$('[data-tabs]').some(function (g) { return g._selectById && g._selectById(id); });
      var target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if ((el = t.closest('[data-dialog]'))) {
      var d = document.getElementById(el.getAttribute('data-dialog'));
      pendingRow = el.closest('[data-row]');
      if (d && d.showModal) {
        $$('.field.invalid', d).forEach(function (f) { f.classList.remove('invalid'); });
        d.showModal();
      }
      return;
    }
    if ((el = t.closest('[data-close-dialog]'))) {
      var dlg = el.closest('dialog');
      var need = el.getAttribute('data-require');
      var needVal = el.getAttribute('data-require-value'); // "#id=القيمة المطلوبة"
      var valOk = true;
      if (needVal) {
        var pv = needVal.split('=');
        var inp = document.querySelector(pv[0]);
        valOk = !!inp && inp.value.trim() === pv[1];
      }
      if ((need && !document.querySelector(need)) || !valOk) {
        var errField = dlg.querySelector('[data-require-field]');
        if (errField) { errField.classList.add('invalid'); var fi = errField.querySelector('input, textarea'); if (fi) fi.focus(); }
        return;
      }
      if (el.hasAttribute('data-remove-pending')) removeRow(pendingRow);
      if (el.hasAttribute('data-toast')) toast(el.getAttribute('data-toast'));
      pendingRow = null;
      return dlg && dlg.close();
    }

    if ((el = t.closest('[data-resolve]'))) {
      removeRow(el.closest('[data-row]'));
      if (el.hasAttribute('data-toast')) toast(el.getAttribute('data-toast'));
      return;
    }

    if ((el = t.closest('[data-set-status]'))) {
      var row = el.closest('[data-status]');
      var badge = row && row.querySelector('.st');
      if (row && badge) {
        row.setAttribute('data-status', 'sold');
        badge.className = 'st st-sold';
        badge.textContent = 'مباع';
        el.remove();
        toast('تم وضع الإعلان كمباع وإخفاؤه من البحث');
      }
      return;
    }

    if ((el = t.closest('.switch'))) {
      var sw = el.getAttribute('aria-checked') !== 'true';
      el.setAttribute('aria-checked', String(sw));
      var msg = el.getAttribute(sw ? 'data-on' : 'data-off');
      if (msg) toast(msg);
      return;
    }

    if ((el = t.closest('[data-toggle-pass]'))) {
      var input = el.parentElement.querySelector('input');
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      el.setAttribute('aria-pressed', String(show));
      el.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
      el.querySelector('use').setAttribute('href', 'icons.svg#' + (show ? 'eye-off' : 'eye'));
      return;
    }

    if ((el = t.closest('[data-copy]'))) {
      var text = el.getAttribute('data-copy');
      var copiedMsg = el.getAttribute('data-copied') || 'نُسخ الرقم';
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast(copiedMsg); }, function () { toast(text); });
      else toast(text);
      return;
    }

    if ((el = t.closest('[data-toast-click]'))) {
      e.preventDefault();
      return toast(el.getAttribute('data-toast-click'));
    }

    if (t.closest('[data-share]')) {
      if (navigator.share) { navigator.share({ title: document.title, url: location.href }).catch(function () {}); }
      else if (navigator.clipboard) { navigator.clipboard.writeText(location.href).then(function () { toast('نُسخ الرابط'); }); }
      return;
    }

    if ((el = t.closest('.thumbs button'))) return galleryGo($$('.thumbs button').indexOf(el));
    if (t.closest('.g-prev')) return galleryGo(galleryIndex() - 1);
    if (t.closest('.g-next')) return galleryGo(galleryIndex() + 1);

    if ((el = t.closest('.tag button'))) {
      var tag = el.closest('.tag');
      toast('أُزيل الفلتر: ' + tag.firstChild.textContent.trim());
      return tag.remove();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeFilters();
  });

  /* ---------- نماذج تعرض رسالة فقط ---------- */
  $$('form[data-toast-submit]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      toast(f.getAttribute('data-toast-submit'));
    });
  });

  /* ---------- نموذج «اتصل بنا»: يجهّز رسالة في تطبيق البريد (بدون خادم) ---------- */
  $$('form[data-mailto]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var hp = f.querySelector('.hp input');
      if (hp && hp.value) return; // حقل الروبوتات
      var msg = f.querySelector('#c-msg');
      var field = msg.closest('.field');
      if (!msg.value.trim()) { field.classList.add('invalid'); msg.setAttribute('aria-invalid', 'true'); msg.focus(); return; }
      var subject = 'سيّار — ' + f.querySelector('#c-topic').value;
      var body = msg.value.trim() +
        '\n\n—\nالاسم: ' + (f.querySelector('#c-name').value.trim() || '-') +
        '\nالموبايل: ' + (f.querySelector('#c-phone').value.trim() || '-');
      location.href = 'mailto:' + f.getAttribute('data-mailto') +
        '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      toast('يُفتح تطبيق البريد لإرسال رسالتك');
    });
  });

  /* ---------- حالات الصفحة للمراجعة (?state=...) ---------- */
  var state = new URLSearchParams(location.search).get('state') || document.body.getAttribute('data-default-state') || 'results';
  $$('[data-state]').forEach(function (el) { el.hidden = el.getAttribute('data-state') !== state; });

  /* ---------- فلترة القوائم حسب الحالة ---------- */
  $$('[data-filter]').forEach(function (group) {
    var list = document.querySelector(group.getAttribute('data-filter'));
    group.addEventListener('change', function (e) {
      var v = e.target.value;
      var shown = 0;
      $$('[data-status]', list).forEach(function (r) {
        var ok = v === 'all' || r.getAttribute('data-status') === v;
        r.hidden = !ok;
        if (ok) shown++;
      });
      var empty = document.querySelector('[data-empty="' + list.id + '"]');
      if (empty) empty.hidden = shown > 0;
    });
  });

  /* ---------- إظهار حقل حسب اختيار (مثل اسم المعرض) ---------- */
  $$('[data-show-if]').forEach(function (el) {
    var parts = el.getAttribute('data-show-if').split('=');
    function sync() {
      var c = document.querySelector('input[name="' + parts[0] + '"]:checked');
      el.hidden = !c || c.value !== parts[1];
    }
    $$('input[name="' + parts[0] + '"]').forEach(function (i) { i.addEventListener('change', sync); });
    sync();
  });

  /* ---------- الباقات: شهري / 3 أشهر ---------- */
  $$('input[name="period"]').forEach(function (r) {
    r.addEventListener('change', function () {
      var q = r.value === 'q';
      $$('[data-m]').forEach(function (b) { b.textContent = q ? b.getAttribute('data-q') : b.getAttribute('data-m'); });
      $$('[data-period-note]').forEach(function (n) { n.textContent = q ? '/ شهر · تُدفع كل 3 أشهر' : '/ شهر'; });
    });
  });
  var planSel = $('#pay-plan'), perSel = $('#pay-period'), amount = $('#pay-amount');
  if (planSel && amount) {
    var calc = function () {
      var m = { basic: 15, premium: 35 }[planSel.value];
      var months = +perSel.value;
      var total = m * months * (months >= 3 ? 0.9 : 1);
      amount.textContent = '$' + total.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' ≈ ' + formatSyp(total * RATE);
    };
    planSel.addEventListener('change', calc);
    perSel.addEventListener('change', calc);
    calc();
  }

  /* ---------- الأدمن: سعر الصرف ---------- */
  var rateForm = $('#rate-form');
  if (rateForm) {
    var rateIn = $('#rate-new'), preview = $('#rate-preview');
    var showPreview = function () {
      var r = num(rateIn.value);
      preview.textContent = r ? 'مثال: إعلان بسعر $6,500 سيظهر بـ ' + formatSyp(6500 * r) : 'أدخل السعر لمعاينة أثره';
    };
    rateIn.addEventListener('input', showPreview);
    showPreview();
    rateForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = num(rateIn.value);
      var field = rateIn.closest('.field');
      if (!r || r < 1000) { field.classList.add('invalid'); rateIn.focus(); return; }
      field.classList.remove('invalid');
      $('#rate-current').textContent = r.toLocaleString('en-US');
      $('#rate-updated').textContent = 'آخر تحديث: الآن — بواسطتك';
      var tr = document.createElement('tr');
      tr.innerHTML = '<td class="n">الآن</td><td class="n">' + r.toLocaleString('en-US') + '</td><td>أنت</td>';
      $('#rate-history').prepend(tr);
      rateIn.value = '';
      showPreview();
      toast('حُدِّث سعر الصرف وتُعاد حسابات الأسعار بالليرة');
    });
  }

  /* ---------- نشر إعلان: الخطوات ---------- */
  var form = $('#post-form');
  if (form) {
    var steps = $$('.step', form);
    var items = $$('.stepper li');
    var prev = $('#prev'), next = $('#next'), nav = $('.post-nav'), label = $('#step-label');
    var names = items.map(function (li) { return li.textContent.trim(); });
    var cur = 0;

    function show(i, focus) {
      cur = i;
      steps.forEach(function (s, k) { s.classList.toggle('active', k === i); });
      items.forEach(function (li, k) {
        li.toggleAttribute('data-done', k < i);
        if (k === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      label.textContent = 'الخطوة ' + (i + 1) + ' من ' + steps.length + ' — ' + names[i];
      prev.hidden = i === 0;
      next.textContent = i === steps.length - 2 ? 'انشر الإعلان' : 'التالي';
      nav.hidden = i === steps.length - 1;
      $('.post-top').hidden = i === steps.length - 1;
      $('.stepper').hidden = i === steps.length - 1;
      if (focus !== false) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        var h = $('h1', steps[i]);
        if (h) h.focus({ preventScroll: true });
      }
    }

    function validate(i) {
      var bad = null;
      $$('[data-required]', steps[i]).forEach(function (f) {
        var input = $('input, select, textarea', f);
        var empty = !input.value.trim();
        f.classList.toggle('invalid', empty);
        input.setAttribute('aria-invalid', String(empty));
        if (empty && !bad) bad = input;
      });
      // مجموعات الاختيار الإلزامية (مثل سلامة الهيكل)
      $$('[data-required-radio]', steps[i]).forEach(function (fs) {
        var ok = !!fs.querySelector('input:checked');
        fs.classList.toggle('invalid', !ok);
        if (!ok && !bad) bad = fs.querySelector('input');
      });
      if (bad) { bad.focus(); return false; }
      return true;
    }

    next.addEventListener('click', function () {
      if (!validate(cur)) return;
      if (cur === steps.length - 2) {
        next.disabled = true;
        next.textContent = 'جارٍ النشر…';
        setTimeout(function () { next.disabled = false; show(cur + 1); }, 900);
        return;
      }
      show(Math.min(cur + 1, steps.length - 1));
    });
    prev.addEventListener('click', function () { show(Math.max(cur - 1, 0)); });
    $$('[data-goto]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); show(+a.getAttribute('data-goto')); });
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    var usd = $('#price-usd'), eq = $('#price-eq');
    if (usd) usd.addEventListener('input', function () {
      var v = num(usd.value);
      eq.textContent = v ? '≈ ' + formatSyp(v * RATE) + ' حسب سعر الصرف الحالي' : 'يُحسب المعادل بالليرة تلقائياً';
    });

    var same = $('#wa-same'), phone = $('#phone'), wa = $('#whatsapp');
    if (same) {
      var sync = function () { wa.disabled = same.checked; if (same.checked) wa.value = phone.value; };
      same.addEventListener('change', sync);
      phone.addEventListener('input', sync);
      sync();
    }

    var file = $('#photos'), list = $('#uploads');
    if (file) file.addEventListener('change', function () {
      var room = 12 - $$('.up', list).length;
      Array.prototype.slice.call(file.files, 0, room).forEach(function (f) {
        var li = document.createElement('li');
        li.className = 'up';
        var img = document.createElement('img');
        img.alt = '';
        img.src = URL.createObjectURL(f);
        var rm = document.createElement('button');
        rm.type = 'button'; rm.className = 'rm'; rm.setAttribute('aria-label', 'حذف الصورة');
        rm.innerHTML = '<svg class="i i-sm"><use href="icons.svg#x"/></svg>';
        li.append(img, rm);
        list.appendChild(li);
      });
      if (file.files.length > room) toast('الحد الأقصى 12 صورة');
      file.value = '';
    });
    if (list) list.addEventListener('click', function (e) {
      var rm = e.target.closest('.rm');
      if (rm) { rm.closest('.up').remove(); toast('حُذفت الصورة'); }
    });

    show(0, false);
  }

  /* إزالة حالة الخطأ عند الكتابة (كل النماذج) */
  document.addEventListener('input', function (e) {
    var f = e.target.closest && e.target.closest('.field.invalid');
    if (f && e.target.value && e.target.value.trim()) f.classList.remove('invalid');
  });
  document.addEventListener('change', function (e) {
    var d = e.target.closest && e.target.closest('dialog');
    if (d) $$('[data-require-field].invalid', d).forEach(function (f) { f.classList.remove('invalid'); });
  });
})();
