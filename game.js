
(() => {
"use strict";

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const CARS = [
  {
    id: "city",
    name: "Compacto urbano",
    emoji: "🚙",
    condition: 88,
    buy: 280,
    repair: 55,
    resale: 440,
    tag: "Buena oportunidad"
  },
  {
    id: "classic",
    name: "Clásico de segunda",
    emoji: "🚗",
    condition: 52,
    buy: 390,
    repair: 125,
    resale: 650,
    tag: "Necesita trabajo"
  },
  {
    id: "sport",
    name: "Deportivo usado",
    emoji: "🏎️",
    condition: 66,
    buy: 620,
    repair: 170,
    resale: 960,
    tag: "Alto potencial"
  },
  {
    id: "suv",
    name: "Todoterreno viejo",
    emoji: "🚐",
    condition: 43,
    buy: 500,
    repair: 190,
    resale: 850,
    tag: "Para expertos"
  },
  {
    id: "family",
    name: "Familiar económico",
    emoji: "🚘",
    condition: 92,
    buy: 450,
    repair: 40,
    resale: 610,
    tag: "Casi listo"
  },
  {
    id: "pickup",
    name: "Pickup de trabajo",
    emoji: "🛻",
    condition: 59,
    buy: 560,
    repair: 145,
    resale: 820,
    tag: "Buen negocio"
  }
];

const KEY = "autoImperioSaveV2";

const fresh = () => ({
  money: 1000,
  garage: [],
  profit: 0,
  repairs: 0,
  nextId: 1,
  toolLevel: 0,
  shopLevel: 0,
  businessName: ""
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
      return {
        ...fresh(),
        ...saved
      };
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

function render() {
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

function renderMarket() {
  $("marketList").innerHTML = CARS.map(car => `
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
          <span>🔧 Reparar: ${fmt(repairCost(car))}</span>
          <span>💵 Venta: ${fmt(car.resale)}</span>
        </div>

        <div class="price-row">
          <span class="price">${fmt(car.buy)} 🪙</span>

          <button
            class="btn"
            data-buy="${car.id}"
            ${state.money < car.buy ||
              state.garage.length >= capacity()
              ? "disabled"
              : ""}
          >
            Comprar
          </button>
        </div>
      </div>
    </article>
  `).join("");

  $("marketList")
    .querySelectorAll("[data-buy]")
    .forEach(button => {
      button.onclick = () => buyCar(button.dataset.buy);
    });
}

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
                    Ganancia: ${gain >= 0 ? "+" : ""}${fmt(gain)}
                    🪙
                   </span>`
                : `<button
                    class="btn secondary"
                    data-repair="${car.uid}"
                    ${state.money < cost ? "disabled" : ""}
                   >
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

        <button
          class="btn"
          id="toolUpgrade"
          ${state.money < toolCost ? "disabled" : ""}
        >
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

        <button
          class="btn"
          id="shopUpgrade"
          ${state.money < shopCost ? "disabled" : ""}
        >
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

function buyCar(id) {
  const car = CARS.find(item => item.id === id);

  if (
    !car ||
    state.money < car.buy ||
    state.garage.length >= capacity()
  ) {
    return toast("No puedes comprar ese auto ahora.");
  }

  state.money -= car.buy;

  state.garage.push({
    ...car,
    uid: state.nextId++,
    repaired: false
  });

  save();
  render();

  toast("¡Auto comprado!");
}

function repairCar(uid) {
  const car = state.garage.find(item => item.uid === uid);

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

function sellCar(uid) {
  const index = state.garage.findIndex(
    item => item.uid === uid
  );

  if (index < 0) return;

  const car = state.garage[index];

  const cost = car.repaired
    ? repairCost(car)
    : 0;

  const gain = car.resale - car.buy - cost;

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

$("saveBusiness").onclick = () => {
  state.businessName =
    $("businessName").value.trim().slice(0, 28);

  save();
  render();

  toast("Nombre del negocio guardado.");
};

$("resetBtn").onclick = () => {
  if (
    confirm(
      "¿Reiniciar el juego y borrar el progreso guardado en este dispositivo?"
    )
  ) {
    state = fresh();

    save();
    render();

    toast("Partida reiniciada.");
  }
};

$("exportBtn").onclick = () => {
  const data = JSON.stringify(state, null, 2);

  const blob = new Blob(
    [data],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "auto-imperio-progreso.json";

  link.click();

  URL.revokeObjectURL(url);

  toast("Copia de progreso descargada.");
};

render();

})();
