import Mars5eUserStatistics from "../statistics.js";
import { markSuccess, markFail } from "../util.js";
import { rollDsN } from "../rolls/dsn.js";
import { log } from "../util.js";

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
        return;
      } else {
        return this.processRoll(super.rollAbilitySave, abilityId, options);
      }
    }

    async _renderRoll(roll, label) {
      roll = await roll;
      const chatData = {
        user: game.user._id,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        speaker: ChatMessage.getSpeaker({
          actor: this.actor,
          token: this.token,
        }),
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

      let template = await renderTemplate(
        "modules/mars-5e/html/roll.hbs",
        templateData
      );

      if (roll.terms[0].faces === 20) {
        const dice = roll.terms[0];
        const div = document.createElement("div");
        div.insertAdjacentHTML("afterbegin", template);
        const resultDiv = div.querySelector(".mars5e-result");
        if (resultDiv) {
          if (dice.total >= dice.options.critical) {
            markSuccess(resultDiv);
          } else if (dice.total <= dice.options.fumble) {
            markFail(resultDiv);
          }
          template = div.innerHTML;
        }

        Mars5eUserStatistics.update(
          game.user,
          await Mars5eUserStatistics.getD20Statistics(dice)
        );
      }

      chatData.content = template;

      // Toggle default roll mode
      const rollMode = game.settings.get("core", "rollMode");
      if (["gmroll", "blindroll"].includes(rollMode))
        chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
      if (rollMode === "blindroll") chatData["blind"] = true;

      // result.dataset.flavorFormula = roll.flavorFormula;
      await rollDsN(
        [
          roll,
          game.user,
          true,
          chatData.whisper || null,
          chatData.blind || null,
        ],
        this
      );

      return CONFIG.ChatMessage.entityClass.create(chatData);
    }

    rollAbilityTest(abilityId, options = {}) {
      return this.processRoll(super.rollAbilityTest, abilityId, options);
    }

    rollSkill(skillId, options = {}) {
      return this.processRoll(super.rollSkill, skillId, options);
    }

    async processRoll(fun, id, options) {
      options.fastForward = true;
      //const toChat = options.chatMessage;
      //options.chatMessage = false;
      const adv = mars5e.getAdvantage();
      options.advantage = adv.advantage;
      options.disadvantage = adv.disadvantage;
      return fun.call(this, id, options);
    }

    async update(data, options = {}) {
      const oldHp = expandObject(data).data?.attributes?.hp
        ? duplicate(getProperty(this.data, "data.attributes.hp"))
        : null;
      return super.update(data, options).then((entity) => {
        if (!oldHp) return;
        const user = game.users.find(
          (user) => user.character?.id === entity.id
        );

        if (!user) return;
        const newHp = duplicate(getProperty(this.data, "data.attributes.hp"));
        const dHp = oldHp.value + oldHp.temp - newHp.value - newHp.temp;
        const statistics = {
          dmgTaken: dHp > 0 ? dHp : 0,
          unconscious: oldHp.value > 0 && newHp.value === 0 ? 1 : 0,
        };

        Mars5eUserStatistics.update(user, statistics);
      });
    }
  };
}
