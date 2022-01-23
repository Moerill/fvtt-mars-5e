import Mars5eUserStatistics from "../statistics.js";
import { markSuccess, markFail } from "../util.js";
import { rollDsN } from "../rolls/dsn.js";
import { log } from "../util.js";

export default function initActorClass() {
  return class Mars5eActor extends CONFIG.Actor.documentClass {
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
      return super.update(data, options).then((document) => {
        if (!oldHp) return;
        const user = game.users.find(
          (user) => user.character?.id === document.id
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
