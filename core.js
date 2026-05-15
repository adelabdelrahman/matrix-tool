(function () {
    // =========================================================================
    // القسم الأول: إعدادات الأمان وإنشاء صندوق الرسائل
    // =========================================================================
    var _0xDomain = window.location.hostname;
    var _0xTarget = '\x6d\x61\x74\x72\x69\x78\x2e\x73\x6b\x79\x62\x61\x67\x65\x67\x79\x70\x74\x2e\x63\x6f\x6d';
    if (_0xDomain !== _0xTarget) {
        console.error('\x41\x63\x63\x65\x73\x73\x20\x44\x65\x6e\x69\x65\x64');
        return;
    }

    // توليد وتخزين الـ Device ID
    var myDeviceId = localStorage.getItem('adel_device_id');
    if (!myDeviceId) {
        myDeviceId = 'PC-' + Math.floor(Math.random() * 90000 + 10000);
        localStorage.setItem('adel_device_id', myDeviceId);
    }

    function showBlockedMessage(customMsg) {
        if (document.getElementById('adel-blocked-msg')) return;
        var msgText = customMsg || "عفواً تم إيقاف الـ Tool";
        
        var msg = document.createElement('div');
        msg.id = 'adel-blocked-msg';
        msg.dir = "rtl"; 
        msg.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%, -50%);background:rgba(15,23,42,0.92);border:1px solid rgba(239,68,68,0.4);border-radius:20px;padding:35px 25px;color:#fff;font-family:'Segoe UI',sans-serif;z-index:2147483647;box-shadow:0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(239,68,68,0.1);min-width:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;backdrop-filter:blur(15px);animation:adelPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);";
        
        msg.innerHTML = `
            <div style='font-size:50px; margin-bottom:15px; text-shadow: 0 0 20px rgba(239,68,68,0.6);'>🚫</div>
            <div style='font-size:20px; font-weight:900; color:#f87171; margin-bottom:10px; letter-spacing:1px;'>${msgText}</div>
            <div style='font-size:12px; color:#94a3b8; margin-bottom:25px; font-weight:600; font-family:monospace;'>Device ID: ${myDeviceId}</div>
            <button onclick='this.parentElement.remove()' id='adel-close-btn' style='background:linear-gradient(135deg, #ef4444, #dc2626); color:#fff; border:none; padding:12px 35px; border-radius:30px; cursor:pointer; font-weight:bold; font-size:15px; box-shadow:0 5px 15px rgba(239,68,68,0.4); outline:none; transition:all 0.3s;'>إغلاق النافذة</button>
        `;
        
        var style = document.createElement('style');
        style.innerHTML = "@keyframes adelPopIn { 0% { opacity: 0; transform: translate(-50%, -40%) scale(0.9); } 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); } } #adel-close-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(239,68,68,0.6); }";
        document.head.appendChild(style);
        document.body.appendChild(msg);
    }

    // المخزن اللحظي
    window.adelServerConfig = window.adelServerConfig || { isActive: true, pass: "02026", hols: [], blockedDevices: [] };
    var dbUrl = "https://matrix-tool-admin-default-rtdb.firebaseio.com/systemStatus.json";
    var pingUrl = "https://matrix-tool-admin-default-rtdb.firebaseio.com/activeDevices/" + myDeviceId + ".json";
    var isEngineRunning = false;

    // فحص ما إذا كان الجهاز محظوراً أو النظام متوقف
    function checkBlockStatus() {
        if (window.adelServerConfig.isActive === false) return "عفواً تم إيقاف النظام للصيانة";
        if (window.adelServerConfig.blockedDevices && window.adelServerConfig.blockedDevices.includes(myDeviceId)) return "تم حظر هذا الجهاز من قبل الإدارة";
        return false;
    }

    if (window.adelLoaded) {
        var blockReason = checkBlockStatus();
        if (blockReason !== false) {
            showBlockedMessage(blockReason);
            return;
        }
        if (typeof window.toggleAdel === 'function') window.toggleAdel();
        return;
    }

    function liveSync() {
        fetch(dbUrl).then(function (r) { return r.json(); }).then(function (data) {
            if (data !== null) {
                if (typeof data === 'boolean') window.adelServerConfig.isActive = data;
                else {
                    window.adelServerConfig.isActive = data.isActive !== false;
                    if (data.password) window.adelServerConfig.pass = data.password;
                    if (data.holidays) window.adelServerConfig.hols = data.holidays;
                    if (data.blockedDevices) window.adelServerConfig.blockedDevices = data.blockedDevices;
                    else window.adelServerConfig.blockedDevices = [];
                }
            }

            var p = document.getElementById('adel-panel');
            var blockReason = checkBlockStatus();
            
            // لو محظور، إخفاء الأداة فوراً
            if (blockReason !== false) {
                if (p && p.style.display !== 'none') {
                    p.style.display = 'none';
                    window.adelLogged = false; 
                    showBlockedMessage(blockReason);
                }
            }

            if (window.renderHols && p && p.style.display !== 'none' && document.getElementById('hol-view').style.display === 'block') {
                window.renderHols();
            }

            if (!isEngineRunning && blockReason === false) {
                isEngineRunning = true;
                runAdelEngine();
            }

            // إرسال النبض للسيرفر دائماً عشان الإدارة تشوفه وتقدر تفك حظره
            fetch(pingUrl, {
                method: 'PUT',
                body: JSON.stringify({ lastSeen: new Date().getTime(), os: navigator.platform })
            }).catch(function(){});

        }).catch(function (error) {
            if (!isEngineRunning) { isEngineRunning = true; runAdelEngine(); }
        });
    }

    liveSync();
    setInterval(liveSync, 3000); 

    // =========================================================================
    // القسم الثاني: المحرك الأساسي (Adel Engine)
    // =========================================================================
    function runAdelEngine() {
        window.toggleAdel = function () {
            var blockReason = checkBlockStatus();
            if (blockReason !== false) {
                showBlockedMessage(blockReason);
                return;
            }
            var p = document.getElementById('adel-panel');
            if (!p) { if (window.drawPanel) window.drawPanel(); return; }
            var h = (p.style.display === 'none' || p.style.opacity === '0');
            if (h) {
                p.style.display = 'block';
                requestAnimationFrame(function () {
                    p.style.opacity = '1';
                    p.style.transform = 'translateY(0) scale(1)';
                });
                if (window.adelLogged) p.focus();
                else {
                    var pi = document.getElementById('pass-inp');
                    if (pi) { pi.value = ''; pi.focus(); }
                }
            } else {
                p.style.opacity = '0';
                p.style.transform = 'translateY(15px) scale(0.95)';
                setTimeout(function () { p.style.display = 'none'; }, 250);
                var awb = document.getElementById("ContentPlaceHolder1_txt_AWB_I");
                if (awb) awb.focus();
            }
        };

        window.adelLoaded = true;

        try {
            var ps = null;
            var doEdit = false;
            var accDb = {};
            var db = [];
            var queue = [];
            var history = [];

            try { accDb = JSON.parse(localStorage.getItem("adel_acc_db") || "{}"); } catch (e) { }
            try { queue = JSON.parse(localStorage.getItem("adel_queue") || "[]"); } catch (e) { }

            var todayKey = new Date().toLocaleDateString('en-CA');
            if (localStorage.getItem("adel_date_key") !== todayKey) {
                localStorage.setItem("adel_count", 0);
                localStorage.setItem("adel_date_key", todayKey);
            }
            window.adelCnt = parseInt(localStorage.getItem("adel_count") || 0);
            try { db = JSON.parse(localStorage.getItem("adel_db") || "[]"); } catch (e) { }

            window.adelLogged = false;
            window.adelMode = "14";
            window.adelSub = "";
            window.adelProd = "";
            window.bankDate = null;
            window.lastSeenAWB = "";

            var modes = [
                { t: "POD", v: "14", s: [], i: "📄" },
                { t: "Wafa", v: "5", s: [], i: "📃" },
                { t: "Bank", v: "bank", s: [], i: "🏦" },
                { t: "Returns", v: "man", s: [], i: "📦" }
            ];

            // =========================================================================
            // القسم الثالث: التصميم والواجهة
            // =========================================================================
            var css = ":root{--bg-glass:rgba(15,23,42,0.95);--border-glass:rgba(56,189,248,0.25);--accent:#0ea5e9;--accent-hover:#38bdf8;--text-main:#f1f5f9;--text-muted:#94a3b8;--danger:#f43f5e}#adel-panel *{outline:0;box-sizing:border-box;font-family:'Segoe UI',sans-serif;transition:all 0.2s cubic-bezier(0.4,0,0.2,1)}#adel-panel{position:fixed;top:30px;right:30px;width:300px;min-height:380px;background:var(--bg-glass);backdrop-filter:blur(25px);border:1px solid var(--border-glass);border-top:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:0;z-index:2147483647;color:var(--text-main);box-shadow:0 30px 60px -10px rgba(0,0,0,0.9);opacity:0;transform:translateY(15px) scale(0.95);display:none;overflow:hidden;display:flex;flex-direction:column}#login-view{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:30px;background:radial-gradient(circle at center,rgba(14,165,233,0.05),transparent 70%)}.pass-inp{width:100%;padding:14px 20px;background:rgba(255,255,255,0.03);border:1px solid rgba(56,189,248,0.3);border-radius:30px;color:#fff;text-align:center;font-size:18px;margin-bottom:20px;letter-spacing:2px;font-weight:600;box-shadow:inset 0 2px 10px rgba(0,0,0,0.3)}.pass-inp:focus{border-color:var(--accent);background:rgba(255,255,255,0.05);box-shadow:0 0 15px rgba(14,165,233,0.2),inset 0 2px 5px rgba(0,0,0,0.3)}.unlock-btn{width:100%;padding:14px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;font-weight:700;border-radius:30px;border:0;cursor:pointer;letter-spacing:1px;font-size:14px;box-shadow:0 5px 15px rgba(14,165,233,0.3);transition:0.3s}.unlock-btn:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(14,165,233,0.5)}.app-header{padding:18px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);flex-shrink:0}.brand{font-size:18px;font-weight:900;color:#fff;text-shadow:0 0 20px rgba(14,165,233,0.6)}.tools{display:flex;gap:8px;align-items:center}.counter-box{background:rgba(0,0,0,0.4);padding:5px 12px;border-radius:8px;font-family:'Courier New',monospace;font-size:16px;font-weight:bold;border:1px solid var(--border-glass);color:var(--accent)}.icon-btn{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px}.icon-btn:hover{background:rgba(255,255,255,0.1);color:#fff}.icon-btn.trash:hover{color:var(--danger);background:rgba(244,63,94,0.1)}.app-body{padding:22px;flex:1;overflow-y:auto}.mode-list{display:flex;flex-direction:column;gap:10px}.mode-btn{display:flex;align-items:center;width:100%;padding:14px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;color:var(--text-main);font-weight:600;cursor:pointer;position:relative;overflow:hidden}.mode-btn:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.2)}.mode-btn.active{background:linear-gradient(90deg,rgba(14,165,233,0.2),transparent);border:1px solid var(--accent);color:#fff}.mode-icon{margin-right:15px;font-size:20px}.footer-bar{margin-top:25px;padding:8px;background:rgba(0,0,0,0.4);border-radius:14px;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:10px;box-shadow:inset 0 2px 10px rgba(0,0,0,0.5)}.date-inp{flex:1;background:transparent;border:0;color:#fff;font-family:'Consolas',monospace;font-size:15px;font-weight:700;text-align:center;cursor:pointer;color-scheme:dark;padding:5px;text-transform:uppercase;letter-spacing:1px}.save-btn{width:45px;height:40px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;border:0;border-radius:10px;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.2)}.save-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(14,165,233,0.4);background:linear-gradient(135deg,#38bdf8,#0ea5e9)}.next-btn{width:100%;margin-top:10px;padding:12px;background:#10b981;color:#fff;border:0;border-radius:12px;cursor:pointer;font-weight:bold;display:flex;justify-content:center;align-items:center;gap:10px;box-shadow:0 5px 15px rgba(16,185,129,0.3)}.next-btn:hover{background:#059669;transform:translateY(-2px)}.sub-view{display:none;animation:fade 0.3s ease}@keyframes fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.view-title{text-align:center;font-size:11px;font-weight:800;letter-spacing:2px;color:var(--text-muted);margin-bottom:15px;text-transform:uppercase;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.05)}.set-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;padding:15px;margin-bottom:10px}.set-head{font-size:10px;color:var(--accent);font-weight:800;margin-bottom:10px;letter-spacing:1px}.back-btn{width:100%;padding:12px;color:var(--text-muted);border-radius:12px;cursor:pointer;font-weight:600;margin-top:15px;text-align:center;font-size:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05)}.back-btn:hover{background:rgba(255,255,255,0.08);color:#fff}.hint{text-align:center;font-size:9px;color:var(--text-muted);margin-top:20px;font-weight:600;opacity:0.6;letter-spacing:1px}.db-area{width:100%;height:100px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#ccc;padding:12px;border-radius:12px;resize:none;font-size:12px;margin-bottom:15px}.primary-btn{width:100%;padding:12px;background:var(--accent);color:#fff;border:0;border-radius:10px;font-weight:700;cursor:pointer;margin-bottom:8px}.wipe-btn{width:100%;padding:10px;background:rgba(244,63,94,0.1);border:1px solid var(--danger);color:var(--danger);border-radius:10px;font-weight:600;cursor:pointer;font-size:11px}#adel-picker{position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);background:#0f172a;border:1px solid var(--accent);padding:15px;z-index:999999;width:260px;text-align:center;border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,0.9);color:#fff}.pick-opt{display:block;width:100%;margin:5px 0;padding:10px 12px;background:rgba(255,255,255,0.05);color:var(--text-muted);border:1px solid transparent;cursor:pointer;text-align:left;border-radius:8px;font-weight:600;font-size:12px}.pick-opt.sel{background:rgba(14,165,233,0.15);border-color:var(--accent);color:#fff}.q-badge{position:absolute;top:5px;right:10px;background:var(--accent);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:bold}";
            var s = document.createElement("style");
            s.innerHTML = css;
            document.head.appendChild(s);

            // =========================================================================
            // القسم الرابع: الدوال الأساسية
            // =========================================================================
            var checkDate = function (d, m) {
                while (true) {
                    var day = d.getDay();
                    var dd = d.getDate();
                    var mm = d.getMonth() + 1;
                    var yy = d.getFullYear();
                    var s1 = dd + "/" + mm;
                    var s2 = (dd < 10 ? '0' + dd : dd) + "/" + (mm < 10 ? '0' + mm : mm);
                    var s3 = s1 + "/" + yy;
                    var s4 = s2 + "/" + yy;
                    var srvHols = window.adelServerConfig.hols;
                    var h = srvHols.indexOf(s1) > -1 || srvHols.indexOf(s2) > -1 || srvHols.indexOf(s3) > -1 || srvHols.indexOf(s4) > -1;
                    
                    if (m === "man") {
                        if (day === 5 || h) d.setDate(d.getDate() - 1);
                        else break;
                    } else {
                        var f = (day === 5);
                        var sa = (day === 6 && m !== "14");
                        if (f || sa || h) d.setDate(d.getDate() - 1);
                        else break;
                    }
                }
                return d;
            };

            window.resetCnt = function () {
                if (confirm("Reset?")) {
                    window.adelCnt = 0;
                    localStorage.setItem("adel_count", 0);
                    document.getElementById("cnt-badge").innerText = "0";
                }
            };
            window.clearDB = function () {
                if (confirm("Clear History?")) {
                    db = [];
                    localStorage.setItem("adel_db", "[]");
                    alert("Cleared");
                }
            };
            window.saveQ = function (txt) {
                if (!txt || !txt.trim()) return;
                var l = txt.split("\n").map(x => x.trim()).filter(x => x.length > 3);
                if (l.length > 0) {
                    queue = l;
                    localStorage.setItem("adel_queue", JSON.stringify(queue));
                    alert("Loaded " + l.length + " AWBs! Ready to go.");
                    updateQBtn();
                } else alert("Invalid");
            };
            window.clearQ = function () {
                if (confirm("Clear Queue?")) {
                    queue = [];
                    localStorage.setItem("adel_queue", "[]");
                    updateQBtn();
                    alert("Cleared");
                }
            };
            var updateQBtn = function () {
                var b = document.getElementById('next-awb-btn');
                if (b) {
                    if (queue.length > 0) { b.innerHTML = "Next ▶ (" + queue.length + ")"; b.style.display = 'flex'; } 
                    else b.style.display = 'none';
                }
            };
            window.loadNext = function () {
                if (queue.length === 0) { alert("Queue Empty"); return; }
                var n = queue.shift();
                localStorage.setItem("adel_queue", JSON.stringify(queue));
                updateQBtn();
                if (n) { history.push(n); if (history.length > 50) history.shift(); }
                var awb = document.getElementById("ContentPlaceHolder1_txt_AWB_I");
                if (awb) {
                    awb.value = n; awb.focus();
                    setTimeout(function () { var e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', keyCode: 13 }); awb.dispatchEvent(e); }, 50);
                }
            };
            window.loadPrev = function () {
                if (history.length === 0) { alert("No Previous AWB"); return; }
                var current = history.pop();
                if (current) queue.unshift(current);
                var prev = history[history.length - 1];
                if (!prev) prev = current;
                localStorage.setItem("adel_queue", JSON.stringify(queue));
                updateQBtn();
                var awb = document.getElementById("ContentPlaceHolder1_txt_AWB_I");
                if (awb) {
                    awb.value = prev; awb.focus();
                    setTimeout(function () { var e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', keyCode: 13 }); awb.dispatchEvent(e); }, 50);
                }
            };
            var rec = function (d) {
                if (!d.a) return;
                var n = new Date(), k = n.toLocaleDateString('en-CA'), idx = -1;
                for (var i = 0; i < db.length; i++) { if (db[i].awb === d.a && db[i].key === k) { idx = i; break; } }
                var u = n.toLocaleDateString('en-GB'), ut = n.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                var o = { drs: d.st, awb: d.a, co: d.c, prod: d.p, rec: d.r, ud: u, ut: ut, key: k };
                if (idx > -1) db[idx] = o; else db.push(o);
                localStorage.setItem("adel_db", JSON.stringify(db));
                window.adelCnt++;
                localStorage.setItem("adel_count", window.adelCnt);
                document.getElementById("cnt-badge").innerText = window.adelCnt;
            };

            // =========================================================================
            // القسم الخامس: الواجهة والتنقل
            // =========================================================================
            window.drawPanel = function () {
                var d = document.createElement("div"); d.id = "adel-panel"; d.tabIndex = "-1";
                var lH = "<div id='login-view'><h1 style='font-family:\"Times New Roman\",serif;font-style:italic;font-size:55px;color:#fff;text-shadow:0 0 20px #0ea5e9;margin-bottom:30px;font-weight:bold'>Sky Bag</h1><input type='password' id='pass-inp' class='pass-inp' placeholder='PASSCODE'><button id='ul-btn' class='unlock-btn'>LOGIN</button><div id='e-msg' style='color:#ef4444;font-size:11px;margin-top:20px;font-weight:700'></div></div>";
                var aH = "<div id='app-view' style='display:none;flex-direction:column;height:100%'><div class='app-header'><div class='brand'>⚡ ADEL</div><div class='tools'><span class='counter-box' id='cnt-badge'>" + window.adelCnt + "</span><button class='icon-btn trash' onclick='clearDB()' title='History'>🗑</button><button class='icon-btn' onclick='resetCnt()' title='Reset'>🔄</button><button class='icon-btn' onclick='toggleSet()' title='Settings'>⚙</button></div></div><div class='app-body'><div id='main-view' class='sub-view' style='display:block'><div class='mode-list' id='mode-list'></div><button id='next-awb-btn' class='next-btn' onclick='loadNext()' style='display:none'>Next ▶</button></div><div id='set-view' class='sub-view'><div class='view-title'>SETTINGS</div><div class='set-card'><div class='set-head'>DATA MANAGEMENT</div><div class='mode-list'><div class='mode-btn' onclick='showHols()'><span class='mode-icon'>📅</span>Holiday Manager</div></div></div><div class='back-btn' onclick='showMain()'>← Return to Main</div></div><div id='hol-view' class='sub-view'><div class='view-title'>HOLIDAYS (READ ONLY)</div><div id='hol-list' style='max-height:160px;overflow-y:auto;padding-right:5px;margin-top:10px'></div><button class='back-btn' onclick='toggleSet()'>Back</button></div><div class='hint'><div style='margin-top:8px;color:var(--accent);font-weight:800;letter-spacing:2px;font-family:monospace;'>ID: "+myDeviceId+"</div><div style='margin-top:5px;color:#94a3b8;font-size:8px;'>© ENG ADEL 2026</div></div></div></div>";
                
                d.innerHTML = lH + aH;
                var cObj = d.querySelector("#mode-list");
                var navs = [];
                modes.forEach(function (m, i) {
                    var b = document.createElement("div"); b.className = "mode-btn";
                    b.innerHTML = "<span class='mode-icon'>" + m.i + "</span>" + m.t;
                    b.onclick = function () { setM(m.v, ""); };
                    cObj.appendChild(b); navs.push(b);
                });
                document.body.appendChild(d);

                window.checkPass = function () {
                    var i = document.getElementById('pass-inp');
                    if (i.value === window.adelServerConfig.pass) {
                        window.adelLogged = true;
                        document.getElementById('login-view').style.display = 'none';
                        document.getElementById('app-view').style.display = 'flex';
                        d.focus(); updateQBtn();
                    } else {
                        document.getElementById('e-msg').innerText = "INCORRECT";
                        i.style.borderColor = css.danger;
                    }
                };

                document.getElementById('ul-btn').onclick = window.checkPass;
                document.getElementById('pass-inp').onkeydown = function (e) { if (e.key === 'Enter') window.checkPass(); };

                var c = 0;
                var vis = function (v, n) {
                    document.querySelectorAll('.sub-view').forEach(function (e) { e.style.display = 'none'; });
                    document.getElementById(v).style.display = 'block';
                    if (n) navs = n; c = 0; upd(0); d.focus();
                };
                var upd = function (i) { navs.forEach(function (x, n) { if (n === i) x.classList.add('active'); else x.classList.remove('active'); }); };

                window.showMain = function () { vis('main-view', Array.from(document.querySelectorAll('#mode-list .mode-btn'))); };
                window.toggleSet = function () { vis('set-view', Array.from(document.querySelectorAll('#set-view .mode-btn'))); };
                window.showHols = function () { renderHols(); vis('hol-view', [document.querySelector('#hol-view .back-btn')]); };

                window.renderHols = function () {
                    var l = document.getElementById('hol-list');
                    if (!l) return;
                    l.innerHTML = '';
                    var srvHols = window.adelServerConfig.hols;
                    if (srvHols.length === 0) l.innerHTML = "<div style='text-align:center;font-size:11px;color:#94a3b8;padding:5px;'>لا يوجد تواريخ محظورة</div>";
                    srvHols.forEach(function (h, i) {
                        var r = document.createElement('div');
                        r.style.cssText = "display:flex;justify-content:space-between;padding:10px 12px;background:rgba(255,255,255,0.03);margin-bottom:6px;border-radius:8px;font-size:14px;align-items:center;border:1px solid rgba(255,255,255,0.05)";
                        r.innerHTML = "<span style='font-weight:bold; letter-spacing:1px;'>" + h + "</span><span style='color:#0ea5e9;font-size:14px'>🔒</span>";
                        l.appendChild(r);
                    });
                };

                window.setM = function (m, s) {
                    window.adelMode = m; window.adelSub = s; window.toggleAdel();
                    if (m === "bank" && !window.bankDate) {
                        var t = new Date(), def = t.getDate() + "/" + (t.getMonth() + 1);
                        var pr = prompt("Date:", def);
                        if (pr) window.bankDate = pr;
                    }
                    var t = document.getElementById("ContentPlaceHolder1_txt_AWB_I"); if (t) t.focus();
                };

                navs = Array.from(document.querySelectorAll('#mode-list .mode-btn')); upd(0);

                d.onkeydown = function (e) {
                    if (checkBlockStatus() !== false) { if (e.key === "Escape" || e.key === "Delete") showBlockedMessage(checkBlockStatus()); return; }
                    if (!window.adelLogged) return;
                    if (e.key === "Backspace") { e.preventDefault(); window.showMain(); return; }
                    if (e.key === "ArrowDown") { e.preventDefault(); c = (c + 1) % navs.length; upd(c); } 
                    else if (e.key === "ArrowUp") { e.preventDefault(); c = (c - 1 + navs.length) % navs.length; upd(c); } 
                    else if (e.key === "Enter") { e.preventDefault(); if (navs[c]) navs[c].click(); }
                };
            };

            window.drawPanel();
            setTimeout(function () {
                var p = document.getElementById('adel-panel');
                if (p) { p.style.display = 'block'; setTimeout(function () { p.style.opacity = '1'; p.style.transform = 'scale(1)'; }, 10); document.getElementById('pass-inp').focus(); }
            }, 50);

            // =========================================================================
            // القسم السادس: أحداث لوحة المفاتيح
            // =========================================================================
            var updatePick = function () {
                if (!ps || !ps.o) return;
                ps.o.forEach(function (b, i) { if (i === ps.i) b.classList.add('sel'); else b.classList.remove('sel'); });
            };

            var showPicker = function (n, c, cb) {
                if (document.getElementById('adel-picker')) return;
                var d = document.createElement("div"); d.id = "adel-picker"; d.tabIndex = "-1"; d.innerHTML = "<div style='color:#0ea5e9;font-weight:900;margin-bottom:15px;font-size:12px;letter-spacing:2px'>SELECT NAME</div>";
                var opts = [];
                n.forEach(function (name) {
                    var b = document.createElement("div"); b.className = "pick-opt"; b.innerText = name;
                    b.onclick = function () { c.SetValue(name); d.remove(); ps = null; cb(); };
                    d.appendChild(b); opts.push(b);
                });
                document.body.appendChild(d);
                ps = { i: 0, o: opts, n: n, c: c, cb: cb, el: d }; updatePick();
            };

            window.addEventListener("keydown", function (e) {
                if (e.key === "Delete") {
                    var blockReason = checkBlockStatus();
                    if (blockReason !== false) { showBlockedMessage(blockReason); return; }
                    if (e.target && e.target.id === "db-input") return;
                    window.toggleAdel();
                }
            }, true);

            document.addEventListener("keydown", function (e) {
                var blockReason = checkBlockStatus();
                if (blockReason !== false) {
                    if (e.key === "Escape" || e.key === "Delete" || e.key === "Alt") showBlockedMessage(blockReason);
                    return; 
                }

                if (e.key === "`" || e.code === "Backquote" || e.code === "IntlBackslash") { e.preventDefault(); window.loadNext(); return; }
                if (e.key === "F1") { e.preventDefault(); window.loadPrev(); return; }
                if (ps) {
                    e.preventDefault(); e.stopPropagation(); var l = ps.o.length;
                    if (e.key === "ArrowDown") { ps.i = (ps.i + 1) % l; updatePick(); }
                    else if (e.key === "ArrowUp") { ps.i = (ps.i - 1 + l) % l; updatePick(); }
                    else if (e.key === "Enter") { ps.c.SetValue(ps.n[ps.i]); ps.el.remove(); var cb = ps.cb; ps = null; cb(); }
                    else if (e.key === "Escape") { ps.el.remove(); ps = null; }
                    return;
                }
                if (e.key === "Escape") {
                    var p = document.getElementById('adel-panel');
                    if (p && p.style.display !== 'none') { e.preventDefault(); window.toggleAdel(); return; }
                }
                if (!window.adelLogged) return;
                
                if (e.key === "Enter") {
                    var el = document.activeElement; if (!el) return;
                    if (el.id.indexOf("txt_AWB") > -1) setTimeout(function () { doEdit = true; }, 100);
                    var m = window.adelMode; var id = el.id;
                    if ((m === "14" || m === "5") && id.indexOf("DXEditor3") > -1 || m === "bank" && id.indexOf("DXEditor8") > -1) {
                        e.preventDefault(); el.blur();
                        var g = ASPx.GetControlCollection().Get("ContentPlaceHolder1_ASPxGridView1");
                        if (g) g.UpdateEdit();
                    }
                }
                
                if (e.key === "Alt") {
                    var el = document.activeElement; if (el && el.id.indexOf("txt_AWB") > -1) return;
                    e.preventDefault();
                    try {
                        var m = window.adelMode; var get = function (id) { return ASPx.GetControlCollection().Get("ContentPlaceHolder1_ASPxGridView1_DXEFL_" + id); };
                        var tds = document.getElementsByTagName("td"), raw = "";
                        for (var i = 0; i < tds.length; i++) { if (tds[i].innerText.trim() === "Receiver Name") { var r = tds[i].parentElement.nextElementSibling; if (r) raw = r.cells[tds[i].cellIndex].innerText.trim(); break; } }
                        var cd = get("DXEditor6"), cs = get("DXEditor4"), cn = get("DXEditor2");
                        if (m === "man") {
                            var d = new Date(), n = new Date(); n.setHours(0, 0, 0, 0);
                            for (var i = 0; i < tds.length; i++) {
                                if (tds[i].innerText.trim() === "Bill Date") {
                                    var r = tds[i].parentElement.nextElementSibling;
                                    if (r) { var t = r.cells[tds[i].cellIndex].innerText.trim(); if (t.indexOf("/") > -1) { var s = t.split("/"); var bdt = new Date(s[2], s[0] - 1, s[1]); var ld = new Date(bdt); ld.setDate(ld.getDate() + 14); ld.setHours(0, 0, 0, 0); d = (ld > n) ? n : ld; } }
                                    break;
                                }
                            }
                            d = checkDate(d, m); if (cd) cd.SetDate(d); if (cn) cn.SetValue("");
                            var inp = document.getElementById("ContentPlaceHolder1_ASPxGridView1_DXEFL_DXEditor4_I");
                            if (cs && inp) {
                                cs.SetFocus(); setTimeout(function () { inp.focus(); inp.select(); }, 50);
                                inp.onkeydown = function (ev) { if (ev.key === "Enter") { ev.preventDefault(); inp.blur(); setTimeout(function () { var g = ASPx.GetControlCollection().Get("ContentPlaceHolder1_ASPxGridView1"); if (g) g.UpdateEdit(); }, 200); } };
                            }
                        } else {
                            var next = function () {
                                var cr = get("DXEditor5");
                                if (cr) {
                                    cr.SetFocus(); if (cr.ShowDropDown) cr.ShowDropDown(); cr.SelectedIndexChanged.ClearHandlers();
                                    cr.SelectedIndexChanged.AddHandler(function () { setTimeout(function () { var tid = (m === "bank") ? "DXEditor8" : "DXEditor3"; var el = document.getElementById("ContentPlaceHolder1_ASPxGridView1_DXEFL_" + tid + "_I"); if (el) { el.focus(); el.select(); if (m !== "bank") { el.onkeyup = function () { var v = el.value, ok = (v.length === 14 && (v.startsWith("2") || v.startsWith("3"))); el.style.backgroundColor = ok ? "#dcfce7" : "#fee2e2"; el.style.color = "#000"; }; } } }, 100); });
                                }
                            };
                            if (m === "bank") {
                                if (!window.bankDate) { var p = prompt("Date?"); if (p) window.bankDate = p; }
                                if (window.bankDate) { var p = window.bankDate.split("/"); var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(parseInt(p[0])); d.setMonth(parseInt(p[1]) - 1); if (p[2]) d.setFullYear(parseInt(p[2])); d = checkDate(d, m); if (cd) cd.SetDate(d); }
                                if (cs) cs.SetValue(6); if (cn) cn.SetValue("Bank Stamp"); if (cn) cn.SetFocus(); next();
                            } else {
                                var n = new Date(); n.setHours(0, 0, 0, 0); var y = new Date(n); y.setDate(n.getDate() - 1); var billDate = new Date(); var found = false;
                                for (var i = 0; i < tds.length; i++) { if (tds[i].innerText.trim() === "Bill Date") { var r = tds[i].parentElement.nextElementSibling; if (r) { var t = r.cells[tds[i].cellIndex].innerText.trim().split("/"); if (t.length > 1) { billDate = new Date(t[2], t[0] - 1, t[1]); found = true; } } break; } }
                                if (found) { var add = (m === "5") ? 5 : 14; var target = new Date(billDate); target.setDate(target.getDate() + add); if (target >= n) target = y; target = checkDate(target, m); if (cd) cd.SetDate(target); }
                                if (cs) cs.SetValue(6);
                                if (cn) {
                                    cn.SetFocus(); if (/[a-zA-Z]/.test(raw)) raw = raw.replace(/[\u0600-\u06FF]/g, '').replace(/\s+/g, ' ').trim();
                                    var p = raw.split(/[:;,\-|\/\*&+]|\bOR\b|\bAND\b/i).map(x => x.replace(/[\u0600-\u06FF]/g, '').replace(/\s+/g, ' ').trim()).filter(x => x.length > 1);
                                    var he = p.some(n => /[a-zA-Z]/.test(n)); if (he) p = p.filter(n => /[a-zA-Z]/.test(n));
                                    if (p.length > 1) showPicker(p, cn, next); else { cn.SetValue(p[0] || raw); next(); }
                                }
                            }
                        }
                    } catch (e) { }
                }
            }, true);

            // =========================================================================
            // القسم السابع: المعالجة في الخلفية
            // =========================================================================
            setInterval(function () {
                if (checkBlockStatus() !== false) return; 

                try {
                    var awb = document.getElementById("ContentPlaceHolder1_txt_AWB_I");
                    if (awb && !awb.hasPasted) {
                        awb.hasPasted = true;
                        awb.addEventListener("paste", function (e) {
                            var t = (e.clipboardData || window.clipboardData).getData('text');
                            if (t && t.indexOf("\n") > -1) { e.preventDefault(); window.saveQ(t); }
                        });
                    }
                    
                    var st = document.getElementById("ContentPlaceHolder1_ASPxGridView1_DXEFL_DXEditor4_I"), dt = document.getElementById("ContentPlaceHolder1_ASPxGridView1_DXEFL_DXEditor6_I");
                    if (st && st.value) window.lastValidSt = st.value;
                    if (dt && dt.value) window.lastValidDt = dt.value;
                    if (awb && awb.value.length > 3) window.lastSeenAWB = awb.value;
                    
                    if (accDb && window.lastSeenAWB) {
                        try {
                            var tds = document.getElementsByTagName("td");
                            for (var i = 0; i < tds.length; i++) {
                                var txt = tds[i].innerText.trim();
                                if (txt.indexOf("Acc") > -1 || txt.indexOf("No") > -1) {
                                    var match = txt.match(/\d{4,}/), num = match ? match[0] : null;
                                    if (!num) { var r = tds[i].parentElement.nextElementSibling; if (r) { var belowCell = r.cells[tds[i].cellIndex]; if (belowCell) { var txt2 = belowCell.innerText.trim(); var m2 = txt2.match(/\d{4,}/); if (m2) num = m2[0]; } } }
                                    if (num && accDb[num]) { window.adelSub = accDb[num].n; window.adelProd = accDb[num].p; break; }
                                }
                            }
                        } catch (e) { }
                    }
                    
                    if (doEdit) { var b = document.getElementById("ContentPlaceHolder1_ASPxGridView1_DXCBtn0_I"); if (b && b.offsetParent !== null) { b.click(); doEdit = false; } }
                    
                    var pm = ASPx.GetControlCollection().Get("ContentPlaceHolder1_popMsg");
                    if (pm && pm.IsVisible()) {
                        var t = ""; try { t = pm.GetMainElement().innerText.toUpperCase(); } catch (x) { } pm.Hide();
                        if (t.indexOf("ERR") === -1 && t.indexOf("FAIL") === -1 && t.indexOf("خطأ") === -1) {
                            if (window.lastSeenAWB) {
                                var finalSt = window.lastValidSt || "Unknown"; finalSt = finalSt.replace(/^[;\s]+/, "").trim();
                                var finalDt = window.lastValidDt || window.bankDate || "";
                                var cn = window.adelSub || (window.adelMode === "5" ? "Wafa" : (window.adelMode === "man" ? "Returns" : "-"));
                                rec({ st: finalSt, a: window.lastSeenAWB, c: cn, p: window.adelProd, r: finalDt });
                                window.adelSub = ""; window.adelProd = ""; window.lastValidSt = ""; window.lastValidDt = "";
                            }
                        }
                        if (awb) { awb.focus(); awb.select(); }
                        setTimeout(function () { if (awb) { awb.focus(); awb.select(); } }, 100);
                    }
                } catch (e) { }
            }, 100);
            
        } catch (e) { alert("Error:" + e); }
    }
})();