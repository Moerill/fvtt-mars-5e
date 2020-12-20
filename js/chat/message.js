import { TweenMax } from "/scripts/greensock/esm/all.js";

export default class Mars5eMessage extends ChatMessage {
  /**
   * Stop rerendering if mars5e adds some information.
   * Why? Because we want to manually edit t he card then to allow for animatinos to play!
   * @override
   * @param {*} data
   * @param {*} options
   * @param {*} userId
   */
  // _onUpdate(data, options, userId) {
  // 	if (!options.mars5e) return super._onUpdate(data, options, userId);
  // 	// changes were already done for the current user!
  // 	// We do not want to defer them until the update is complete, so it feels more responsive.
  // 	if (options.mars5e.userId === game.user.id || options.mars5e.skip) return;
  // 	try {
  // 		this[options.mars5e.fun](options.mars5e);
  // 	} catch (e) {
  // 		// on error just rerender the message...
  // 		console.error(`Mars 5e | ${e}`);
  // 		super._onUpdate(data, options, userId);
  // 	}
  // 	return;
  // }

  static init() {
    CONFIG.ChatMessage.entityClass = Mars5eMessage;

    Hooks.on("renderChatLog", (app, html) => {
      const log = html[0].querySelector("#chat-log");
      log.addEventListener("contextmenu", (ev) => {
        const message = Mars5eMessage.fromChatEvent(ev);
        if (message) message.onContextmenu(ev);
      });
      log.addEventListener("click", async (ev) => {
        const message = Mars5eMessage.fromChatEvent(ev);
        if (message) message.onClick(ev);
      });

      log.addEventListener(
        "mouseenter",
        (ev) => {
          const targetHeader = ev.target.closest(".target-header");
          if (!targetHeader) return;

          const message = Mars5eMessage.fromChatEvent(ev);
          const target = message._getTarget(targetHeader);
          if (!target) return;

          canvas.tokens.get(target.id)?._onHoverIn();
        },
        true
      );

      log.addEventListener(
        "mouseleave",
        (ev) => {
          const targetHeader = ev.target.closest(".target-header");
          if (!targetHeader) return;

          const message = Mars5eMessage.fromChatEvent(ev);
          const target = message._getTarget(targetHeader);
          if (!target) return;

          canvas.tokens.get(target.id)?._onHoverOut();
        },
        true
      );

      log.addEventListener("dblclick", (ev) => {
        const message = Mars5eMessage.fromChatEvent(ev);
        if (message) message.onDblClick(ev);
      });

      if (!game.user.isGM) {
        log.classList.add("mars5e-player");
      } else {
        log.classList.add("mars5e-gm");
      }
    });

    game.socket.on("module.mars-5e", this.onSocket);
  }

  static onSocket(data) {
    const { content, author, target, messageId } = data;
    if (author !== game.user.id) return false;

    const message = game.messages.get(data.messageId);
    const card = message.card;
    card.querySelector(
      `.mars5e-target[data-target-id="${target}"]`
    ).innerHTML = content;
    message.mars5eUpdate();
    return true;
  }

  static fromChatEvent(ev) {
    const card = ev.target.closest("li.chat-message");
    const messageId = card?.dataset.messageId;
    const message = game.messages.get(messageId);
    message._card = card.querySelector(".mars5e-card");
    return message;
  }

  onClick(ev) {
    if (!this.user.active && !game.user.isGM)
      return ui.notifications.error(
        game.i18n.localize("MARS5E.errors.userNotOnline")
      );
    if (this._onClickSave(ev)) return;

    if (!this._eventAllowed(ev)) return;

    if (this._onApplyDmg(ev)) return;

    if (this._onClickAttack(ev)) return;

    if (this._onClickDmg(ev)) return;

    if (this._onClickRoll(ev)) return;

    if (!game.user.isGM) return;
    if (this._onClickToggleVisibility(ev)) return;
  }

  onContextmenu(ev) {
    if (!this.user.active)
      return ui.notifications.error(
        game.i18n.localize("MARS5E.errors.userNotOnline")
      );
    if (this._toggleAdv(ev)) return;

    if (!this._eventAllowed(ev)) return;

    if (this._toggleHit(ev)) return;

    if (this._toggleCrit(ev)) return;

    if (!game.user.isGM) return;

    if (this._toggleResistance(ev)) return;
  }

  onDblClick(ev) {
    if (this._controlTargetToken(ev)) return;
    if (!game.user.isGM) return;
    if (this._editResult(ev)) return;
  }

  _eventAllowed(ev) {
    return this.permission >= CONST.ENTITY_PERMISSIONS.OWNER;
  }

  _toggleAdv(ev) {
    const target = ev.target.closest(".attack, .save, .tool");

    if (!target) return false;
    if (
      target.querySelector(".mars5e-result")

      // || this._getTarget(target)?.actor.permission <
      //   CONST.ENTITY_PERMISSIONS.OBSERVER
    )
      return false;

    ev.preventDefault();
    ev.stopPropagation();
    const roll = target.querySelector(".rollable");
    const adv = Number(roll.dataset.advantage ?? 1);
    roll.dataset.advantage = (adv + 1) % 3;

    return true;
  }

  _toggleHit(ev) {
    const target = ev.target.closest(".attack, .save");
    if (!target || !target.querySelector(".mars5e-result")) return false;

    ev.preventDefault();
    ev.stopPropagation();

    const action = target;
    const success = action.classList.toggle("mars5e-success");
    action.classList.toggle("mars5e-fail");
    if (action.classList.contains("attack"))
      this._renderDmg(target).then((dmgDiv) => {
        this.mars5eUpdate(action);
      });
  }

  _toggleCrit(ev) {
    const target = ev.target.closest(".damage");
    if (!target || target.querySelector(".mars5e-result")) return false;
    ev.preventDefault();
    ev.stopPropagation();

    const dmgDiv = target.closest(".damage");
    if (dmgDiv.classList.toggle("critical")) {
      // toggle active
      dmgDiv.querySelectorAll(".rollable").forEach((el) => {
        const formula = el.dataset.flavorFormula;
        let r = new Roll(formula);
        r.alter(2, 0);
        el.dataset.flavorFormula = r.flavorFormula;
        el.innerText = r.formula;
      });
    } else {
      dmgDiv.querySelectorAll(".rollable").forEach((el) => {
        const formula = el.dataset.flavorFormula;
        let r = new Roll(formula);
        // TODO: Switch to proper alter method usage in FVTT 0.7.8
        for (const term of r.terms) if (term instanceof Die) term.number *= 0.5;
        el.dataset.flavorFormula = r.flavorFormula;
        el.innerText = r.formula;
      });
    }
  }

  _toggleResistance(ev) {
    let target = ev.target.closest(".damage .mars5e-result");
    if (!target) return false;
    ev.preventDefault();
    ev.stopPropagation();
    const res = Number(target.dataset.resistance ?? 1);
    /*
		.5 -> 1
		1 -> 2
		2 -> 0
		0 -> .5
		*/
    target.dataset.resistance = {
      0: 0.25,
      0.25: 0.5,
      0.5: 1,
      1: 2,
      2: 0,
    }[res];
    // if (target.classList.contains("versatile")) {
    //   target.previousElementSibling.previousElementSibling.dataset.resistance =
    //     target.dataset.resistance;
    // }
    this._updateApplyDmgAmount(ev.target.closest(".damage"));

    return true;
  }

  _onClickAttack(ev) {
    const roll = ev.target.closest(".attack .roll-d20");
    if (!roll) return false;

    ev.preventDefault();
    ev.stopPropagation();
    this._onAttack(roll).then((div) => this.mars5eUpdate(div));
    return true;
  }

  /**
   * Moved out of onClickAttack to make it async
   * @param {*} rollDiv
   */
  async _onAttack(rollDiv) {
    const adv = Number(rollDiv.dataset.advantage ?? 1);
    const r = await this.item.rollAttack({
      fastForward: true,
      chatMessage: false,
      advantage: adv === 2,
      disadvantage: adv === 0,
      isAttack: true,
      isCard: false,
    });

    if (!r) {
      return this._renderNotEnoughResources(rollDiv);
    }

    const resultDiv = await this._renderResult(rollDiv, r);
    let critical = false;
    let fumble = false;
    if (r.terms[0].faces === 20) {
      const dice = r.terms[0];
      if (dice.total >= dice.options.critical) {
        resultDiv.classList.add("critical");
        critical = true;
      } else if (dice.total <= dice.options.fumble) {
        resultDiv.classList.add("fumble");
        fumble = true;
      }
    }
    resultDiv.dataset.advantage = adv.toString();
    const attack = resultDiv.closest(".attack");
    const targetId = resultDiv.closest(".mars5e-target").dataset.targetId;
    if (!targetId) {
      attack.classList.add("mars5e-success");
      await this._renderDmg(resultDiv, critical);
      return resultDiv;
    }

    // const sceneId = resultDiv.closest(".mars5e-card").dataset.sceneId;
    // const token = new Token(
    //   await fromUuid(`Scene.${sceneId}.Token.${targetId}`)
    // );
    // const actor = token.actor;
    const actor = await this._getTarget(resultDiv)?.actor;
    const ac = actor.data.data.attributes.ac.value;
    if (critical || (r.total >= ac && !fumble)) {
      attack.classList.add("mars5e-success");
      await this._renderDmg(resultDiv, critical);
    } else {
      attack.classList.add("mars5e-fail");
    }
    return resultDiv;
  }

  _onClickSave(ev) {
    const roll = ev.target.closest(".save .roll-d20");

    if (
      !roll ||
      this._getTarget(ev.target)?.actor.permission <
        CONST.ENTITY_PERMISSIONS.OBSERVER
    )
      return false;

    ev.preventDefault();
    ev.stopPropagation();
    this._onSave(roll).then((div) => this.mars5eUpdate(div));
    return true;
  }

  async _onSave(div) {
    const actionDiv = div.closest(".mars5e-action");
    const target = await this._getTarget(div);
    const actor = target?.actor;
    const adv = Number(div.dataset.advantage ?? 1);
    if (!actor) {
      div.classList.remove("rollable");
      return div;
    }
    const r = await actor.rollAbilitySave(div.dataset.ability, {
      fastForward: true,
      chatMessage: false,
      advantage: adv === 2,
      disadvantage: adv === 0,
      fromMars5eChatCard: true,
    });

    const resultDiv = await this._renderResult(div, r);
    if (r.terms[0].faces === 20) {
      const dice = r.terms[0];
      if (dice.total >= dice.options.critical) {
        resultDiv.classList.add("critical");
      } else if (dice.total <= dice.options.fumble) {
        resultDiv.classList.add("fumble");
      }
    }
    resultDiv.dataset.advantage = adv.toString();
    // Don't show dmg if a attack roll is associated to the item as well, since then it *probably* is dependend on the attack roll and the save is just extra
    const targetDiv = actionDiv.closest(".mars5e-target");
    if (actionDiv.closest(".mars5e-target").querySelector(".attack"))
      return resultDiv;
    let dmgDiv = targetDiv.querySelector(".damage");
    if (!dmgDiv) await this._renderDmg(resultDiv);
    if (dmgDiv && r.total >= Number(div.dataset.dc || 10)) {
      let multiplier = 0.5;
      // only cantrips ( i think ) deal 0 dmg on successful save
      if (
        this.item.data.type === "spell" &&
        this.item.data.data.scaling.mode === "cantrip"
      )
        multiplier = 0;
      dmgDiv.querySelectorAll(".rollable, .mars5e-result").forEach((e) => {
        e.dataset.resistance = Number(e.dataset.resistance || 1) * multiplier;
      });
    }
    if (r.total >= Number(div.dataset.dc || 10)) {
      actionDiv.classList.add("mars5e-success");
    } else {
      actionDiv.classList.add("mars5e-fail");
    }

    return resultDiv;
  }

  _onClickRoll(ev) {
    const roll = ev.target.closest(".mars5e-action .rollable");

    if (!roll) return false;

    ev.preventDefault();
    ev.stopPropagation();
    this._onRoll(roll).then((div) => this.mars5eUpdate(div));
    return true;
  }

  async _onRoll(rollable) {
    let formula = rollable.dataset.flavorFormula;
    if (rollable.classList.contains("roll-d20")) {
      if (rollable.dataset.advantage === "2") formula = "2d20kh" + formula;
      else if (rollable.dataset.advantage === "0") formula = "2d20kl" + formula;
      else formula = "1d20" + formula;
    }
    let r = new Roll(formula);
    r.roll();
    return this._renderResult(rollable, r);
  }

  async _renderNotEnoughResources(el) {
    const span = document.createElement("span");
    span.innerText = game.i18n.localize("MARS5E.chat-card.error.resources");
    el.replaceWith(span);
    return span;
  }

  async _renderDmg(resultDiv, critical = false) {
    if (!this.item.hasDamage) return null;
    const targetDiv = resultDiv.closest(".mars5e-target");

    const targets = resultDiv.closest(".mars5e-targets");
    const areaDmg = targets.querySelector(".mars5e-area-dmg");
    let dmgDiv = targetDiv.querySelector(".damage");
    if (areaDmg) {
      return dmgDiv;
    }
    // if it exists already, toggle it
    if (dmgDiv) {
      // return new Promise((reject, resolve) => {
      if (dmgDiv.style.display) {
        dmgDiv.style.display = null;
        // TweenMax.from(dmgDiv, 0.15, {
        //   height: 0,
        //   opacity: 0,
        //   onComplete: () => {
        //     dmgDiv.style.height = null;
        //     dmgDiv.style.opacity = null;
        //     dmgDiv.style.overflow = null;
        //     this.scrollIntoView();
        //     resolve();
        //   },
        // });
      } else {
        dmgDiv.style.display = "none";
        // TweenMax.to(dmgDiv, 0.15, {
        //   height: 0,
        //   opacity: 1,
        //   onComplete: () => {
        //     dmgDiv.style.display = "none";
        //     dmgDiv.style.height = null;
        //     dmgDiv.style.opacity = null;
        //     resolve();
        //   },
        // });
      }
      // resolve();
      // });
      this.scrollIntoView();
      return;
    }

    const spellLevel = parseInt(this.card.dataset.spellLevel) || null;

    let data = await this.item.rollDamage({
      options: { critical },
      spellLevel,
    });
    data.critical = critical;

    const target = await this._getTarget(resultDiv)?.actor;
    if (target) {
      const { di, dr, dv } = target.data.data.traits;
      di.multiplier = 0;
      dr.multiplier = 0.5;
      dv.multiplier = 2;
      let resistances = {};
      for (let res of [dv, dr, di]) {
        for (let val of res.value) {
          resistances[val] = res.multiplier;
        }
        if (res?.custom?.includes("from nonmagical attacks"))
          resistances["physical"] = res.multiplier;
      }

      const magicDmg = this.item.isMagicDmg;
      for (let roll of data.rolls) {
        let dmgType = roll.dmgType;
        if (
          !magicDmg &&
          ["bludgeoning", "piercing", "slashing"].includes(roll.dmgType)
        )
          dmgType = "physical";
        roll.resistance = resistances[dmgType] ?? 1;
      }
    }

    const template = await renderTemplate(
      "modules/mars-5e/html/chat/dmg.hbs",
      data
    );
    targetDiv.insertAdjacentHTML("beforeend", template);
    dmgDiv = targetDiv.querySelector(".damage");
    await new Promise((resolve, reject) => {
      TweenMax.from(dmgDiv, 0.15, {
        height: 0,
        opacity: 0,
        onComplete: () => {
          dmgDiv.style.height = null;
          dmgDiv.style.opacity = null;
          this.scrollIntoView();
          resolve();
        },
      });
    });
    return dmgDiv;
  }

  _onClickDmg(ev) {
    const dmgRoll = ev.target.closest(".damage .rollable");
    if (!dmgRoll) return false;

    ev.preventDefault();
    ev.stopPropagation();
    this._onDmg(dmgRoll);
    return true;
  }
  async _onDmg(dmgRoll) {
    const roll = new Roll(dmgRoll.dataset.flavorFormula).roll();
    const dmgType = dmgRoll.dataset.dmgType;
    const dmgTypeLabel = dmgRoll.dataset.dmgTypeLabel;
    const resistance = dmgRoll.dataset.resistance;
    const versatile = dmgRoll.classList.contains("versatile");
    const isNonVersatileMainRoll = dmgRoll.classList.contains("non-versatile");

    const resultDiv = await this._renderResult(dmgRoll, roll);
    if (dmgType) resultDiv.dataset.dmgType = dmgType;
    if (dmgTypeLabel) resultDiv.dataset.dmgTypeLabel = dmgTypeLabel;
    if (resistance) resultDiv.dataset.resistance = resistance;
    if (versatile) resultDiv.classList.add("versatile");
    if (isNonVersatileMainRoll) resultDiv.classList.add("non-versatile");
    resultDiv.querySelector(".result-total").classList.add("mars5e-toggleable");

    const actionDiv = resultDiv.closest(".damage");
    actionDiv.classList.remove("mars5e-toggleable");
    if (actionDiv.parentNode.classList.contains("mars5e-area-dmg"))
      await this._applyAreaDmg(actionDiv);
    this._updateApplyDmgAmount(actionDiv);

    this.mars5eUpdate(resultDiv);

    this.scrollIntoView();
  }

  async _applyAreaDmg(dmgDiv) {
    dmgDiv.querySelector(".result-total").classList.remove("mars5e-toggleable");
    const card = dmgDiv.closest(".mars5e-targets");
    const targetDivs = Array.from(
      card.querySelectorAll(".mars5e-target:not(.mars5e-area-dmg")
    );
    const resultDivs = [];
    for (const div of targetDivs) {
      const dmg = div.appendChild(dmgDiv.cloneNode(true));
      const results = Array.from(dmg.querySelectorAll(".mars5e-result"));
      let mult = 1;
      if (div.querySelector(".save.mars5e-success"))
        if (
          this.item.data.type === "spell" &&
          this.item.data.data.scaling.mode === "cantrip"
        )
          mult = 0;
        else mult = 0.5;

      const target = await this._getTarget(div)?.actor;
      let resistances = {};
      const magicDmg = this.item.isMagicDmg;
      if (target) {
        const { di, dr, dv } = target.data.data.traits;
        di.multiplier = 0;
        dr.multiplier = 0.5;
        dv.multiplier = 2;
        for (let res of [dv, dr, di]) {
          for (let val of res.value) {
            resistances[val] = res.multiplier;
          }
          if (res?.custom?.includes("from nonmagical attacks"))
            resistances["physical"] = res.multiplier;
        }
      }
      for (let result of results) {
        let dmgType = result.dataset.dmgType;
        if (
          !magicDmg &&
          ["bludgeoning", "piercing", "slashing"].includes(roll.dmgType)
        )
          dmgType = "physical";
        result.dataset.resistance = (resistances[dmgType] ?? 1) * mult;
      }
      dmg
        .querySelectorAll(".result-total")
        .forEach((e) => e.classList.add("mars5e-toggleable"));
      this._updateApplyDmgAmount(div);
      resultDivs.push(div);
    }
  }

  _onClickToggleVisibility(ev) {
    const target = ev.target.closest(".mars5e-toggle-target-visibility");
    if (!target) return;
    ev.preventDefault();
    ev.stopPropagation();
    target
      .closest(".mars5e-target")
      .classList.toggle("mars5e-invisible-target");
    this.mars5eUpdate(target);
  }

  async _updateApplyDmgAmount(dmgDiv) {
    const applyMenu = dmgDiv.querySelector(".mars5e-apply-dmg-menu");
    if (!applyMenu) return;
    const results = Array.from(
      dmgDiv.querySelectorAll(
        ".mars5e-result:not(.versatile):not(.non-versatile)"
      ) || []
    );
    const mainRoll = dmgDiv.querySelector(".mars5e-result.non-versatile");
    const versatileRoll = dmgDiv.querySelector(".mars5e-result.versatile");
    const calcTotal = (arr) => {
      return arr
        .map(
          (e) =>
            Math.floor(
              Number(e.dataset.resistance) *
                Number(e.querySelector(".result-total").innerText)
            ) * (e.dataset.dmgType === "healing" ? 1 : -1)
        )
        .reduce((a, b) => a + b, 0);
    };
    if (mainRoll) {
      applyMenu.children[0].dataset.amount = calcTotal([...results, mainRoll]);
    }
    if (versatileRoll) {
      applyMenu.children[1].dataset.amount = calcTotal([
        ...results,
        versatileRoll,
      ]);
    }
  }

  async _renderResult(div, roll) {
    const result = document.createElement("a");
    result.classList.add("mars5e-roll");
    result.classList.add("mars5e-result");
    if (!game.user.isGM) {
      result.classList.add("player-roll");
    }
    div.replaceWith(result);
    // result.dataset.flavorFormula = roll.flavorFormula;
    if (game.dice3d) {
      result.innerHTML = `<span class='result-total'>...</span>`;
      await game.dice3d.showForRoll(
        roll,
        game.user,
        this.data.whisper,
        !!result.closest(".blind, .mars5e-invisible-target")
      );
    }
    result.innerHTML = `<span class='result-total'>${roll.total}</span>`;

    const tooltip = await roll.getTooltip();

    result.insertAdjacentHTML("beforeend", tooltip);
    return result;
  }

  _controlTargetToken(ev) {
    const targetHeader = ev.target.closest(".target-header");
    if (!targetHeader) return false;
    const target = this._getTarget(targetHeader);
    if (!target) return false;
    ev.preventDefault();
    ev.stopPropagation();
    const token = canvas.tokens.get(target.id);
    if (
      !token ||
      (token.actor.permission < CONST.ENTITY_PERMISSIONS.OBSERVER &&
        !token.visible)
    )
      return;
    canvas.animatePan(token.position);
    token.control();
    return true;
  }

  _editResult(ev) {
    const target = ev.target.closest(".mars5e-result .result-total");
    if (!target || target.contentEditable === "true") return false;
    ev.stopPropagation();
    ev.preventDefault();
    target.contentEditable = "true";
    target.dataset.original = target.innerText;
    target.focus();
    target.addEventListener("focusout", (ev) => {
      target.contentEditable = "false";
      if (isNaN(Number(target.innerText))) {
        target.innerText = target.dataset.original;
      } else {
        if (target.innerText !== target.dataset.original)
          this.mars5eUpdate(target);
      }
    });
    target.addEventListener("keydown", (ev) => {
      if (ev.code !== "Enter") return;
      ev.preventDefault();
      ev.stopPropagation();
      target.dispatchEvent(new Event("focusout"));
    });
  }

  _onApplyDmg(ev) {
    const menu = ev.target.closest(".mars5e-apply-dmg-menu");
    if (!menu) return false;
    const btn = ev.target.closest("button");
    const target = this._getTarget(menu);
    // apply modifier of -1, since i'm calculating with heal -> positive, dmg -> negative
    // But the applyDamage expects a positive number for applying dmg...
    if (target) target.actor.applyDamage(-1 * Number(btn.dataset.amount || 0));
    else {
      canvas.tokens.controlled.forEach((token) => {
        token.actor.applyDamage(-1 * Number(btn.dataset.amount || 0));
      });
    }
  }

  _getTarget(el) {
    if (!canvas?.ready) return null; // sadly needed for the creation of a token instance
    const targetDiv = el.closest(".mars5e-target");
    const targetId = targetDiv.dataset.targetId;
    if (!targetId) return null;
    const content = el.closest(".mars5e-card");
    const sceneId = content.dataset.sceneId;
    const scene = game.scenes.get(sceneId);
    const data = scene.getEmbeddedEntity("Token", targetId);
    // const data = await fromUuid(`Scene.${sceneId}.Token.${targetId}`);
    if (data) return new Token(data);
    return null;
  }

  scrollIntoView() {
    const card = this.card.closest(".message");
    const { bottom } = card.getBoundingClientRect();
    const logBox = card.closest("#chat-log").getBoundingClientRect();
    if (bottom > logBox.bottom)
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  get card() {
    if (this._card) return this._card;
    this._card = ui.chat.element[0].querySelector(
      `.message[data-message-id="${this.id}"]  .chat-card`
    );
    return this._card;
  }

  get item() {
    if (this._item) return this._item;
    const card = this.card;
    if (!this.card) return null;

    const sceneId = card.dataset.sceneId,
      tokenId = card.dataset.tokenId,
      itemId = card.dataset.itemId;
    if (!itemId) return null;
    const scene = game.scenes.get(sceneId);
    const tokenData = scene?.data.tokens.find((e) => e._id === tokenId);
    const actor = tokenData
      ? new Token(tokenData).actor
      : game.actors.get(card.dataset.actorId);
    this._item = actor.getOwnedItem(itemId);
    return this._item;
  }

  mars5eUpdate(div) {
    if (this.data.user === game.user.id || game.user.isGM) {
      this.update({ content: this.card.parentNode.innerHTML });
    } else {
      const targetDiv = div.closest(".mars5e-target");
      game.socket.emit("module.mars-5e", {
        content: targetDiv.innerHTML,
        author: this.user.id,
        target: targetDiv.dataset.targetId,
        messageId: this.id,
      });
    }
  }
}
