import { log, markSuccess, markFail } from "../util.js";
import Mars5eUserStatistics from "../statistics.js";

import { rollDsN } from "../rolls/dsn.js";

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

  constructor(...args) {
    super(...args);

    this.resetStatistics();
  }

  // Really hide hidden rolls - part 1!
  get isContentVisible() {
    return this.visible;
  }

  // Really hide hidden rolls - part 2!
  get visible() {
    if (this.data.whisper.length) {
      return (
        this.data.user === game.user._id ||
        this.data.whisper.indexOf(game.user._id) !== -1
      );
    }
    return true;
  }

  _onUpdate(...args) {
    super._onUpdate(...args);
    this.resetStatistics();
  }

  resetStatistics() {
    this.mars5eStatistics = { hits: 0, attacks: 0, nat1: 0, nat20: 0 };
  }

  static init() {
    CONFIG.ChatMessage.documentClass = Mars5eMessage;

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

    Hooks.on("ready", () => {
      if (game.dice3d)
        Hooks.on("renderChatMessage", async (message, html) => {
          if (
            game.dice3d &&
            message.isAuthor &&
            (mars5e.autoRoll.hit || mars5e.autoRoll.dmg) &&
            html[0].querySelector(".mars5e-card .rollable")
          ) {
            message._card = html[0].querySelector(".mars5e-card");
            if (await message.autoRoll()) {
              message.mars5eUpdate();
            }
          }
        });
    });
  }

  static onSocket(data) {
    const { content, author, target, messageId, statistics } = data;
    if (author !== game.user.id) return false;

    const message = game.messages.get(messageId);

    message.mars5eStatistics = statistics;
    const card = message.card;
    card.querySelector(`.mars5e-target[data-target-id="${target}"]`).innerHTML =
      content;
    message.mars5eUpdate();
    return true;
  }

  static fromChatEvent(ev) {
    const card = ev.target.closest("li.chat-message");
    if (!card) return null;
    const messageId = card?.dataset.messageId;
    const message = game.messages.get(messageId);
    message._card = card.querySelector(".mars5e-card");
    return message;
  }

  onClick(ev) {
    if (!this.isAuthor && !this.user.active && !game.user.isGM)
      return ui.notifications.error(
        game.i18n.localize("MARS5E.errors.userNotOnline")
      );
    if (this._onClickSave(ev)) return;

    if (this._onClickReapply(ev)) return;

    if (!this._eventAllowed(ev)) return;

    if (this._onClickAttack(ev)) return;

    if (this._onClickDmg(ev)) return;

    if (this._onClickRoll(ev)) return;

    if (this._onApplyDmg(ev)) return;

    if (!game.user.isGM) return;

    if (this._onClickToggleVisibility(ev)) return;
  }

  onContextmenu(ev) {
    if (!this.user.active && !game.user.isGM)
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
    return this.isAuthor;
    return this.permission >= CONST.DOCUMENT_PERMISSION_LEVELS.OWNER;
  }

  _toggleAdv(ev) {
    const target = ev.target.closest(".attack, .save, .tool");

    if (!target) return false;
    if (
      target.querySelector(".mars5e-result")

      // || this._getTarget(target)?.actor.permission <
      //   CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER
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
    this.mars5eStatistics.hits += success ? 1 : -1;
    if (action.classList.contains("attack"))
      return this._renderDmg(target).then(async (dmgDiv) => {
        this.mars5eUpdate(action);
      });
    else if (action.classList.contains("save")) {
      const dmgDiv = action.closest(".mars5e-target").querySelector(".damage");
      if (dmgDiv) {
        this._setTargetResistance(dmgDiv, success);
      }
    }

    this.mars5eUpdate(action);
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
        el.dataset.flavorFormula = r.formula;
        el.innerText = r.formula;
      });
    } else {
      dmgDiv.querySelectorAll(".rollable").forEach((el) => {
        const formula = el.dataset.flavorFormula;
        let r = new Roll(formula);
        r.alter(0.5, 0);
        log(r);
        el.dataset.flavorFormula = r.formula;
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
    this._updateApplyDmgAmount(target.closest(".damage"));

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
        markSuccess(resultDiv);
        critical = true;
      } else if (dice.total <= dice.options.fumble) {
        markFail(resultDiv);
        fumble = true;
      }

      Mars5eUserStatistics.getD20Statistics(dice, this.mars5eStatistics);
    }
    this.mars5eStatistics.attacks++;
    resultDiv.dataset.advantage = adv.toString();
    const attack = resultDiv.closest(".attack");
    const targetId = resultDiv.closest(".mars5e-target").dataset.targetId;
    if (!targetId) {
      attack.classList.add("mars5e-success");
      this.mars5eStatistics.hits++;
      await this._renderDmg(resultDiv, critical);
      return resultDiv;
    }

    const target = await this._getTarget(resultDiv);
    const actor = target?.actor;
    const ac = actor.data.data.attributes.ac.value;

    let hookData = {};
    if (critical || (r.total >= ac && !fumble)) {
      attack.classList.add("mars5e-success");
      this.mars5eStatistics.hits++;
      await this._renderDmg(resultDiv, critical);

      hookData = {
        source: this.token,
        target: target,
        item: this.item,
        success: true,
        critical,
        fumble,
        type: "attack",
      };
    } else {
      attack.classList.add("mars5e-fail");
      hookData = {
        source: this.token,
        target: target,
        item: this.item,
        success: false,
        critical,
        fumble,
        type: "attack",
      };
    }
    if (this.id) Hooks.callAll("mars-5e.AtackRollComplete", hookData);
    else this._attackTargets.push(hookData);
    return resultDiv;
  }

  _onClickSave(ev) {
    const roll = ev.target.closest(".save .roll-d20");

    if (
      !roll ||
      this._getTarget(ev.target)?.actor.permission <
        CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER
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

    this.mars5eStatistics.attacks++; // count each as attack! #makemagiclookeffectiveagain

    if (r.terms[0].faces === 20) {
      const dice = r.terms[0];
      if (dice.total >= dice.options.critical) {
        markSuccess(resultDiv);
      } else if (dice.total <= dice.options.fumble) {
        markFail(resultDiv);
      }
      Mars5eUserStatistics.getD20Statistics(dice, this.Mars5eUserStatistics);
    }
    resultDiv.dataset.advantage = adv.toString();
    // Don't show dmg if a attack roll is associated to the item as well, since then it *probably* is dependend on the attack roll and the save is just extra
    const targetDiv = actionDiv.closest(".mars5e-target");
    if (actionDiv.closest(".mars5e-target").querySelector(".attack"))
      return resultDiv;
    let dmgDiv = targetDiv.querySelector(".damage");
    if (!dmgDiv) await this._renderDmg(resultDiv);
    let success = dmgDiv && r.total >= Number(div.dataset.dc || 10);
    // success!

    this._setTargetResistance(dmgDiv, success);

    this._updateApplyDmgAmount(dmgDiv);
    if (r.total >= Number(div.dataset.dc || 10)) {
      actionDiv.classList.add("mars5e-success");
      // success = hit
    } else {
      actionDiv.classList.add("mars5e-fail");
      this.mars5eStatistics.hits++;
    }

    return resultDiv;
  }

  _setTargetResistance(dmgDiv, saveSuccess = false) {
    if (!dmgDiv) return;
    dmgDiv = dmgDiv.closest(".damage");
    const target = this._getTarget(dmgDiv)?.actor;
    if (!target) return;
    let multiplier = 1;
    if (saveSuccess) {
      multiplier = 0.5;
      if (
        this.item.data.type === "spell" &&
        this.item.data.data.scaling.mode === "cantrip"
      )
        multiplier = 0;
    }
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
    for (const roll of dmgDiv.querySelectorAll(".rollable, .mars5e-result")) {
      const dmgType = roll.dataset.dmgType;
      if (
        !magicDmg &&
        ["bludgeoning", "piercing", "slashing"].includes(roll.dmgType)
      )
        dmgType = "physical";
      roll.dataset.resistance = (resistances[dmgType] ?? 1) * multiplier;
    }
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
      } else {
        dmgDiv.style.display = "none";
      }
      this.scrollIntoView();
      return;
    }

    const spellLevel = parseInt(this.card.dataset.spellLevel) ?? null;
    let data = await this.item.rollDamage({
      options: { critical },
      spellLevel,
    });
    data.critical = critical;
    const template = await renderTemplate(
      "modules/mars-5e/html/chat/dmg.hbs",
      data
    );
    targetDiv.insertAdjacentHTML("beforeend", template);

    dmgDiv = targetDiv.querySelector(".damage");
    let saveSuccess = false;
    if (!targetDiv.querySelector(".attack"))
      saveSuccess = !!targetDiv.querySelector(".save .mars5e-success");
    this._setTargetResistance(dmgDiv);
    if (window.mars5e.autoRoll.dmg) {
      let promises = [];
      const dmgRolls = Array.from(dmgDiv.querySelectorAll(".rollable"));
      for (const roll of dmgRolls) promises.push(this._onDmg(roll));
      await Promise.all(promises);
      await this._updateApplyDmgAmount(dmgDiv);
    }
    this.scrollIntoView();

    return dmgDiv;
  }

  _onClickDmg(ev) {
    const dmgRoll = ev.target.closest(".damage .rollable");
    if (!dmgRoll) return false;

    ev.preventDefault();
    ev.stopPropagation();
    this._onDmg(dmgRoll).then((resultDiv) => {
      this.mars5eUpdate(resultDiv);
    });
    return true;
  }
  async _onDmg(dmgRoll, update = true) {
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
    // this._updateApplyDmgAmount(actionDiv);

    if (this.id) {
      const target = this._getTarget(resultDiv);
      Hooks.callAll("mars-5e.DamageRollComplete", {
        source: this.token,
        target: target,
        item: this.item,
        roll: dmgRoll,
        type: "damage",
      });
    }

    this.scrollIntoView();
    return resultDiv;
  }

  /**
   * Adds the area dmg rolled to all targets
   * @param {*} dmgDiv
   */
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
      await this._updateApplyDmgAmount(dmg);
      resultDivs.push(div);
    }
    dmgDiv.closest(".mars5e-area-dmg")?.remove();
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
    if (!dmgDiv) return;
    const applyMenu = dmgDiv.querySelector(".mars5e-apply-dmg-menu");
    if (!applyMenu) return;
    const results = Array.from(
      dmgDiv.querySelectorAll(
        ".mars5e-result:not(.versatile):not(.non-versatile)"
      ) || []
    );
    let mainRoll = dmgDiv.querySelector(".mars5e-result.non-versatile");
    const versatileRoll = dmgDiv.querySelector(".mars5e-result.versatile");
    const calcTotal = (arr) => {
      return arr
        .map(
          (e) =>
            Math.floor(
              Number(e.dataset.resistance || 1) *
                Number(e.querySelector(".result-total").innerText)
            ) * (e.dataset.dmgType === "healing" ? 1 : -1)
        )
        .reduce((a, b) => a + b, 0);
    };
    if (mainRoll || results.length) {
      if (mainRoll) mainRoll = [...results, mainRoll];
      else mainRoll = results;
      applyMenu.children[0].dataset.amount = calcTotal(mainRoll);
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
      div.closest(".mars5e-action").classList.add("has-player-roll");
    } else result.classList.add("gm-roll");
    div.replaceWith(result);
    // result.dataset.flavorFormula = roll.flavorFormula;
    if (this.id && game.dice3d) {
      result.innerHTML = `<span class='result-total'>...</span>`;
      await rollDsN(
        [
          roll,
          game.user,
          true,
          this.data.whisper.length
            ? this.data.whisper
            : !!result.closest(".blind, .mars5e-invisible-target")
            ? ChatMessage.getWhisperRecipients("GM")
            : undefined,
        ],
        this.item.actor
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
      (token.actor.permission < CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER &&
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
    this._applyDmg(ev, menu);
    return true;
  }

  async _applyDmg(ev, menu) {
    const btn = ev.target.closest("button");
    const target = this._getTarget(menu);
    // apply modifier of -1, since i'm calculating with heal -> positive, dmg -> negative
    // But the applyDamage expects a positive number for applying dmg...
    let applied = 0;
    let statisticsData = { dmgDone: 0, healingDone: 0, kills: 0 };
    let apply = async (actor, button = btn) => {
      let oldHp = duplicate(actor.data.data.attributes.hp);
      oldHp = oldHp.value + parseInt(oldHp.temp || 0);
      const amount = -1 * Number(button.dataset.amount || 0);
      if (amount === 0) return;
      await actor.applyDamage(amount);
      let newHp = duplicate(actor.data.data.attributes.hp);
      newHp = newHp.value + parseInt(newHp.temp || 0);

      applied = oldHp - newHp;

      if (newHp <= 0 && oldHp > 0) {
        statisticsData.kills++;
      }
    };
    if (target) {
      await apply(target.actor);
    } else if (menu.classList.contains("mars5e-apply-all")) {
      const btnType = btn.classList.contains("mars5e-apply-versatile")
        ? ".mars5e-apply-versatile"
        : ".mars5e-apply";
      const targetBtns = Array.from(
        menu
          .closest(".mars5e-targets")
          .querySelectorAll(`.mars5e-target ${btnType}`)
      );
      for (const btn of targetBtns) {
        const target = this._getTarget(btn);
        if (!target) continue;
        await apply(target.actor, btn);
      }
    } else {
      for (let token of canvas.tokens.controlled) {
        await apply(token.actor);
      }
    }
    if (applied < 0) statisticsData.healingDone = applied;
    else statisticsData.dmgDone = applied;
    Mars5eUserStatistics.update(this.user, statisticsData);
  }

  _onClickReapply(ev) {
    const target = ev.target.closest(".mars5e-reapply-btn");
    if (!target) return false;
    if (!this.isAuthor && !game.user.isGM) {
      ui.notifications.error(
        game.i18n.localize("MARS5E.errors.reapplyNotAllowed")
      );
      return false;
    }

    this._onReapply(target).then((html) => this.mars5eUpdate(html));

    return true;
  }

  async _onReapply(btn) {
    const item = this.item;
    item._lastMessage = this;
    await item.updateTargets();
  }

  _getTarget(el) {
    if (!canvas?.ready) return null; // sadly needed for the creation of a token instance
    const targetDiv = el.closest(".mars5e-target");
    const targetId = targetDiv?.dataset.targetId;
    if (!targetId) return null;
    const content = el.closest(".mars5e-card");
    const sceneId = content.dataset.sceneId;
    if (sceneId === canvas.scene.id) {
      return canvas.tokens.get(targetId);
    }
    const scene = game.scenes.get(sceneId);
    const data = scene.getEmbeddedDocument("Token", targetId);
    // const data = await fromUuid(`Scene.${sceneId}.Token.${targetId}`);
    if (data) return new Config.Token.objectClass(data);
    return null;
  }

  scrollIntoView() {
    const card = this.card.closest(".message");
    if (!card) return;
    const { bottom } = card.getBoundingClientRect();
    const logBox = card.closest("#chat-log")?.getBoundingClientRect();
    if (!logBox) return;
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

  get token() {
    if (this._token) return this._token;
    const card = this.card;
    if (!card) return null;

    let tokenId = card.dataset.tokenId;
    let sceneId;
    // Starting Mars 1.2, like dnd system: Saved in one dataset "sceneId.tokenId"
    [sceneId, tokenId] = tokenId?.split(".") || [null, null];
    // Pre Mars 1.2: scene and targetid are saved in different datasets
    if (!tokenId) {
      tokenId = sceneId;
      sceneId = card.dataset.sceneId;
    }

    const scene =
      sceneId === canvas.scene.id ? canvas.scene : game.scenes.get(sceneId);
    if (!scene) return null;
    let tokenData = scene.getEmbeddedDocument("Token", tokenId); //tokens.find((e) => e.id === tokenId);
    if (!tokenData) {
      const actorId = card.dataset.actorId;
      tokenData = scene.tokens.find((e) => e.data.actorId === actorId);
    }
    if (!tokenData) return;
    this._token = canvas.tokens.get(tokenData.id);

    if (!this._token) this._token = new CONFIG.Token.objectClass(tokenData);
    return this._token;
  }

  get item() {
    if (this._item) return this._item;
    const card = this.card;
    const itemId = card.dataset.itemId;
    if (!itemId) return null;
    const token = this.token;
    const actor = token?.actor ?? game.actors.get(card.dataset.actorId);
    this._item = actor.items.get(itemId);
    return this._item;
  }

  async mars5eUpdate(div) {
    if (!this.id) return;
    if (div) {
      const dmgDiv = div.closest(".damage");
      if (dmgDiv) await this._updateApplyDmgAmount(dmgDiv);
    }
    if (this.data.user === game.user.id || game.user.isGM) {
      // const statistics = duplicate(this.mars5eStatistics);

      Mars5eUserStatistics.update(
        game.users.get(this.data.user),
        this.mars5eStatistics
      ).then(() => {
        // Reset description shown to default view style on update
        this.card.querySelector(".card-content").style.display = null;
        this.update({ content: this.card.parentNode.innerHTML });
      });
    } else {
      if (!div) {
        ui.notifications.error("No target div provided to update!");
        console.error(
          "Mars 5e | No target div provided to foreign call of Message#mars5eUpdate."
        );
        return;
      }

      const targetDiv = div.closest(".mars5e-target");
      const { nat1, nat20 } = this.mars5eStatistics;
      this.mars5eStatistics.nat1 = 0;
      this.mars5eStatistics.nat20 = 0;
      Mars5eUserStatistics.update(game.user, { nat1, nat20 });
      game.socket.emit("module.mars-5e", {
        type: "updateMessage",
        content: targetDiv.innerHTML,
        author: this.user.id,
        target: targetDiv.dataset.targetId,
        messageId: this.id,
        statistics: this.mars5eStatistics,
      });
    }
  }

  static async create(createData, options = {}) {
    if (!game.dice3d) {
      // only think of autorolling without DsN activated and/or try to delay it to after creation? :thinking:
      createData = createData instanceof Array ? createData : [createData];
      for (const data of createData) await this.autoRoll(data);
    }
    return super.create(createData, options);
  }

  async autoRoll() {
    if (!this.card) {
      const div = document.createElement("div");
      div.insertAdjacentHTML("afterbegin", this.data.content);
      this._card = div.children[0];
      if (!div.querySelector(".mars5e-card .rollable")) return false;
    }
    this._attackTargets = [];

    // check if its the card create for a template...
    if (
      this._card.querySelector(".mars5e-area-dmg") &&
      this._card.querySelector(
        ".mars5e-target:not([data-target-id]):not(.mars5e-area-dmg)"
      )
    )
      return false;
    let attackRolls;
    if (window.mars5e.autoRoll.hit) {
      attackRolls = Array.from(
        this._card.querySelectorAll(".attack .roll-d20")
      );

      let promises = [];
      for (const roll of attackRolls) promises.push(this._onAttack(roll));

      await Promise.all(promises);
    }
    let areaDmg;
    let dmgRolls;
    if (window.mars5e.autoRoll.dmg) {
      let promises = [];
      areaDmg = this._card.querySelector(".mars5e-area-dmg .rollable");
      if (areaDmg) promises.push(this._onDmg(areaDmg));

      dmgRolls = Array.from(this._card.querySelectorAll(".damage .rollable"));
      for (const roll of dmgRolls) promises.push(this._onDmg(roll));
      await Promise.all(promises);

      const dmgDivs = Array.from(this._card.querySelectorAll("damage"));
      for (const dmgDiv of dmgDivs) this._updateApplyDmgAmount(dmgDiv);
    }
    if (this._attackTargets.length) {
      Hooks.callAll("mars-5e.AtackRollComplete", {
        source: this.token,
        targets: this._attackTargets,
        item: this.item,
      });
    }
    return attackRolls?.length || areaDmg || dmgRolls?.length;
  }

  static async autoRoll(data) {
    if (!(window.mars5e.autoRoll.hit || window.mars5e.autoRoll.dmg)) return;
    const message = new CONFIG.ChatMessage.documentClass(data);
    if (await message.autoRoll()) {
      data.content = message.card.outerHTML;

      await Mars5eUserStatistics.update(game.user, message.mars5eStatistics);
      message.resetStatistics();
    }
  }
}
