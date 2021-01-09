import { initRollChanges } from "./rolls/roll.js";

import initItemClass from "./item/entity.js";
import initActorClass from "./actor/entity.js";

import Mars5eMessage from "./chat/message.js";

import templateAutotargeting from "./item/ability-template.js";

import Mars5eUserStatistics from "./statistics.js";

import { initConfetti } from "./util.js";
import { TweenMax } from "/scripts/greensock/esm/all.js";

Hooks.on("init", () => {
  window["mars5e"] = {};
  const MarsItem5e = initItemClass();
  CONFIG.Item.entityClass = MarsItem5e;
  const MarsActor5e = initActorClass();
  CONFIG.Actor.entityClass = MarsActor5e;

  Mars5eMessage.init();

  const advDiv = document.createElement("div");
  advDiv.dataset.advantage = 1;
  advDiv.style.zIndex = 9999;
  advDiv.style.display = "none";
  advDiv.classList.add("mars5e-adv-div");
  mars5e.advDiv = advDiv;
  document.body.appendChild(advDiv);

  mars5e.getAdvantage = () => {
    const ret = {
      advantage: mars5e.advDiv.dataset.advantage === "2",
      disadvantage: mars5e.advDiv.dataset.advantage === "0",
    };
    mars5e.advDiv.dataset.advantage = 1;
    return ret;
  };
  const classList = ".item .item-name, .ability,  .skill, .macro";
  let tween = TweenMax.to(mars5e.advDiv, 1, {
    onComplete: () => {
      mars5e.advDiv.classList.add("mars5e-show-hint");
    },
  });
  Hooks.on("renderActorSheet", (app, html, options) => {
    html[0].addEventListener(
      "contextmenu",
      (ev) => {
        const target = ev.target.closest(classList);
        if (!target) return;

        ev.preventDefault();
        ev.stopPropagation();
        mars5e.advDiv.dataset.advantage =
          (Number(mars5e.advDiv.dataset.advantage) + 1) % 3;
        tween.kill();
      },
      true
    );
    html[0].addEventListener(
      "mouseenter",
      (ev) => {
        const target = ev.target.closest(classList);
        if (!target) return;
        const isTidyGridLayout = target.closest(".grid-layout");
        const rect = target.getBoundingClientRect();
        mars5e.advDiv.style.top = rect.top + "px";
        // Tidy5e Compat: Always show on the right side if its grid layout
        if (rect.left < 50 || isTidyGridLayout) {
          mars5e.advDiv.style.left = rect.right + "px";
          mars5e.advDiv.style.right = null;
          mars5e.advDiv.classList.add("right");
        } else {
          mars5e.advDiv.style.right =
            window.innerWidth - rect.right + rect.width + "px";
          mars5e.advDiv.style.left = null;
          mars5e.advDiv.classList.remove("right");
        }
        mars5e.advDiv.style.display = "flex";
        mars5e.advDiv.style.height = rect.height + "px";
        tween.restart();
      },
      true
    );
    html[0].addEventListener(
      "mouseleave",
      (ev) => {
        const target = ev.target.closest(classList);
        if (!target) return;
        mars5e.advDiv.style.display = null;
        mars5e.advDiv.classList.remove("mars5e-show-hint");
        tween.kill();
      },
      true
    );
  });

  Hooks.on("renderHotbar", (app, html, options) => {
    html[0].addEventListener(
      "contextmenu",
      (ev) => {
        const target = ev.target.closest(classList);
        if (!target) return;
        mars5e.advDiv.dataset.advantage =
          (Number(mars5e.advDiv.dataset.advantage) + 1) % 3;
        tween.kill();
      },
      true
    );
    html[0].addEventListener(
      "mouseenter",
      (ev) => {
        const target = ev.target.closest(classList);
        if (!target) return;
        const rect = target.getBoundingClientRect();
        mars5e.advDiv.style.top = rect.bottom - 22 + "px";
        mars5e.advDiv.style.left = rect.left + "px";
        mars5e.advDiv.style.right = null;
        mars5e.advDiv.style.display = "flex";
        tween.restart();
      },
      true
    );
    html[0].addEventListener(
      "mouseleave",
      (ev) => {
        const target = ev.target.closest(classList);
        if (!target) return;
        mars5e.advDiv.style.display = null;
        mars5e.advDiv.classList.remove("mars5e-show-hint");
        tween.kill();
      },
      true
    );
  });
});
initRollChanges();

Hooks.on("renderChatMessage", async (app, html, options) => {
  // const sender = html[0].querySelector(".message-sender");
  // // if (!game.user.isGM) {
  // const div = html[0].querySelector("[data-token-id]");
  // const div = html[0].querySelector("[data-actor-id]");
  // if (div && !isTokenViewable(div))
  //   html[0].querySelector(".message-sender").innerText = replacementName;
  // if (!div) {
  //   const actorId = html[0].querySelector("[data-actor-id]")?.dataset.actorId;
  //   if (actorId) {
  //     const actor = game.actors.get(actorId);
  //     if (actor?.permission < CONST.ENTITY_PERMISSIONS.LIMITED)
  //       html[0].querySelector(".message-sender").innerText = replacementName;
  //   }
  // }
  // html[0].querySelectorAll("[data-target-id]").forEach((e) => {});
  // // }

  // Only color one border, not the whole border...
  if (html[0].style.borderColor) {
    html[0].style.borderColor = null;
    // html[0].style.borderRightColor = app.user.color;
    html[0].style.borderTopColor = app.user.color;
  } else html[0].style.borderLeftColor = app.user.color;
});

Hooks.on("init", () => {
  loadTemplates([
    "modules/mars-5e/html/chat/targets.hbs",
    "modules/mars-5e/html/chat/dmg.hbs",
  ]);
  Mars5eUserStatistics.initHooks();
});

Hooks.on("ready", async () => {
  const translationData = {
    toggle: game.i18n.localize("MARS5E.tool-tip.toggle"),
    "right-click": game.i18n.localize("MARS5E.tool-tip.right-click"),
  };
  const data = {
    toggleResistanceTooltip: game.i18n.format(
      "MARS5E.tool-tip.toggle-resistance",
      translationData
    ),
    toggleSuccessTooltip: game.i18n.format(
      "MARS5E.tool-tip.success",
      translationData
    ),
    toggleAdvantageTooltip: game.i18n.format("MARS5E.tool-tip.advantage"),
  };
  document.head.insertAdjacentHTML(
    "beforeend",
    await renderTemplate("modules/mars-5e/html/definitions.hbs", data)
  );
  templateAutotargeting();
  initConfetti();
  registerSettings();
});

function registerSettings() {
  game.settings.register("mars-5e", "auto-roll-hit", {
    name: "MARS5E.settings.autoRoll.hit.name",
    hint: "MARS5E.settings.autoRoll.hit.hint",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
    onChange: (data) => {
      window.mars5e.autoRoll.hit = data;
    },
  });
  game.settings.register("mars-5e", "auto-roll-dmg", {
    name: "MARS5E.settings.autoRoll.dmg.name",
    hint: "MARS5E.settings.autoRoll.dmg.hint",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
    onChange: (data) => {
      window.mars5e.autoRoll.dmg = data;
    },
  });

  window.mars5e.autoRoll = {
    hit: game.settings.get("mars-5e", "auto-roll-hit"),
    dmg: game.settings.get("mars-5e", "auto-roll-dmg"),
  };
  if (!game.user.isGM) return;
  game.settings.register("mars-5e", "invisible-target", {
    name: "MARS5E.settings.invisibleTarget.name",
    hint: "MARS5E.settings.invisibleTarget.hint",
    scope: "client",
    config: true,
    default: true,
    type: Boolean,
    onChange: (data) => {
      window.mars5e.invisibleTarget = data;
    },
  });

  window.mars5e.invisibleTarget = game.settings.get(
    "mars-5e",
    "invisible-target"
  );
}
