export default function initActorClass() {
  return class Mars5eActor extends CONFIG.Actor.entityClass {
    rollAbilitySave(
      abilityId,
      options = {
        fastForward: true,
        chatMessage: false,
        fromMars5eChatCard: false,
      }
    ) {
      if (options.fromMars5eChatCard)
        return super.rollAbilitySave(abilityId, options);

      const adv = mars5e.getAdvantage();
      options.advantage = adv.advantage;
      options.disadvantage = adv.disadvantage;
      const log = document.getElementById("chat-log");
      const card = log.lastElementChild;
      let id = this.token?.id || this.id;
      // Try to get the token for linked (PC) actors
      if (this.data.token.actorLink) {
        const token = canvas.tokens.placeables.find(
          (e) => e.data.actorLink && e.data.actorId === id
        );
        if (token) id = token.id;
      }
      const targetDiv = card?.querySelector(
        `.mars5e-target[data-target-id="${id}"] .rollable[data-ability="${abilityId}"] `
      );
      if (targetDiv) {
        const ev = new Event("click", { target: targetDiv, bubbles: true });

        targetDiv.dispatchEvent(ev);
      } else {
        options.chatMessage = false;
        options.fastForward = true;
        const adv = mars5e.getAdvantage();
        options.advantage = adv.advantage;
        options.disadvantage = adv.disadvantage;
        const r = super.rollAbilitySave(abilityId, options);
        return this._renderRoll(
          r,
          `${game.i18n.localize("DND5E.SavingThrow")} (${
            CONFIG.DND5E.abilities[abilityId]
          })`
        );
      }
    }

    async _renderRoll(roll, label) {
      roll = await roll;
      const chatData = {
        user: game.user._id,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        speaker: {
          actor: this._id,
          token: this.token,
          alias: this.name,
          user: game.user.name,
        },
        flags: {
          "core.canPopout": false,
        },
      };

      let advantage = 1;
      if (/^2d20kh/.exec(roll.formula)) advantage = 2;
      else if (/^2d20kl/.exec(roll.formula)) advantage = 0;

      // Define chat data
      const templateData = {
        formula: roll.formula,
        // flavor: ,
        user: chatData.user,
        total: roll.total,
        json: JSON.stringify(roll.toJSON()),
        flavorFormula: roll.flavorFormula,
        isGM: game.user.isGM,
        label: label,
        advantage: advantage,
        tooltip: await roll.getTooltip(),
      };

      const template = await renderTemplate(
        "modules/mars-5e/html/roll.hbs",
        templateData
      );
      chatData.content = template;

      // Toggle default roll mode
      const rollMode = game.settings.get("core", "rollMode");
      if (["gmroll", "blindroll"].includes(rollMode))
        chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
      if (rollMode === "blindroll") chatData["blind"] = true;

      // result.dataset.flavorFormula = roll.flavorFormula;
      if (game.dice3d) {
        await game.dice3d.showForRoll(
          roll,
          game.user,
          chatData.whisper,
          chatData.blind
        );
      }

      return ChatMessage.create(chatData);
    }

    rollAbilityTest(abilityId, options = {}) {
      options.chatMessage = false;
      options.fastForward = true;
      const adv = mars5e.getAdvantage();
      options.advantage = adv.advantage;
      options.disadvantage = adv.disadvantage;
      const r = super.rollAbilityTest(abilityId, options);
      return this._renderRoll(r, `${CONFIG.DND5E.abilities[abilityId]}`);
    }

    rollSkill(skillId, options = {}) {
      options.chatMessage = false;
      options.fastForward = true;
      const adv = mars5e.getAdvantage();
      options.advantage = adv.advantage;
      options.disadvantage = adv.disadvantage;
      const r = super.rollSkill(skillId, options);
      return this._renderRoll(
        r,
        `${game.i18n.format("DND5E.SkillPromptTitle", {
          skill: CONFIG.DND5E.skills[skillId],
        })}`
      );
    }

    async useSpell(item, { configureDialog = true } = {}) {
      if (item.data.type !== "spell") throw new Error("Wrong Item type");
      const itemData = item.data.data;

      // Configure spellcasting data
      let lvl = itemData.level;
      const usesSlots =
        lvl > 0 &&
        CONFIG.DND5E.spellUpcastModes.includes(itemData.preparation.mode);
      const limitedUses = !!itemData.uses.per;
      let consumeSlot = `spell${lvl}`;
      let consumeUse = false;
      let placeTemplate = false;

      // Configure spell slot consumption and measured template placement from the form
      if (configureDialog && (usesSlots || item.hasAreaTarget || limitedUses)) {
        const usage = await game.dnd5e.applications.AbilityUseDialog.create(
          item
        );
        if (usage === null) return;

        // Determine consumption preferences
        consumeSlot = Boolean(usage.consumeSlot);
        consumeUse = Boolean(usage.consumeUse);
        placeTemplate = Boolean(usage.placeTemplate);

        // Determine the cast spell level
        const isPact = usage.level === "pact";
        const lvl = isPact
          ? this.data.data.spells.pact.level
          : parseInt(usage.level);
        if (lvl !== item.data.data.level) {
          const upcastData = mergeObject(
            item.data,
            { "data.level": lvl },
            { inplace: false }
          );
          item = item.constructor.createOwned(upcastData, this);
        }

        // Denote the spell slot being consumed
        if (consumeSlot) consumeSlot = isPact ? "pact" : `spell${lvl}`;
      }

      // Update Actor data
      if (usesSlots && consumeSlot && lvl > 0) {
        const slots = parseInt(this.data.data.spells[consumeSlot]?.value);
        if (slots === 0 || Number.isNaN(slots)) {
          return ui.notifications.error(
            game.i18n.localize("DND5E.SpellCastNoSlots")
          );
        }
        await this.update({
          [`data.spells.${consumeSlot}.value`]: Math.max(slots - 1, 0),
        });
      }

      // Update Item data
      if (limitedUses && consumeUse) {
        const uses = parseInt(itemData.uses.value || 0);
        if (uses <= 0)
          ui.notifications.warn(
            game.i18n.format("DND5E.ItemNoUses", { name: item.name })
          );
        await item.update({
          "data.uses.value": Math.max(
            parseInt(item.data.data.uses.value || 0) - 1,
            0
          ),
        });
      }

      // Initiate ability template placement workflow if selected
      if (placeTemplate && item.hasAreaTarget) {
        const template = game.dnd5e.canvas.AbilityTemplate.fromItem(item);
        if (template) template.drawPreview();
        if (this.sheet.rendered) this.sheet.minimize();
      } else {
        // Invoke the Item roll
        return item.roll();
      }
    }
  };
}
