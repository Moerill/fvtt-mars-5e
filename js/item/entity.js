/**
 * Make sure that CONFIG.Item.entityClass was predefined.
 * Why am i not importing the 5e item class here?
 * I want to catch changes from other modules extending the base class and allow for better forge CDN compatiblity. (though last one is only a guess and hope!)
 */
export default function initItemClass() {
  return class MarsItem5e extends CONFIG.Item.entityClass {
    /**
     * Code heavily based on https://gitlab.com/foundrynet/dnd5e , but partially modified.
     * The original code is licensed under GNU GPLv3 https://gitlab.com/foundrynet/dnd5e/-/blob/master/LICENSE.txt
     */
    async displayCard({ rollMode, createmessage = true } = {}) {
      const templateData = await this._getTemplateData();

      const template = "modules/mars-5e/html/item-card.hbs";
      const html = await renderTemplate(template, templateData);
      // console.log(html);
      // Basic chat message data
      const chatData = {
        user: game.user._id,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        content: html,
        flavor: this.name,
        speaker: ChatMessage.getSpeaker({
          actor: this.actor,
          token: this.actor.token,
        }),
        flags: {
          "core.canPopout": false,
        },
      };

      // If the consumable was destroyed in the process - embed the item data in the surviving message
      if (this.data.type === "consumable" && !this.actor.items.has(this.id)) {
        chatData.flags["dnd5e.itemData"] = this.data;
      }

      // Apply the roll mode to adjust message visibility
      CONFIG.ChatMessage.entityClass.applyRollMode(
        chatData,
        rollMode || game.settings.get("core", "rollMode")
      );

      // Create the chat message
      if (createmessage) {
        this._lastMessage = CONFIG.ChatMessage.entityClass.create(chatData);
        return this._lastMessage;
      } else return chatData;
    }

    async _getTemplateData() {
      const adv = mars5e.getAdvantage();

      // Basic template rendering data
      const token = this.actor.token;
      const templateData = {
        actor: this.actor,
        // keep the scene id separated, since its used for e.g. linked actors to get the entity
        sceneId: token?.scene._id || canvas.scene?.id,
        tokenId: token ? `${token.scene._id}.${token.id}` : null,
        item: this.data,
        data: this.getChatData(),
        labels: this.labels,
        hasAttack: this.hasAttack,
        isHealing: this.isHealing,
        hasDamage: this.hasDamage,
        isVersatile: this.isVersatile,
        isSpell: this.data.type === "spell",
        hasSave: this.hasSave,
        hasAreaTarget: this.hasAreaTarget,
        isGM: game.user.isGM,
        invisibleTarget: window.mars5e.invisibleTarget ?? true,
      };

      if (templateData.hasAttack) {
        const consume = duplicate(this.data.data.consume);
        this.data.data.consume = null;
        const attackRoll = await this.rollAttack({
          fastForward: true,
          chatMessage: false,
          ...adv,
        });
        this.data.data.consume = consume;
        const mod = attackRoll.shortenedFormula.replace(
          /[12]?d20(k[hl])?\s/,
          ""
        );
        templateData.attack = {
          mod: mod,
          flavor: attackRoll.flavorFormula.replace(/[12]?d20(k[hl])?\s/, ""),
          advantage: adv.advantage ? 2 : adv.disadvantage ? 0 : 1,
        };
      }

      if (
        // (
        templateData.hasDamage
        // 	&&
        //   (templateData.hasAreaTarget || templateData.hasSave)) ||
        // templateData.isHealing
      ) {
        // check for upcasting
        // why so complicated? since the roll function gets called from the spell as upcast variant (meaning: level is set to the upcast level)
        let spellLevel = null;
        if (this.type === "spell") {
          const origItem = this.actor.getOwnedItem(this.id);

          if (origItem.data.data.level !== this.data.data.level) {
            spellLevel = this.data.data.level;
            this.data.data.level = origItem.data.data.level;
          }
          templateData.damage = await this.rollDamage({
            spellLevel,
          });
          if (spellLevel) this.data.data.level = spellLevel;
        } else
          templateData.damage = await this.rollDamage({
            spellLevel,
          });
      }

      // Only add targets when the item is actually something that can target
      if (
        templateData.hasDamage ||
        templateData.hasAttack ||
        templateData.hasSave ||
        templateData.isHealing
      ) {
        templateData.targets = Array.from(game.user.targets).map((target) =>
          this._getTargetChatData(target, templateData)
        );
        if (!templateData.targets.length)
          templateData.targets.push(
            this._getTargetChatData(undefined, templateData)
          );
      }

      if (templateData.hasSave) {
        templateData.labels.save =
          game.i18n.localize("DND5E.AbbreviationDC") +
          " " +
          templateData.data.save.dc;
        templateData.labels.saveAbi =
          CONFIG.DND5E.abilities[templateData.data.save.ability];
      }

      if (templateData.data.formula) {
        const r = new Roll(templateData.data.formula, this.actor.getRollData());
        templateData.formula = {
          formula: r.shortenedFormula,
          flavorFormula: r.flavorFormula,
        };
      }

      if (this.type === "tool") {
        const r = await this.rollToolCheck({
          fastForward: true,
          chatMessage: false,
          ...adv,
        });
        templateData.toolCheck = {
          formula: r.shortenedFormula.replace(/[12]?d20(k[hl])?\s/, ""),
          flavorFormula: r.flavorFormula.replace(/[12]?d20(k[hl])?\s/, ""),
          mod: r.modifier,
        };
      }
      return templateData;
    }

    _getTargetChatData(
      target = { name: game.i18n.localize("MARS5E.chat-card.targets.unknown") },
      templateData
    ) {
      let targetData = {
        // id: target?.data?.actorLink ? target.actor.id : target?.id,
        id: target?.id,
        name: target.name,
        img: target.data?.img,
      };
      const actor = target.actor;
      if (!actor) return targetData;
      if (templateData.hasAttack) {
        targetData.ac = actor.data.data.attributes.ac.value;
      }
      if (templateData.hasDamage) {
        const traits = actor.data.data.traits;
        targetData.dmgMultiplier = {};
        for (let [roll, type] of templateData.item.data.damage.parts) {
          targetData.dmgMultiplier[type] = traits.dr.value.find(
            (e) => e === type
          )
            ? "0.5"
            : traits.di.value.find((e) => e === type)
            ? "0"
            : traits.dv.value.find((e) => e === type)
            ? "2"
            : undefined;
        }
      }

      targetData.visible =
        actor?.hasPlayerOwner ||
        target.data.viewmode === CONST.TOKEN_DISPLAY_MODES.HOVER ||
        target.data.viewmode === CONST.TOKEN_DISPLAY_MODES.ALWAYS;

      // Nothing todo here?
      // if (templateData.hasSave) {

      // }
      return targetData;
    }

    async updateTargets() {
      const message = await this._lastMessage;
      if (!message) return;

      const card = message.card;
      const templateData = await this._getTemplateData();
      if (!templateData.targets?.length) return;
      let html = "";
      for (const target of templateData.targets) {
        html += await renderTemplate("modules/mars-5e/html/chat/targets.hbs", {
          data: templateData,
          target: target,
        });
      }
      const oldTargets = card.querySelector(".mars5e-targets");
      oldTargets.insertAdjacentHTML("beforeend", html);
      oldTargets
        .querySelector(
          ".mars5e-target:not([data-target-id]):not(.mars5e-area-dmg)"
        )
        ?.remove();
      await message.autoRoll();
      message.scrollIntoView();
      message.mars5eUpdate(oldTargets);
    }

    async rollDamage({ spellLevel = null, options = {} } = {}) {
      options = mergeObject(
        {
          fastForward: true,
          chatMessage: false,
        },
        options
      );

      let rolls = [];

      const tempItem = new game.dnd5e.entities.Item5e(duplicate(this.data));
      tempItem.options.actor = this.actor;

      const parts = duplicate(tempItem.data.data.damage.parts);
      tempItem.data.data.damage.parts = [parts[0]];

      const roll = await tempItem.rollDamage({ spellLevel, options });
      roll.dmgType = parts[0][1];
      if (roll.dmgType === "healing") {
        roll.dmgTypeLabel = game.i18n.localize("DND5E.Healing");
      } else
        roll.dmgTypeLabel = game.i18n.localize(
          `DND5E.Damage${roll.dmgType.capitalize()}`
        );
      rolls.push(roll);

      let versatile;
      if (this.data.data.damage.versatile) {
        versatile = await super.rollDamage({
          spellLevel,
          versatile: true,
          options,
        });
        versatile.dmgType = roll.dmgType;
        versatile.dmgTypeLabel = game.i18n.localize("DND5E.Versatile");
        // rolls.push(versatile);
        // console.log(Roll.fromData(versatile.toJSON()));
        // const roll = new Roll(this.data.data.damage.versatile)
      }

      this.data.data.damage.parts = parts;

      for (let i = 1; i < parts.length; i++) {
        const r = new Roll(parts[i][0], rolls[0].data);
        if (options.critical) {
          r.alter(2, 0);
        }
        r.roll();
        r.dmgType = parts[i][1];
        if (r.dmgType === "healing") {
          r.dmgTypeLabel = game.i18n.localize("DND5E.Healing");
        } else
          r.dmgTypeLabel = game.i18n.localize(
            `DND5E.Damage${r.dmgType.capitalize()}`
          );
        rolls.push(r);
      }

      // for (let part of this.data.data.damage.parts) {
      // 	let roll = await super.rollDamage({ options: mergeObject(options, { parts: [part[0]] }) });
      // 	roll.dmgType = part[1];
      // 	rolls.push(roll);
      // }

      return { rolls, versatile };
    }

    /**
     * If bludgeoning/piercing/slashing check if its a "magical weapon", if no return "nonmagical".
     * Decide based on attackbonus (+X weapons) or if its attuned. i guess those are the ways to detect it?
     */
    get isMagicDmg() {
      if (
        this.data.type !== "weapon" ||
        this.data.data.attackBonus !== 0 ||
        this.data.data.attuned
      )
        return true;
      return false;
    }
  };
}
