const timeDiff = 1000 * 60 * 60 * 6; // 6 hours

export default class Mars5eUserStatistics {
  static async update(user, data) {
    //property, amount) {
    let statistics = duplicate(user.getFlag("mars-5e", "statistics") || {});

    const oldTime = statistics.session?.timestamp || 0;

    // If more than timeDiff passed since last timestamp, start a new session
    if (Date.now() - oldTime > timeDiff) this.reset(statistics.session);

    let update = false;
    for (const type of ["session", "world"]) {
      for (let [property, amount] of Object.entries(data)) {
        if (amount === 0) continue;
        const propertyString = `${type}.${property}`;
        let tmp = getProperty(statistics, propertyString) || 0;
        tmp += amount;
        setProperty(statistics, propertyString, tmp);
        update = true;
      }
    }
    if (!update) return;
    setProperty(statistics, `session.timestamp`, Date.now());
    // console.log(statistics, data);
    user.setFlag("mars-5e", "statistics", statistics);
  }

  static reset(statistics = {}) {
    for (const key in statistics || {}) statistics[key] = 0;
  }

  static getD20Statistics(dice, statistics = { nat1: 0, nat20: 0 }) {
    const max = dice.faces;
    for (let result of dice.results) {
      if (result.result === 1) statistics.nat1++;
      if (result.result === dice.faces) statistics.nat20++;
    }
    return statistics;
  }

  static initHooks() {
    // Hooks.on("preUpdateToken", (scene, token, updateData, diff, userId) => {
    // //   this.onHpChange(token.actor, updateData);
    // // });
    // // onyl needed for actors, since only linked tokens are supposed to represent player characters....
    // Hooks.on("updateActor", (actor, udata, options, userId) => {
    //   if (game.user.character?.id !== actor.id) return;
    //   this.onHpChange(actor, udata);
    // });
    game.settings.register("mars-5e", "hide-statistics-btn", {
      name: "MARS5E.settings.hidesStatisticsBtn.name",
      hint: "MARS5E.settings.hidesStatisticsBtn.hint",
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
    });

    Hooks.on("renderPlayerList", (app, html, options) => {
      if (
        !game.user.isGM &&
        game.settings.get("mars-5e", "hide-statistics-btn")
      )
        return;
      const header = html[0].querySelector("h3");

      const btn = document.createElement("a");
      btn.insertAdjacentHTML("beforeend", '<i class="fas fa-chart-pie"></i>');

      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        if (!mars5e.statisticsApp) mars5e.statisticsApp = new StatisticsApp();

        if (mars5e.statisticsApp.rendered) mars5e.statisticsApp.close();
        else mars5e.statisticsApp.render(true);
      });

      header.appendChild(btn);
    });

    Hooks.on("updateUser", () => {
      mars5e.statisticsApp?.render();
    });
  }

  static showStatisticsApp() {
    if (!mars5e.statisticsApp) mars5e.statisticsApp = new StatisticsApp();
    mars5e.statisticsApp.render(true);
  }

  static async resetAll() {
    for (let user of game.users) {
      await user.unsetFlag("mars-5e", "statistics");
    }
  }
}

class StatisticsApp extends Application {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: "mars5e-statistics-app",
      title: game.i18n.localize("MARS5E.statistics.title"),
      template: "modules/mars-5e/html/statistics.hbs",
      classes: ["mars-5e-statistics"],
      tabs: [
        {
          navSelector: ".tabs",
          contentSelector: ".content",
          initial: "session",
        },
      ],
      width: 620,
      height: "auto",
      popOut: true,
    };
  }

  get statisticsTracked() {
    return Object.keys(this.defaultStatistics);
  }

  get defaultStatistics() {
    return {
      dmgDone: 0,
      dmgTaken: 0,
      healingDone: 0,
      attacks: 0,
      hits: 0,
      kills: 0,
      nat1: 0,
      nat20: 0,
      unconscious: 0,
    };
  }

  getData() {
    let data = super.getData();
    data.user = game.users
      .filter((e) => !e.isGM)
      .map((user) => {
        const statistics = user.getFlag("mars-5e", "statistics");

        let ret = {
          world: mergeObject(this.defaultStatistics, statistics?.world),
          session: mergeObject(this.defaultStatistics, statistics?.session),
          name: user.name,
          char: user.character?.name,
          isGM: user.isGM,
        };
        delete ret.session.timestamp;
        return ret;
      });
    data.duration = ["world", "session"];

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    const table = html[0].querySelector("table");
    table.addEventListener("click", (ev) => {
      const target = ev.target.closest("th");
      if (!target || !target.parentNode.previousElementSibling) return;
      ev.preventDefault();
      ev.stopPropagation();

      const idx = Array.from(target.parentNode.children).indexOf(target);

      const sortDirection =
        ((Number(target.dataset.sortDirection) || 0) + 1) % 2;
      for (const child of target.parentNode.children) {
        child.dataset.sortDirection = -1;
      }

      const table = target.closest("table");
      const rows = Array.from(table.querySelectorAll("tr.tab"));
      rows.sort((a, b) => {
        const aVal = a.children[idx].innerText.trim(),
          bVal = b.children[idx].innerText.trim();

        const mult = sortDirection === 1 ? -1 : 1;
        if (aVal < bVal) return mult;
        else if (aVal > bVal) return mult * -1;
        else return 0;
      });
      target.dataset.sortDirection = sortDirection;

      for (const row of rows) table.appendChild(row);
    });

    const th = table.querySelector("tr:nth-child(2) th");
    th.dispatchEvent(
      new Event("click", {
        bubbles: true,
        target: th,
      })
    );
  }

  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    if (!game.user.isGM) return buttons;

    buttons.unshift({
      label: "JOURNAL.ActionShow",
      class: "share-image",
      icon: "fas fa-eye",
      onclick: (ev) => {
        game.socket.emit("module.mars-5e", { type: "showStatisticsApp" });
      },
    });

    buttons.unshift({
      label: "MARS5E.statistics.headerButtons.reset.label",
      class: "reset-statistics",
      icon: "fas fa-redo",
      onclick: (ev) => {
        new Dialog({
          title: game.i18n.localize(
            "MARS5E.statistics.headerButtons.reset.menu.title"
          ),
          content: `<p>${game.i18n.localize(
            "MARS5E.statistics.headerButtons.reset.menu.description"
          )}</p>`,
          buttons: {
            yes: {
              icon: '<i class="fas fa-check"></i>',
              label: "Yes",
              callback: () => Mars5eUserStatistics.resetAll(),
            },
            no: {
              icon: '<i class="fas fa-times"></i>',
              label: "No",
            },
          },
        }).render(true);
      },
    });

    return buttons;
  }
}
