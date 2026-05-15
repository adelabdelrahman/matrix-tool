(function() {
    // 1. فحص النطاق (Domain Security)
    var _0xDomain = window.location.hostname;
    var _0xTarget = '\x6d\x61\x74\x72\x69\x78\x2e\x73\x6b\x79\x62\x61\x67\x65\x67\x79\x70\x74\x2e\x63\x6f\x6d';
    if (_0xDomain !== _0xTarget) {
        console.error('\x41\x63\x63\x65\x73\x73\x20\x44\x65\x6e\x69\x65\x64');
        return;
    }

    // 2. رابط التحكم المركزي (Firebase Link)
    const dbUrl = "https://matrix-tool-admin-default-rtdb.firebaseio.com/systemConfig.json";

    // جلب الإعدادات من الداشبورد قبل أي شيء
    fetch(dbUrl).then(r => r.json()).then(config => {
        
        // فحص مفتاح التشغيل الرئيسي
        if (config.security && !config.security.masterSwitch) {
            alert(config.announcement || "⚠️ النظام متوقف حالياً للصيانة.");
            return;
        }

        // الكود الأساسي يبدأ من هنا
        var v = localStorage.getItem('adel_engine_v1');
        if (v) { try { eval(v); return } catch (e) { console.log('Update Error') } }

        window.toggleAdel = function() {
            var p = document.getElementById('adel-panel');
            if (!p) { if (window.drawPanel) window.drawPanel(); return }
            var h = (p.style.display === 'none' || p.style.opacity === '0');
            if (h) {
                p.style.display = 'block';
                requestAnimationFrame(function() {
                    p.style.opacity = '1';
                    p.style.transform = 'translateY(0) scale(1)';
                });
                if (window.adelLogged) p.focus();
                else { var pi = document.getElementById('pass-inp'); if (pi) { pi.value = ''; pi.focus() } }
            } else {
                p.style.opacity = '0';
                p.style.transform = 'translateY(15px) scale(0.95)';
                setTimeout(function() { p.style.display = 'none' }, 250);
            }
        };

        if (window.adelLoaded) { window.toggleAdel(); return }
        window.adelLoaded = true;

        // الإعدادات الافتراضية
        var MyPass = config.security.password || "02026";
        var holidays = config.blockedDates || [];
        var todayKey = new Date().toLocaleDateString('en-CA');

        window.adelCnt = parseInt(localStorage.getItem("adel_count") || 0);
        window.adelLogged = false;
        window.adelMode = "14";

        var modes = [
            { t: "POD", v: "14", i: "📄" },
            { t: "Wafa", v: "5", i: "📃" },
            { t: "Bank", v: "bank", i: "🏦" },
            { t: "Returns", v: "man", i: "📦" }
        ];

        // CSS التصميم
        var css = ":root{--bg-glass:rgba(15,23,42,0.95);--border-glass:rgba(56,189,248,0.25);--accent:#0ea5e9;--text-main:#f1f5f9}#adel-panel{position:fixed;top:30px;right:30px;width:300px;background:var(--bg-glass);backdrop-filter:blur(25px);border:1px solid var(--border-glass);border-radius:24px;z-index:2147483647;color:var(--text-main);box-shadow:0 30px 60px rgba(0,0,0,0.8);display:none;flex-direction:column;opacity:0;transform:scale(0.95)}.pass-inp{width:80%;padding:12px;margin:20px;border-radius:20px;border:1px solid var(--accent);background:transparent;color:white;text-align:center}.unlock-btn{padding:10px 25px;border-radius:20px;background:var(--accent);color:white;border:none;cursor:pointer}.app-header{padding:15px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between}.mode-btn{padding:12px;margin:5px 15px;background:rgba(255,255,255,0.05);border-radius:12px;cursor:pointer;display:flex;align-items:center}.mode-btn:hover{background:rgba(255,255,255,0.1)}";
        var s = document.createElement("style"); s.innerHTML = css; document.head.appendChild(s);

        // Logic فحص التواريخ الممنوعة والويك إند
        var checkDate = function(d, m) {
            while (true) {
                var day = d.getDay();
                var ds = d.toISOString().split('T')[0];
                var isBlocked = holidays.includes(ds);
                
                // لو جمعة أو تاريخ ممنوع من الأدمن -> ارجع يوم
                if (day === 5 || isBlocked) {
                    d.setDate(d.getDate() - 1);
                } else {
                    break;
                }
            }
            return d;
        };

        window.drawPanel = function() {
            var d = document.createElement("div");
            d.id = "adel-panel";
            var lH = "<div id='login-view' style='text-align:center;padding:40px'><h2>Sky Bag</h2><input type='password' id='pass-inp' class='pass-inp' placeholder='PASSCODE'><br><button id='ul-btn' class='unlock-btn'>LOGIN</button></div>";
            var aH = "<div id='app-view' style='display:none;flex-direction:column'><div class='app-header'><div class='brand'>⚡ ADEL</div><span id='cnt-badge'>"+window.adelCnt+"</span></div><div id='mode-list' style='padding:15px 0'></div></div>";
            d.innerHTML = lH + aH;
            
            document.body.appendChild(d);

            document.getElementById('ul-btn').onclick = function() {
                if (document.getElementById('pass-inp').value === MyPass) {
                    window.adelLogged = true;
                    document.getElementById('login-view').style.display = 'none';
                    document.getElementById('app-view').style.display = 'flex';
                    if (config.announcement) alert("📢 " + config.announcement);
                } else { alert("WRONG PASS"); }
            };

            modes.forEach(function(m) {
                var b = document.createElement("div");
                b.className = "mode-btn";
                b.innerHTML = "<span>"+m.i+"</span> " + m.t;
                b.onclick = function() {
                    window.adelMode = m.v;
                    window.toggleAdel();
                    alert("Selected: " + m.t);
                };
                document.getElementById('mode-list').appendChild(b);
            });
        };

        window.drawPanel();

        // الـ Logic بتاع Alt اللي بيقفل التواريخ
        document.addEventListener("keydown", function(e) {
            if (e.key === "Alt" && window.adelLogged) {
                e.preventDefault();
                
                // جلب الـ Bill Date من السيستم (كمثال)
                var billDate = new Date(); // هنا المفروض كود سحب التاريخ من الصفحة
                var n = new Date(); n.setHours(0,0,0,0);
                var yesterday = new Date(n); yesterday.setDate(n.getDate() - 1);

                // تحديد عدد الأيام بناءً على النوع من الفايربيز
                var addDays = 14;
                if (window.adelMode === "5") addDays = config.wafa.days;
                else if (window.adelMode === "14") addDays = config.pod.days;
                else if (window.adelMode === "man") addDays = config.returns.days;

                var target = new Date(billDate);
                target.setDate(target.getDate() + addDays);

                // لو التاريخ في المستقبل يرجع لإمبارح
                if (target > n) target = yesterday;

                // فحص الويك إند والتواريخ الممنوعة
                target = checkDate(target, window.adelMode);

                console.log("Final Date Calculation: " + target.toISOString().split('T')[0]);
                alert("التاريخ المقترح: " + target.toLocaleDateString('en-GB'));
                
                // هنا بتضيف كود الـ SetDate للخانة في السيستم
            }
        }, true);

    }).catch(err => {
        console.error("Firebase Connection Failed");
    });
})();