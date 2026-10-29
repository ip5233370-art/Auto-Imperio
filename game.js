(() => {
  "use strict";
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) { tg.ready(); tg.expand(); }

  const CATALOG = [
    {id:"compacto",name:"Compacto urbano",emoji:"🚙",condition:82,buy:300,repair:70,resale:470,tag:"Buena oportunidad"},
    {id:"clasico",name:"Clásico de segunda mano",emoji:"🚗",condition:54,buy:420,repair:130,resale:690,tag:"Necesita trabajo"},
    {id:"deportivo",name:"Deportivo usado",emoji:"🏎️",condition:68,buy:650,repair:180,resale:990,tag:"Más potencial"},
    {id:"todoterreno",name:"Todoterreno viejo",emoji:"🚐",condition:42,buy:520,repair:210,resale:880,tag:"Para expertos"},
    {id:"familiar",name:"Familiar económico",emoji:"🚘",condition:91,buy:480,repair:45,resale:650,tag:"Casi listo"}
  ];
  const KEY = "autoImperioSaveV1";
  const fresh = () => ({money:1000,garage:[],profit:0,repairs:0,nextId:1});
  let state = load();
  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY));
      if (parsed && typeof parsed.money === "number" && Array.isArray(parsed.garage)) return parsed;
    } catch (_) {}
    return fresh();
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function fmt(n) { return Math.round(n).toLocaleString("es-ES"); }
  function el(id) { return document.getElementById(id); }
  function toast(msg) {
    const node = el("toast"); node.textContent = msg; node.classList.add("show");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove("show"), 2400);
  }
  function render() {
    el("money").textContent = fmt(state.money);
    el("carCount").textContent = state.garage.length;
    el("profit").textContent = fmt(state.profit);
    el("repairs").textContent = state.repairs;
    renderMarket(); renderGarage();
  }
  function renderMarket() {
    el("marketList").innerHTML = CATALOG.map(car => `
      <article class="car-card">
        <div class="car-art">${car.emoji}</div>
        <div class="car-info">
          <div class="car-title"><h3>${car.name}</h3><span class="badge">${car.condition}%</span></div>
          <div class="car-meta"><span>🔧 Reparación: ${fmt(car.repair)}</span><span>💵 Venta: ${fmt(car.resale)}</span></div>
          <div class="price-row"><span class="price">${fmt(car.buy)} 🪙</span><button class="btn" data-buy="${car.id}" ${state.money < car.buy ? "disabled" : ""}>Comprar</button></div>
        </div>
      </article>`).join("");
    el("marketList").querySelectorAll("[data-buy]").forEach(btn => btn.addEventListener("click", () => buyCar(btn.dataset.buy)));
  }
  function renderGarage() {
    const host = el("garageList");
    if (!state.garage.length) {
      host.innerHTML = '<div class="empty"><span>🅿️</span><strong>Tu garaje está vacío</strong><br>Ve al Mercado y compra tu primer auto.</div>'; return;
    }
    host.innerHTML = state.garage.map(car => {
      const profitIfSold = car.resale - car.buy - (car.repaired ? car.repair : 0);
      return `<article class="car-card">
        <div class="car-art">${car.emoji}</div>
        <div class="car-info">
          <div class="car-title"><h3>${car.name}</h3><span class="badge">${car.repaired ? "Reparado" : car.condition + "% estado"}</span></div>
          <div class="car-meta"><span>Compra: ${fmt(car.buy)}</span><span>Venta: ${fmt(car.resale)}</span></div>
          <div class="price-row">
            ${car.repaired ? `<span class="price">Beneficio: ${profitIfSold >= 0 ? "+" : ""}${fmt(profitIfSold)} 🪙</span>` : `<button class="btn secondary" data-repair="${car.uid}" ${state.money < car.repair || car.repaired ? "disabled" : ""}>🔧 Reparar ${fmt(car.repair)}</button>`}
            <button class="btn" data-sell="${car.uid}">Vender</button>
          </div>
        </div>
      </article>`;
    }).join("");
    host.querySelectorAll("[data-repair]").forEach(btn => btn.addEventListener("click", () => repairCar(Number(btn.dataset.repair))));
    host.querySelectorAll("[data-sell]").forEach(btn => btn.addEventListener("click", () => sellCar(Number(btn.dataset.sell))));
  }
  function buyCar(id) {
    const car = CATALOG.find(c => c.id === id);
    if (!car || state.money < car.buy) return toast("No tienes suficientes monedas.");
    state.money -= car.buy;
    state.garage.push({...car,uid:state.nextId++,repaired:false});
    save(); render(); toast(`¡Compraste: ${car.name}!`);
  }
  function repairCar(uid) {
    const car = state.garage.find(c => c.uid === uid);
    if (!car || car.repaired) return;
    if (state.money < car.repair) return toast("No tienes suficientes monedas para reparar.");
    state.money -= car.repair; car.repaired = true; state.repairs++;
    save(); render(); toast("Auto reparado. ¡Ya puedes venderlo!");
  }
  function sellCar(uid) {
    const i = state.garage.findIndex(c => c.uid === uid);
    if (i < 0) return;
    const car = state.garage[i];
    const totalCost = car.buy + (car.repaired ? car.repair : 0);
    const gain = car.resale - totalCost;
    state.money += car.resale; state.profit += gain;
    state.garage.splice(i,1); save(); render();
    toast(gain >= 0 ? `Auto vendido. Beneficio: ${fmt(gain)} monedas.` : `Auto vendido. Resultado: ${fmt(gain)} monedas.`);
  }
  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === btn));
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === btn.dataset.tab));
  }));
  el("resetBtn").addEventListener("click", () => {
    if (confirm("¿Seguro que quieres reiniciar la demo y perder tu progreso local?")) {
      state = fresh(); save(); render(); toast("Demo reiniciada.");
    }
  });
  render();
})();