
(() => {
"use strict";

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const CARS = [
  {id:"city",name:"Compacto urbano",emoji:"🚙",condition:88,buy:280,repair:55,resale:440,tag:"Buena oportunidad"},
  {id:"classic",name:"Clásico de segunda",emoji:"🚗",condition:52,buy:390,repair:125,resale:650,tag:"Necesita trabajo"},
  {id:"sport",name:"Deportivo usado",emoji:"🏎️",condition:66,buy:620,repair:170,resale:960,tag:"Alto potencial"},
  {id:"suv",name:"Todoterreno viejo",emoji:"🚐",condition:43,buy:500,repair:190,resale:850,tag:"Para expertos"},
  {id:"family",name:"Familiar económico",emoji:"🚘",condition:92,buy:450,repair:40,resale:610,tag:"Casi listo"},
  {id:"pickup",name:"Pickup de trabajo",emoji:"🛻",condition:59,buy:560,repair:145,resale:820,tag:"Buen negocio"}
];

const KEY = "autoImperioSaveV2";

const fresh = () => ({
  money:1000,
  garage:[],
  profit:0,
  repairs:0,
  nextId:1,
  toolLevel:0,
  shopLevel:0,
  businessName:"",
  marketOffers:[]
});

let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));

    if (
      saved &&
      typeof saved.money === "number" &&
      Array.isArray(saved.garage)
    ) {
      return {...fresh(), ...saved};
    }
  } catch (error) {}

  return fresh();
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    toast("No se pudo guardar en este dispositivo.");
  }
}

const $ = id => document.getElementById(id);

const fmt = number =>
  Math.round(number).toLocaleString("es-ES");

function toast(message) {
  const element = $("toast");

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    element.classList.remove("show");
  }, 2300);
}

function repairCost(car) {
  return Math.max(
    10,
    Math.round(car.repair * (1 - state.toolLevel * 0.15))
  );
}

function capacity() {
  return 2 + state.shopLevel * 2;
}

/* Crear precios variables para el mercado */
function makeOffers() {
  state.marketOffers = CARS.map(car => ({
    id:car.id,
    offerPrice:Math.max(
      1,
      Math.round(car.buy * (0.88 + Math.random() * 0.25))
    ),
    offerResale:Math.max(
      1,
      Math.round(car.resale * (0.94 + Math.random() * 0.13))
    )
  }));

  save();
}

function getOffer(car) {
  return state.marketOffers.find(
    offer => offer.id === car.id
  );
}

function ensureOffers() {
  if (
    !Array.isArray(state.marketOffers) ||
    state.marketOffers.length !== CARS.length ||
    CARS.some(car =>
      !state.marketOffers.some(offer => offer.id === car.id)
    )
  ) {
    makeOffers();
  }
}

function render() {
  ensureOffers();

  $("money").textContent = fmt(state.money);

  $("carCount").textContent =
    state.garage.length + "/" + capacity();

  $("profit").textContent = fmt(state.profit);
  $("repairs").textContent = state.repairs;

  renderMarket();
  renderGarage();
  renderUpgrades();

  $("businessName").value = state.businessName;

  $("businessStatus").textContent =
    state.businessName
      ? `¡${state.businessName} está en marcha!`
      : "Tu negocio empieza con 1.000 monedas.";
}

/* Mercado con precios variables */
function renderMarket() {
  const host = $("marketList");

  host.innerHTML = `
    <div class="notice" style="margin:0 0 10px;grid-column:1/-1">
      <strong>📊 Mercado variable</strong>
      <p>
        Los precios cambian cuando renuevas las ofertas.
        Compara el costo de compra y reparación con
        el valor estimado de venta.
      </p>
      <button class="btn secondary" id="refreshMarket"
        style="margin-top:9px">
        🔄 Renovar mercado · 25 monedas
      </button>
    </div>
  ` + CARS.map(car => {
    const offer = getOffer(car);
    const cost = repairCost(car);

    const estimatedGain =
      offer.offerResale - offer.offerPrice - cost;

    return `
      <article class="car-card">
        <div class="car-art">${car.emoji}</div>

        <div class="car-info">
          <div class="car-title">
            <h3>${car.name}</h3>
            <span class="badge">
              ${car.condition}% · ${car.tag}
            </span>
          </div>

          <div class="car-meta">
            <span>🔧 Reparar: ${fmt(cost)}</span>
            <span>💵 Venta estimada: ${fmt(offer.offerResale)}</span>
          </div>

          <div class="price-row">
            <span class="price">
              ${fmt(offer.offerPrice)} 🪙
            </span>

            <button class="btn"
              data-buy="${car.id}"
              ${state.money < offer.offerPrice ||
                state.garage.length >= capacity()
                ? "disabled"
                : ""}>
              Comprar
            </button>
          </div>

          <div class="car-meta">
            Ganancia estimada reparándolo:
            ${estimatedGain >= 0 ? "+" : ""}${fmt(estimatedGain)}
            monedas
          </div>
        </div>
      </article>
    `;
  }).join("");

  $("refreshMarket").onclick = () => {
    if (state.money < 25) {
      return toast(
        "Necesitas 25 monedas para renovar el mercado."
      );
    }

    state.money -= 25;

    makeOffers();
    render();

    toast("¡El mercado tiene nuevas ofertas!");
  };

  host.querySelectorAll("[data-buy]").forEach(button => {
    button.onclick = () =>
      buyCar(button.dataset.buy);
  });
}

/* Garaje */
function renderGarage() {
  const host = $("garageList");

  if (!state.garage.length) {
    host.innerHTML = `
      <div class="empty">
        <span>🅿️</span>
        <strong>Tu garaje está vacío</strong>
        <br>
        Compra tu primer vehículo en el Mercado.
      </div>
    `;

    return;
  }

  host.innerHTML = state.garage.map(car => {
    const cost = repairCost(car);

    const gain =
      car.resale -
      car.buy -
      (car.repaired ? cost : 0);

    return `
      <article class="car-card">
        <div class="car-art">${car.emoji}</div>

        <div class="car-info">
          <div class="car-title">
            <h3>${car.name}</h3>

            <span class="badge">
              ${car.repaired
                ? "Reparado"
                : car.condition + "% estado"}
            </span>
          </div>

          <div class="car-meta">
            <span>Compra: ${fmt(car.buy)}</span>
            <span>Venta: ${fmt(car.resale)}</span>
          </div>

          <div class="price-row">
            ${
              car.repaired
                ? `<span class="price">
                    Ganancia: ${gain >= 0 ? "+" : ""}${fmt(gain)} 🪙
                   </span>`
                : `<button class="btn secondary"
                    data-repair="${car.uid}"
                    ${state.money < cost ? "disabled" : ""}>
                    🔧 Reparar ${fmt(cost)}
                   </button>`
            }

            <button class="btn" data-sell="${car.uid}">
              Vender
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  host.querySelectorAll("[data-repair]").forEach(button => {
    button.onclick = () =>
      repairCar(Number(button.dataset.repair));
  });

  host.querySelectorAll("[data-sell]").forEach(button => {
    button.onclick = () =>
      sellCar(Number(button.dataset.sell));
  });
}

/* Mejoras del taller */
function renderUpgrades() {
  const toolCost = 500 * (state.toolLevel + 1);
  const shopCost = 700 * (state.shopLevel + 1);

  $("upgradeList").innerHTML = `
    <article class="upgrade-card">
      <div class="upgrade-icon">🧰</div>

      <div>
        <h3>
          Herramientas mejoradas · Nivel ${state.toolLevel}
        </h3>

        <p>
          Cada nivel reduce un 15% el costo de reparación.
          Ahorro acumulable.
        </p>

        <button class="btn" id="toolUpgrade"
          ${state.money < toolCost ? "disabled" : ""}>
          Mejorar · ${fmt(toolCost)} 🪙
        </button>
      </div>
    </article>

    <article class="upgrade-card">
      <div class="upgrade-icon">🏢</div>

      <div>
        <h3>
          Ampliar taller · Nivel ${state.shopLevel}
        </h3>

        <p>
          Aumenta en 2 los espacios disponibles
          para guardar vehículos.
        </p>

        <button class="btn" id="shopUpgrade"
          ${state.money < shopCost ? "disabled" : ""}>
          Ampliar · ${fmt(shopCost)} 🪙
        </button>
      </div>
    </article>
  `;

  $("toolUpgrade").onclick = () => {
    if (state.money < toolCost) return;

    state.money -= toolCost;
    state.toolLevel++;

    save();
    render();

    toast("¡Herramientas mejoradas!");
  };

  $("shopUpgrade").onclick = () => {
    if (state.money < shopCost) return;

    state.money -= shopCost;
    state.shopLevel++;

    save();
    render();

    toast("¡Taller ampliado!");
  };
}

/* Comprar vehículo al precio de la oferta */
function buyCar(id) {
  const car = CARS.find(item => item.id === id);
  const offer = car && getOffer(car);

  if (
    !car ||
    !offer ||
    state.money < offer.offerPrice ||
    state.garage.length >= capacity()
  ) {
    return toast("No puedes comprar ese auto ahora.");
  }

  state.money -= offer.offerPrice;

  state.garage.push({
    ...car,
    buy:offer.offerPrice,
    resale:offer.offerResale,
    uid:state.nextId++,
    repaired:false
  });

  save();
  render();

  toast("¡Auto comprado al precio de la oferta!");
}

/* Reparar vehículo */
function repairCar(uid) {
  const car = state.garage.find(
    item => item.uid === uid
  );

  if (!car || car.repaired) return;

  const cost = repairCost(car);

  if (state.money < cost) {
    return toast("No tienes monedas suficientes.");
  }

  state.money -= cost;
  car.repaired = true;
  state.repairs++;

  save();
  render();

  toast("¡Auto reparado!");
}

/* Vender vehículo */
function sellCar(uid) {
  const index = state.garage.findIndex(
    item => item.uid === uid
  );

  if (index < 0) return;

  const car = state.garage[index];

  const cost = car.repaired
    ? repairCost(car)
    : 0;

  const gain =
    car.resale - car.buy - cost;

  state.money += car.resale;
  state.profit += gain;

  state.garage.splice(index, 1);

  save();
  render();

  toast(
    `Auto vendido. Resultado: ${
      gain >= 0 ? "+" : ""
    }${fmt(gain)} monedas.`
  );
}

/* Navegación */
document.querySelectorAll(".tab").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.classList.toggle("active", tab === button);
    });

    document.querySelectorAll(".panel").forEach(panel => {
      panel.classList.toggle(
        "active",
        panel.id === button.dataset.tab
      );
    });
  };
});

/* Nombre del negocio */
$("saveBusiness").onclick = () => {
  state.businessName =
    $("businessName").value.trim().slice(0, 28);

  save();
  render();

  toast("Nombre del negocio guardado.");
};

/* Reiniciar partida */
$("resetBtn").onclick = () => {
  if (
    confirm(
      "¿Reiniciar el juego y borrar el progreso guardado en este dispositivo?"
    )
  ) {
    state = fresh();

    makeOffers();
    save();
    render();

    toast("Partida reiniciada.");
  }
};

/* Exportar progreso */
$("exportBtn").onclick = () => {
  const data = JSON.stringify(state, null, 2);

  const blob = new Blob(
    [data],
    {type:"application/json"}
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "auto-imperio-progreso.json";

  link.click();

  URL.revokeObjectURL(url);

  toast("Copia de progreso descargada.");
};

ensureOffers();
save();
render();

})();
