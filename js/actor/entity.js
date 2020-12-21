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
  };
}
