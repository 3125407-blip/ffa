// ★★★ 自分のSupabase情報に書き換えてください ★★★
const SUPABASE_URL = 'https://chvypwumqcbudgediwdo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodnlwd3VtcWNidWRnZWRpd2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MzM0NDMsImV4cCI6MjA5OTQwOTQ0M30.8fpK0wwF2kfQjZe5fZnAfoBEuAaYbPca0W_tudIrHKk';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let myData = null; // ログイン中のプレイヤーデータ

// 巨大数フォーマット
function f(n) {
    if (n === null || n === undefined) return "0";
    try {
        let s = String(n);
        if (s.includes('e+')) {
            let [base, exp] = s.split('e+');
            let [int, dec] = base.split('.');
            dec = dec || "";
            s = int + dec + "0".repeat(Number(exp) - dec.length);
        }
        return BigInt(s.split('.')[0]).toLocaleString();
    } catch (e) {
        return Number(n).toLocaleString();
    }
}

// 1. ログイン/新規登録
async function cmdLogin() {
    const name = document.getElementById('player-name').value;
    const pass = document.getElementById('player-pass').value;
    if(!name || !pass) return alert("入力してください");

    const { data: player, error } = await _supabase.from('players').select('*').eq('name', name).single();

    if (!player) {
        const initialInv = { weapon: null, armor: null, bag: [] };
        const { data: newUser, error: insErr } = await _supabase.from('players').insert([
            { name, password: pass, hp: 100, base_max_hp: 100, lv: 1, exp: 0, gold: 5000, inventory: initialInv, job: '冒険者', last_raid: 0 }
        ]).select().single();
        myData = newUser;
        document.getElementById('log').innerHTML = `店主：「はじめまして、${name}！ 新しい冒険の始まりだ！」`;
    } else {
        if (player.password !== pass) return alert("パスワードが違います");
        myData = player;
        document.getElementById('log').innerHTML = `店主：「おかえり、${name}！ 待ってたよ。」`;
    }

    document.getElementById('login-form').style.display = "none";
    document.getElementById('area-select').disabled = false;
    document.getElementById('btn-battle').disabled = false;
    document.getElementById('btn-rest').disabled = false;
    document.getElementById('btn-shop').disabled = false;
    document.getElementById('inventory-panel').style.display = "block";
    document.getElementById('raid-panel').style.display = "block";

    updateUI();
    setInterval(updateUI, 5000); // 定期更新
}

// ステータス更新UI
async function updateUI() {
    if(!myData) return;
    const { data: p } = await _supabase.from('players').select('*').eq('name', myData.name).single();
    myData = p;

    // 最大HP計算
    const armorHPs = { "皮の服": 20, "銅の鎧": 200, "鉄の鎧": 400, "金の鎧": 900, "プラチナの鎧": 2000, "妖精の服": 100000, "天の羽衣": 2000000 };
    let maxHp = Number(myData.base_max_hp) + (armorHPs[myData.inventory.armor] || 0);
    const hpPer = (myData.hp / maxHp) * 100;

    document.getElementById('status').innerHTML = `
        <b style="color:#fff;">${myData.name}</b> <span style="color:#38bdf8;">[Lv ${f(myData.lv)}]</span><br>
        HP: ${f(myData.hp)} / ${f(maxHp)}
        <div class="hp-bar"><div class="hp-fill" style="width:${hpPer}%"></div></div>
        Exp: ${f(myData.exp)} | Gold: ${f(myData.gold)}G<br>
        <span style="font-size:12px; color:#aaa;">装備: 武器:${myData.inventory.weapon || "なし"} / 防具:${myData.inventory.armor || "なし"}</span>
    `;

    document.getElementById('p-job').innerText = myData.job;
    document.getElementById('inv-weapon').innerText = myData.inventory.weapon || "なし";
    document.getElementById('btn-un-weapon').style.display = myData.inventory.weapon ? "inline" : "none";
    document.getElementById('inv-armor').innerText = myData.inventory.armor || "なし";
    document.getElementById('btn-un-armor').style.display = myData.inventory.armor ? "inline" : "none";

    let bagHtml = "";
    myData.inventory.bag.forEach(item => {
        bagHtml += `<span style="margin-right:5px;">${item}<button onclick="cmdEquip('${item}')" style="padding:1px 4px; font-size:10px;">装備</button></span>`;
    });
    document.getElementById('bag-list').innerHTML = "バッグ: " + (bagHtml || "なし");

    refreshRanking();
    refreshChat();
    refreshNotices();
    refreshRaid();
}

// 冒険（戦闘）- 全ての敵リストをそのまま移行
const areaEnemies = {
    beginner: [{n:"スライム",hp:15,str:5,exp:5,g:15},{n:"ゴブリン",hp:35,str:10,exp:15,g:40},{n:"アイファング",hp:45,str:15,exp:20,g:50},{n:"ミニゴリラ",hp:100,str:50,exp:55,g:100},{n:"カーバンクル",hp:65,str:10,exp:15,g:40},{n:"ブルーウィスプ",hp:65,str:10,exp:15,g:40},{n:"キラービー",hp:65,str:10,exp:15,g:40},{n:"ウェアウルフ",hp:65,str:10,exp:15,g:40},{n:"バーサーカー",hp:65,str:10,exp:15,g:40},{n:"ゾンビ",hp:65,str:10,exp:15,g:40},{n:"マミー",hp:65,str:10,exp:15,g:40},{n:"呪いの銅貨",hp:65,str:10,exp:15,g:40},{n:"タランチュラ",hp:65,str:10,exp:15,g:40},{n:"ホースの黒い馬",hp:65,str:10,exp:15,g:40},{n:"変異ゴブリン",hp:3000,str:100,exp:105,g:4000},{n:"コボルド",hp:25,str:8,exp:8,g:20},{n:"マッドポリス",hp:50,str:12,exp:18,g:45},{n:"フォレストシーフ",hp:55,str:14,exp:15,g:120},{n:"スポアキノコ",hp:20,str:6,exp:5,g:15},{n:"アーマービートル",hp:80,str:12,exp:25,g:60},{n:"牙ウサギ",hp:18,str:7,exp:6,g:12},{n:"スケルトン歩兵",hp:70,str:18,exp:30,g:80},{n:"レッサーデーモン",hp:120,str:25,exp:45,g:150},{n:"ワイルドボア",hp:90,str:20,exp:35,g:90},{n:"迷い犬",hp:12,str:4,exp:3,g:10}],
    cave: [{n:"どくグモ",hp:60,str:18,exp:35,g:90},{n:"変異タランチュラ",hp:100,str:20,exp:100,g:200},{n:"ダークバット",hp:45,str:12,exp:25,g:70},{n:"ロックタートル",hp:90,str:10,exp:40,g:85},{n:"シャドウクローラー",hp:75,str:22,exp:50,g:120},{n:"クリスタルハウンド",hp:85,str:25,exp:60,g:300},{n:"地底の這いずる目",hp:55,str:30,exp:45,g:110},{n:"石の守護者",hp:150,str:15,exp:80,g:180},{n:"彷徨う炭鉱夫の霊",hp:80,str:24,exp:55,g:130},{n:"アシッドスライム",hp:50,str:35,exp:40,g:95},{n:"鉄鉱石の精霊",hp:120,str:18,exp:70,g:250},{n:"沈黙の鍾乳石",hp:40,str:40,exp:35,g:80}],
    plains: [{n:"グリフォン",hp:250,str:45,exp:200,g:450},{n:"ミトコンドリア",hp:305,str:50,exp:300,g:500},{n:"スカイイリュージョン",hp:200,str:40,exp:180,g:400},{n:"キラーマンティス",hp:220,str:55,exp:210,g:420},{n:"大草原の覇者",hp:450,str:65,exp:500,g:1200},{n:"ウインドスピリット",hp:180,str:35,exp:150,g:350},{n:"ポイズンフラワー",hp:150,str:70,exp:190,g:380},{n:"サンダーバードの雛",hp:280,str:48,exp:250,g:600},{n:"草原のトカゲ騎士",hp:350,str:42,exp:280,g:550},{n:"狂乱のバイソン",hp:400,str:38,exp:320,g:700},{n:"ミストタイガー",hp:320,str:60,exp:350,g:900},{n:"踊るサボテン",hp:120,str:20,exp:100,g:250}],
    lava: [{n:"サラマンダー",hp:800,str:95,exp:900,g:1800},{n:"フレイムスライム",hp:600,str:80,exp:700,g:1500},{n:"マグマの落とし子",hp:900,str:110,exp:1100,g:2200},{n:"獄炎の猟犬",hp:750,str:120,exp:950,g:1900},{n:"焦熱の骸骨騎士",hp:1100,str:130,exp:1500,g:3500},{n:"爆発する岩石",hp:500,str:200,exp:800,g:1200},{n:"炎の鱗を持つ蛇",hp:850,str:105,exp:1000,g:2000},{n:"灰燼の精霊",hp:700,str:90,exp:850,g:1700},{n:"溶岩を歩く者",hp:1200,str:140,exp:2000,g:5000},{n:"火口の門番",hp:1500,str:160,exp:2500,g:6000},{n:"燻る鉄塊",hp:1000,str:85,exp:1200,g:3000}],
    snow: [{n:"アイスコンドル",hp:3000,str:210,exp:5000,g:8000},{n:"無敵ゴリラ",hp:100000000,str:10000,exp:100000000,g:10000000},{n:"アイスゴーレム",hp:4000,str:400,exp:4000,g:6000}],
    ocean: [{n:"クリオネ",hp:8000,str:450,exp:6000,g:10000},{n:"ダイオウイカ",hp:10000,str:520,exp:8000,g:12000},{n:"ポセイドン",hp:20000,str:680,exp:25000,g:40000},{n:"無敵ゴリラ改",hp:1200000000,str:100000,exp:100000000,g:10000000},{n:"ハリセンボン",hp:10000,str:580,exp:10000,g:20000},{n:"海賊の亡霊",hp:40000,str:800,exp:55000,g:80000},{n:"クリオネα",hp:80000,str:4500,exp:60000,g:100000},{n:"ダイオウイカα",hp:100000,str:5200,exp:80000,g:120000},{n:"ポセイドンα",hp:200000,str:6800,exp:250000,g:400000},{n:"呪いの金貨",hp:20000,str:680,exp:25000,g:30000},{n:"シーサーペント",hp:15000,str:600,exp:15000,g:25000},{n:"深海の歌姫セイレーン",hp:12000,str:700,exp:18000,g:30000},{n:"グレートホワイトシャーク",hp:25000,str:900,exp:30000,g:50000},{n:"沈没船の番兵",hp:35000,str:750,exp:45000,g:70000},{n:"潮流の精霊",hp:18000,str:550,exp:20000,g:35000},{n:"サンゴの巨人",hp:50000,str:400,exp:40000,g:60000},{n:"海溝を這う者",hp:60000,str:1200,exp:55000,g:90000},{n:"大嵐の予兆",hp:70000,str:1500,exp:70000,g:110000},{n:"アビス・レイ",hp:45000,str:1100,exp:50000,g:80000},{n:"漂流する鎧",hp:30000,str:650,exp:25000,g:45000}],
    deep: [{n:"ヒカリイカ",hp:2000000,str:7000,exp:10000,g:520000},{n:"灯火の苔",hp:10000000,str:10000,exp:65000,g:800000},{n:"メデューサ",hp:20000000,str:20000,exp:125000,g:1700000},{n:"ゴキ王",hp:30000000,str:100000,exp:125000,g:1900000},{n:"忘却の海龍",hp:15000000,str:15000,exp:80000,g:1200000},{n:"深淵の目",hp:8000000,str:25000,exp:70000,g:900000},{n:"水没した古騎士",hp:25000000,str:18000,exp:150000,g:2000000},{n:"アビス・ケルピー",hp:12000000,str:30000,exp:100000,g:1500000},{n:"奈落の触手",hp:5000000,str:50000,exp:90000,g:1000000},{n:"古代アンモナイト",hp:18000000,str:12000,exp:110000,g:1600000},{n:"闇を喰らう大口",hp:28000000,str:60000,exp:200000,g:3000000},{n:"無貌の潜水士",hp:10000000,str:40000,exp:130000,g:1800000},{n:"腐敗したクジラ",hp:35000000,str:15000,exp:180000,g:2500000},{n:"冥界の泡",hp:3000000,str:80000,exp:50000,g:800000}],
    wastes: [{n:"ハゲタカの群れ",hp:80000000,str:200000,exp:50000,g:2000000},{n:"月の番人",hp:80000000,str:200000,exp:50000,g:2000000},{n:"アースワーム",hp:100000000,str:300000,exp:80000,g:2500000},{n:"荒野の略奪者",hp:150000000,str:400000,exp:120000,g:5000000},{n:"古の動く石像",hp:250000000,str:500000,exp:200000,g:8000000},{n:"骨だけの恐竜",hp:300000000,str:550000,exp:250000,g:10000000},{n:"ならず者ゴリラ",hp:320000000,str:600000,exp:280000,g:12000000},{n:"砂埃の精霊",hp:350000000,str:650000,exp:300000,g:15000000},{n:"鉄喰いイナゴ",hp:380000000,str:700000,exp:350000,g:18000000},{n:"廃墟の歩行戦車",hp:420000000,str:800000,exp:400000,g:22000000},{n:"荒野の処刑人",hp:500000000,str:1000000,exp:500000,g:30000000},{n:"塵の騎士",hp:120000000,str:350000,exp:90000,g:3000000},{n:"腐肉を狙う狼",hp:90000000,str:450000,exp:100000,g:2800000},{n:"乾いた風の精霊",hp:180000000,str:320000,exp:130000,g:5500000},{n:"錆びた歯車の巨人",hp:400000000,str:250000,exp:400000,g:25000000},{n:"荒野の毒サソリ",hp:140000000,str:500000,exp:150000,g:6000000},{n:"飢えた死神",hp:200000000,str:700000,exp:220000,g:12000000},{n:"石化した巡礼者",hp:350000000,str:400000,exp:300000,g:18000000},{n:"廃村の亡霊",hp:100000000,str:600000,exp:120000,g:4000000},{n:"命を奪う蜃気楼",hp:280000000,str:850000,exp:350000,g:20000000},{n:"沈黙の監視者",hp:450000000,str:500000,exp:450000,g:28000000}],
    desert: [{n:"デザートスコーピオン",hp:500000000,str:1200000,exp:800000,g:35000000},{n:"ミイラ将軍",hp:600000000,str:1500000,exp:1200000,g:45000000},{n:"スフィンクス",hp:800000000,str:2000000,exp:1500000,g:60000000},{n:"アヌビスの番犬",hp:900000000,str:2200000,exp:1800000,g:80000000},{n:"砂漠の暴君ゴリラ",hp:1000000000,str:2500000,exp:2000000,g:100000000},{n:"蜃気楼の龍",hp:1200000000,str:3000000,exp:2500000,g:150000000},{n:"古代王の呪い",hp:1400000000,str:3500000,exp:3000000,g:200000000},{n:"黄金のスカラベ",hp:1600000000,str:4000000,exp:4000000,g:300000000},{n:"流砂の魔人",hp:1800000000,str:4500000,exp:5000000,g:400000000},{n:"砂嵐の支配者",hp:2000000000,str:5000000,exp:10000000,g:500000000},{n:"ファラオの親衛隊",hp:700000000,str:1800000,exp:1300000,g:50000000},{n:"灼熱の砂ヘビ",hp:550000000,str:2100000,exp:1000000,g:40000000},{n:"呪われたパピルス",hp:400000000,str:2800000,exp:900000,g:38000000},{n:"太陽の化身",hp:1500000000,str:3200000,exp:3500000,g:250000000},{n:"黄金のサボテン",hp:650000000,str:1400000,exp:1100000,g:120000000},{n:"砂の暗殺者",hp:450000000,str:4500000,exp:1400000,g:55000000},{n:"オアシスの亡霊",hp:800000000,str:2300000,exp:1600000,g:65000000},{n:"石化した王妃",hp:1100000000,str:2800000,exp:2200000,g:180000000},{n:"砂漠の巡礼者",hp:500000000,str:3500000,exp:1200000,g:48000000},{n:"ピラミッドの核",hp:1900000000,str:2000000,exp:6000000,g:450000000}],
    taiga: [{n:"凍てつく牙の狼",hp:2500000000,str:6000000,exp:12000000,g:600000000},{n:"タイガの大熊",hp:3000000000,str:7000000,exp:15000000,g:800000000},{n:"吹雪の化身",hp:3500000000,str:8000000,exp:20000000,g:1000000000},{n:"銀世界の死神",hp:4000000000,str:9000000,exp:25000000,g:1200000000},{n:"森の聖者ゴリラ",hp:5000000000,str:10000000,exp:30000000,g:1500000000},{n:"凍結した巨像",hp:6000000000,str:12000000,exp:40000000,g:2000000000},{n:"北欧の狂戦士",hp:8000000000,str:15000000,exp:50000000,g:3000000000},{n:"冬の魔女",hp:10000000000,str:20000000,exp:80000000,g:5000000000},{n:"世界樹の番人",hp:15000000000,str:30000000,exp:100000000,g:8000000000},{n:"伝説のフェンリル",hp:20000000000,str:50000000,exp:200000000,g:10000000000},{n:"銀世界の梟",hp:2800000000,str:8500000,exp:18000000,g:900000000},{n:"霜の精霊",hp:2200000000,str:12000000,exp:14000000,g:750000000},{n:"永久凍土の戦士",hp:5500000000,str:10000000,exp:35000000,g:1700000000},{n:"霧の向こうの影",hp:3200000000,str:18000000,exp:28000000,g:1300000000},{n:"凍てつく巨木",hp:7000000000,str:9000000,exp:45000000,g:2500000000},{n:"雪原の豹",hp:4500000000,str:25000000,exp:60000000,g:3500000000},{n:"白銀のトナカイ騎士",hp:9000000000,str:18000000,exp:75000000,g:4500000000},{n:"冷気漂う古の鏡",hp:5000000000,str:30000000,exp:55000000,g:3800000000},{n:"氷の棘を持つ大蛇",hp:8500000000,str:22000000,exp:90000000,g:6000000000},{n:"冬の眠りを守る獣",hp:12000000000,str:35000000,exp:120000000,g:9000000000}],
    goldget: [{n:"金のダイオウイカ",hp:100000000,str:100000,exp:80,g:50000000},{n:"成金ポーク",hp:200000000,str:200000,exp:100,g:100000000},{n:"100億の貯金箱",hp:500000000,str:500000,exp:200,g:500000000},{n:"宝石まみれのゴリラ",hp:1000000000,str:1000000,exp:500,g:1000000000},{n:"石油王",hp:5000000000,str:5000000,exp:1000,g:5000000000},{n:"強欲な徴税官",hp:10000000000,str:10000000,exp:2000,g:10000000000},{n:"バブルの亡霊",hp:50000000000,str:20000000,exp:5000,g:50000000000},{n:"時価総額1兆の怪獣",hp:100000000000,str:50000000,exp:10000,g:100000000000},{n:"宇宙銀行の頭取",hp:500000000000,str:100000000,exp:50000,g:500000000000},{n:"ゴールドおじさん",hp:100000000000000000000000000000,str:10000000000000,exp:10,g:1000000000000000000},{n:"黄金のスライム",hp:80000000,str:50000,exp:50,g:30000000},{n:"幸運のラビット",hp:50000000,str:30000,exp:30,g:20000000},{n:"大商人の馬車",hp:350000000,str:80000,exp:150,g:150000000},{n:"輝くコインの山",hp:150000000,str:40000,exp:100,g:80000000},{n:"欲深いドワーフ",hp:800000000,str:300000,exp:400,g:400000000},{n:"隠された宝箱",hp:20000000,str:10000,exp:20,g:10000000},{n:"富の精霊",hp:2500000000,str:2000000,exp:800,g:2000000000},{n:"宝物庫の自動人形",hp:7000000000,str:8000000,exp:1500,g:8000000000},{n:"伝説の福袋",hp:1000000,str:5000,exp:10,g:1000000},{n:"マハラジャの象",hp:30000000000,str:15000000,exp:3000,g:25000000000}]
};

async function cmdBattle() {
    if(!myData) return;
    if(myData.hp <= 0) return alert("HPがありません！休息してください。");

    const area = document.getElementById('area-select').value;
    const btn = document.getElementById('btn-battle');
    btn.disabled = true;

    const enemy = areaEnemies[area][Math.floor(Math.random() * areaEnemies[area].length)];
    let eHp = enemy.hp;
    let p = myData;

    let log = `<h3>【${area}】 ${enemy.n} (HP:${f(enemy.hp)}) 現る！</h3>`;
    let isWin = false;

    for (let t = 1; t <= 200; t++) {
        let pStr = 8 + p.lv * 4;
        const weaponAtks = {"刀":250,"ロングソード":400,"ダガー":600,"ワイトスレイヤー":50000,"ムラマサ":200000,"ナイフ":100};
        if(p.inventory.weapon) pStr += (weaponAtks[p.inventory.weapon] || 0);

        let dmgMult = 1.0;
        if(p.job === "戦士") dmgMult = 1.1;
        if(p.job === "アーチャー" && Math.random() < 0.3) { dmgMult = 1.2; log += "[クリ] "; }
        if(p.job === "魔法使い" && Math.random() < 0.2) { p.hp = Math.min(Number(p.base_max_hp)*2, p.hp + Math.floor(p.lv/2)); log += "[回] "; }

        let pDmg = Math.floor((Math.random()*pStr+1)*dmgMult);
        eHp = Math.max(0, eHp - pDmg);
        if(eHp <= 0) { isWin = true; break; }

        let eDmg = Math.floor(Math.random()*enemy.str)+1;
        p.hp = Math.max(0, p.hp - eDmg);
        if(p.hp <= 0) break;
    }

    if(isWin) {
        p.exp += enemy.exp; p.gold += enemy.g;
        log += `<br>勝利！ ${f(enemy.exp)}EXP / ${f(enemy.g)}G 獲得！`;
        
        // ドロップ
        if(enemy.n === "ゴブリン" && Math.random() < 0.2) { p.inventory.bag.push("ナイフ"); log += "<br>ナイフGET!"; }
        if(enemy.n === "月の番人" && Math.random() < 0.2) { p.inventory.bag.push("天の羽衣"); log += "<br>天の羽衣GET!"; }

        // レベルアップ
        while(p.exp >= 100 + (p.lv * 50)) {
            p.exp -= (100 + (p.lv * 50));
            p.lv++; p.base_max_hp += 15;
            p.hp = Number(p.base_max_hp);
            log += `<br>LvUP! ${p.lv}`;
        }
    } else {
        log += "<br>敗北または引き分け...";
    }

    await _supabase.from('players').update({hp:p.hp, base_max_hp:p.base_max_hp, lv:p.lv, exp:p.exp, gold:p.gold, inventory:p.inventory}).eq('name', p.name);
    document.getElementById('log').innerHTML = log;
    updateUI();
    setTimeout(()=> btn.disabled = false, 5000);
}

// 休息
async function cmdRest() {
    const armorHPs = { "皮の服": 20, "銅の鎧": 200, "鉄の鎧": 400, "金の鎧": 900, "プラチナの鎧": 2000, "妖精の服": 100000, "天の羽衣": 2000000 };
    let max = Number(myData.base_max_hp) + (armorHPs[myData.inventory.armor] || 0);
    await _supabase.from('players').update({hp: max}).eq('name', myData.name);
    document.getElementById('log').innerText = "全快しました！";
    updateUI();
}

// ショップ
function openYourShop() {
    let html = `<h3>ショップ</h3><div style="text-align:left; background:#111; padding:10px;">`;
    const list = [
        {id:"weapon1",n:"レベルの遺伝子",p:1000},{id:"weapon2",n:"レベルの種",p:3000},{id:"weapon4",n:"レベルの苗",p:16000},
        {id:"weapon5",n:"レベルの花",p:80000},{id:"weapon6",n:"レベルの実",p:800000},{id:"weapon7",n:"レベルの星",p:8000000},
        {id:"katana",n:"刀",p:10000},{id:"leather",n:"皮の服",p:2000},{id:"longsword",n:"ロングソード",p:20000},
        {id:"dagger",n:"ダガー",p:30000},{id:"waitosu",n:"ワイトスレイヤー",p:20000000},{id:"muramasa",n:"ムラマサ",p:800000000},
        {id:"armor_copper",n:"銅の鎧",p:10000},{id:"armor_iron",n:"鉄の鎧",p:20000},{id:"armor_gold",n:"金の鎧",p:40000},
        {id:"armor_plat",n:"プラチナの鎧",p:80000},{id:"armor_fairy",n:"妖精の服",p:20000000},
        {id:"scroll_war",n:"戦士の巻物",p:500000},{id:"scroll_mag",n:"魔法使いの巻物",p:500000},{id:"scroll_arc",n:"アーチャーの巻物",p:500000}
    ];
    list.forEach(i => {
        html += `${i.n} (${f(i.p)}G) <button onclick="buyItem('${i.id}')">購入</button><br>`;
    });
    document.getElementById('log').innerHTML = html + "</div>";
}

async function buyItem(id) {
    const list = [
        {id:"weapon1",n:"レベルの遺伝子",p:1000,lv:1},{id:"weapon2",n:"レベルの種",p:3000,lv:3},{id:"weapon4",n:"レベルの苗",p:16000,lv:20},
        {id:"weapon5",n:"レベルの花",p:80000,lv:100},{id:"weapon6",n:"レベルの実",p:800000,lv:1010},{id:"weapon7",n:"レベルの星",p:8000000,lv:10100},
        {id:"katana",n:"刀",p:10000},{id:"leather",n:"皮の服",p:2000},{id:"longsword",n:"ロングソード",p:20000},
        {id:"dagger",n:"ダガー",p:30000},{id:"waitosu",n:"ワイトスレイヤー",p:20000000},{id:"muramasa",n:"ムラマサ",p:800000000},
        {id:"armor_copper",n:"銅の鎧",p:10000},{id:"armor_iron",n:"鉄の鎧",p:20000},{id:"armor_gold",n:"金の鎧",p:40000},
        {id:"armor_plat",n:"プラチナの鎧",p:80000},{id:"armor_fairy",n:"妖精の服",p:20000000},
        {id:"scroll_war",n:"戦士の巻物",p:500000},{id:"scroll_mag",n:"魔法使いの巻物",p:500000},{id:"scroll_arc",n:"アーチャーの巻物",p:500000}
    ];
    const it = list.find(x => x.id === id);
    if(myData.gold < it.p) return alert("金不足");

    myData.gold -= it.p;
    if(id.startsWith("scroll_")){
        myData.job = (id==="scroll_war"?"戦士":(id==="scroll_mag"?"魔法使い":"アーチャー"));
        myData.hp = Math.floor(myData.hp * 0.8);
    } else if(it.lv){
        myData.lv += it.lv; myData.base_max_hp += (15 * it.lv);
    } else {
        myData.inventory.bag.push(it.n);
    }

    await _supabase.from('players').update({gold:myData.gold, job:myData.job, hp:myData.hp, lv:myData.lv, base_max_hp:myData.base_max_hp, inventory:myData.inventory}).eq('name', myData.name);
    updateUI();
    document.getElementById('log').innerText = "購入完了";
}

// 装備
async function cmdEquip(name) {
    const idx = myData.inventory.bag.indexOf(name);
    myData.inventory.bag.splice(idx, 1);
    const weapons = ["刀","ロングソード","ダガー","ワイトスレイヤー","ムラマサ","ナイフ"];
    if(weapons.includes(name)){
        if(myData.inventory.weapon) myData.inventory.bag.push(myData.inventory.weapon);
        myData.inventory.weapon = name;
    } else {
        if(myData.inventory.armor) myData.inventory.bag.push(myData.inventory.armor);
        myData.inventory.armor = name;
    }
    await _supabase.from('players').update({inventory: myData.inventory}).eq('name', myData.name);
    updateUI();
}

async function cmdUnequip(type) {
    const item = myData.inventory[type];
    if(!item) return;
    myData.inventory.bag.push(item);
    myData.inventory[type] = null;
    await _supabase.from('players').update({inventory: myData.inventory}).eq('name', myData.name);
    updateUI();
}

// レイド
async function refreshRaid() {
    const { data: boss } = await _supabase.from('raid_boss').select('*').eq('id', 1).single();
    const { data: ranks } = await _supabase.from('raid_rank').select('*').order('dmg', {ascending: false}).limit(5);
    const hpPer = (boss.hp / boss.max_hp) * 100;
    document.getElementById('raid-boss-info').innerHTML = `<b>${boss.name}</b> (HP:${f(boss.hp)}/${f(boss.max_hp)})<div class="hp-bar"><div class="hp-fill" style="width:${hpPer}%; background:red;"></div></div>`;
    let rankHtml = "ランク: ";
    ranks?.forEach(r => rankHtml += `${r.player_name}(${f(r.dmg)}) `);
    document.getElementById('raid-damage-rank').innerText = rankHtml;
}

async function cmdRaidChallenge() {
    const now = Date.now();
    if(now - myData.last_raid < 100000) return alert("待機中");
    const { data: boss } = await _supabase.from('raid_boss').select('*').eq('id', 1).single();
    if(boss.hp <= 0) return alert("討伐済");

    let pStr = 8 + myData.lv * 4;
    const weaponAtks = {"刀":250,"ロングソード":400,"ダガー":600,"ワイトスレイヤー":50000,"ムラマサ":200000,"ナイフ":100};
    if(myData.inventory.weapon) pStr += (weaponAtks[myData.inventory.weapon] || 0);
    if(myData.job === "戦士") pStr *= 1.1;

    let dmg = 0;
    for(let i=0; i<10; i++) dmg += Math.floor(Math.random()*pStr)+1;
    let newBossHp = Math.max(0, boss.hp - dmg);
    
    await _supabase.from('raid_boss').update({hp: newBossHp}).eq('id', 1);
    myData.hp = Math.max(0, myData.hp - (Math.floor(Math.random()*boss.str)+1));
    await _supabase.from('players').update({hp: myData.hp, last_raid: now}).eq('name', myData.name);

    // ランキング加算
    const { data: curR } = await _supabase.from('raid_rank').select('*').eq('player_name', myData.name).single();
    if(curR) await _supabase.from('raid_rank').update({dmg: Number(curR.dmg) + dmg}).eq('player_name', myData.name);
    else await _supabase.from('raid_rank').insert([{player_name:myData.name, dmg:dmg}]);

    if(newBossHp <= 0) {
        alert("ボス討伐！報酬配布（自動）");
        // ※報酬配布ロジックは本来サーバーサイド(Edge Functions)推奨ですが、ここでは簡易的にクライアントで行う想定です。
    }
    updateUI();
}

// チャット・ランキング・お知らせ
async function refreshChat() {
    const { data } = await _supabase.from('chat').select('*').order('created_at', {ascending: false}).limit(20);
    let html = "";
    data?.reverse().forEach(c => html += `<div><b>${c.name}</b>: ${c.message}</div>`);
    document.getElementById('chat-box').innerHTML = html;
}
async function cmdSendChat() {
    const msg = document.getElementById('chat-msg-input').value;
    await _supabase.from('chat').insert([{name:myData.name, message:msg}]);
    document.getElementById('chat-msg-input').value = "";
    refreshChat();
}
async function refreshRanking() {
    const { data } = await _supabase.from('players').select('name,lv').order('lv', {ascending: false}).limit(5);
    let html = "";
    data?.forEach((p,i) => html += `<div class="rank-item"><span>${i+1}.${p.name}</span><span>Lv${f(p.lv)}</span></div>`);
    document.getElementById('ranking-list').innerHTML = html;
}
async function refreshNotices() {
    const { data } = await _supabase.from('notices').select('*').order('date', {ascending: false}).limit(5);
    let html = "";
    data?.forEach(n => html += `<div>[${new Date(n.date).toLocaleDateString()}] ${n.text}</div>`);
    document.getElementById('notice-box').innerHTML = html;
}
