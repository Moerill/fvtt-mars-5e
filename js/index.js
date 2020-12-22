import { initRollChanges } from "./rolls/roll.js";

import initItemClass from "./item/entity.js";
import initActorClass from "./actor/entity.js";

import Mars5eMessage from "./chat/message.js";

const replacementName = "???";
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
    return {
      advantage: mars5e.advDiv.dataset.advantage === "2",
      disadvantage: mars5e.advDiv.dataset.advantage === "0",
    };
  };
  const classList =
    ".item .item-name, .ability-name, .ability-mod, .ability-save, .ability-title, .skill, .macro";
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
        const rect = target.getBoundingClientRect();
        mars5e.advDiv.style.top = rect.top + "px";
        if (rect.left < 50) {
          mars5e.advDiv.style.left = rect.right + "px";
          mars5e.advDiv.style.right = null;
        } else {
          mars5e.advDiv.style.right =
            window.innerWidth - rect.right + rect.width + "px";
          mars5e.advDiv.style.left = null;
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
        console.log(rect);
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

function isTokenViewable(div) {
  const sceneId = div.closest("mars-card")?.dataset.sceneId;
  const tokenId = div.dataset.targetId || div.dataset.tokenId;
  if (!tokenId || !sceneId) return false;
  const scene = game.scenes.get(sceneId);
  const tokenData = scene?.data.tokens.find((e) => e._id === tokenId);
  if (!tokenData) return false;
  const token = new Token(tokenData, sceneId);

  const viewmode = token.data.displayName;
  return (
    token.owner ||
    viewmode === CONST.TOKEN_DISPLAY_MODES.HOVER ||
    viewmode === CONST.TOKEN_DISPLAY_MODES.ALWAYS
  );
}

Hooks.on("init", () => {
  loadTemplates([
    "modules/mars-5e/html/chat/targets.hbs",
    "modules/mars-5e/html/chat/dmg.hbs",
  ]);
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
});

function templateAutotargeting() {
  /**
   * This code is heavily based (mostly copied) on https://gitlab.com/foundrynet/dnd5e/-/blob/master/module/pixi/ability-template.js
   * licensed unter LGPLv3 https://gitlab.com/foundrynet/dnd5e/-/blob/master/LICENSE.txt
   */
  class AbilityTemplate extends game.dnd5e.canvas.AbilityTemplate {
    static fromItem(item) {
      const template = super.fromItem(item);
      template.item = item;
      return template;
    }
    refresh() {
      super.refresh();
      this.getTargets();
    }

    isTokenInside(token) {
      const grid = canvas.scene.data.grid,
        templatePos = { x: this.data.x, y: this.data.y };
      // Check for center of  each square the token uses.
      // e.g. for large tokens all 4 squares
      const startX = token.width >= 1 ? 0.5 : token.width / 2;
      const startY = token.height >= 1 ? 0.5 : token.height / 2;
      for (let x = startX; x < token.width; x++) {
        for (let y = startY; y < token.height; y++) {
          const currGrid = {
            x: token.x + x * grid - templatePos.x,
            y: token.y + y * grid - templatePos.y,
          };
          const contains = this.shape.contains(currGrid.x, currGrid.y);
          if (contains) return true;
        }
      }
      return false;
    }

    getTargets() {
      const tokens = canvas.scene.getEmbeddedCollection("Token");
      let targets = [];

      for (const token of tokens)
        if (this.isTokenInside(token)) {
          targets.push(token._id);
        }
      game.user.updateTokenTargets(targets);
    }
    activatePreviewListeners(initialLayer) {
      const handlers = {};
      let moveTime = 0;

      // Update placement (mouse-move)
      handlers.mm = (event) => {
        event.stopPropagation();
        let now = Date.now(); // only update every 60th second
        if (now - moveTime <= 1000 / 60) return;
        const center = event.data.getLocalPosition(this.layer);
        const snapped = canvas.grid.getSnappedPosition(center.x, center.y, 2);
        this.data.x = snapped.x;
        this.data.y = snapped.y;
        this.refresh();
        moveTime = now;
      };

      // Cancel the workflow (right-click)
      handlers.rc = (event) => {
        this.layer.preview.removeChildren();
        canvas.stage.off("mousemove", handlers.mm);
        canvas.stage.off("mousedown", handlers.lc);
        canvas.app.view.oncontextmenu = null;
        canvas.app.view.onwheel = null;
        initialLayer.activate();
      };

      // Confirm the workflow (left-click)
      handlers.lc = (event) => {
        handlers.rc(event);

        // Confirm final snapped position
        const destination = canvas.grid.getSnappedPosition(this.x, this.y, 2);
        this.data.x = destination.x;
        this.data.y = destination.y;

        // Create the template
        canvas.scene.createEmbeddedEntity("MeasuredTemplate", this.data);
        this.item.updateTargets();
      };

      // Rotate the template by 3 degree increments (mouse-wheel)
      handlers.mw = (event) => {
        if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
        event.stopPropagation();
        let delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
        let snap = event.shiftKey ? delta : 5;
        this.data.direction += snap * Math.sign(event.deltaY);
        this.refresh();
      };

      // Activate listeners
      canvas.stage.on("mousemove", handlers.mm);
      canvas.stage.on("mousedown", handlers.lc);
      canvas.app.view.oncontextmenu = handlers.rc;
      canvas.app.view.onwheel = handlers.mw;
    }
  }
  game.dnd5e.canvas.AbilityTemplate = AbilityTemplate;
  //  rather ugly, maybe find a better way at some point :shrug:
  // const AbilityTemplate = game.dnd5e.canvas.AbilityTemplate;
  // const origPrevListeners = AbilityTemplate.prototype.activatePreviewListeners.toString();
  // const newFun = origPrevListeners.replace(
  //   /this\.refresh\(\)\;/,
  //   // get targets
  //   `this.refresh();
  // 	this.getTargets(this);
  // `
  // );
}
