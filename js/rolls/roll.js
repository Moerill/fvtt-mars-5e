/**
 * Collection of changes and additions to the different core roll, dice, term, ... classes
 */

import { log, markFail, markSuccess } from "../util.js";
import Mars5eUserStatistics from "../statistics.js";

const marsRollMixin = (superRoll) =>
  class extends superRoll {
    async render(chatOptions = {}) {
      chatOptions = foundry.utils.mergeObject(
        {
          user: game.user.id,
          flavor: null,
          template: "modules/mars-5e/html/roll.hbs",
          blind: false,
        },
        chatOptions
      );

      // Execute the roll, if needed
      if (!this._evaluated) await this.evaluate();

      const user = game.users.get(chatOptions.user);
      const chatData = {
        roll: this,
        flavor: chatOptions.flavor,
        user: chatOptions.user,
        tooltip: await this.getTooltip(),
        options: this.options,
        mars5e: {
          advantage: this.mars5e?.advantage,
          gmRoll: this.mars5e?.gmRoll,
          noFormula: this.mars5e?.noFormula,
          critical: this.mars5e?.critical,
          fumble: this.mars5e?.fumble,
        },
        total: this.total,
        label: chatOptions.flavor ? chatOptions.flavor : this.flavorFormula,
      };

      return renderTemplate(chatOptions.template, chatData);
    }

    // Clones this, but without flavor
    get flavorless() {
      // Recursively process and delete
      const proc = (l) => {
        for(term in l) {
          if(term.options && term.options["flavor"]) {
            delete term.options["flavor"];
          }
          if(term.terms) {
            proc(term.terms);
          }
        }
      };
      let c = this.clone();
      proc(c.terms);
      return c;
    }

    /**
     * Add some roll information to the roll, based on the roll type needed for rendering
     *
     * @param {*} messageData
     * @param {*} param1
     */
    toMessage(messageData = {}, { rollMode = null, create = true } = {}) {
      const type = messageData["flags.dnd5e.roll"]?.type;
      if (type && ["skill", "save", "ability"].includes(type)) {
        this.mars5e = {};
        if (game.user.isGM) this.mars5e.gmRoll = true;
        const dice = this.terms[0];
        if (dice.total >= dice.options.critical) {
          markSuccess();
          this.mars5e.critical = true;
        } else if (dice.total <= dice.options.fumble) {
          markFail();
          this.mars5e.fumble = true;
        }
        Mars5eUserStatistics.update(
          game.user,
          Mars5eUserStatistics.getD20Statistics(dice)
        );
        this.mars5e.noFormula = true;
      }
      return super.toMessage(messageData, { rollMode, create });
    }

    /**
     * Add NumericTerms to the tooltip
     * @returns
     */
    async getTooltip() {
      const parts = this.terms
        .reduce((dice, t, idx) => {
          if (t instanceof DiceTerm) dice.push(t);
          else if (t instanceof PoolTerm) dice = dice.concat(t.dice);
          else if (t instanceof NumericTerm) {
            if (idx > 0)
              t._val = Number(this.terms[idx - 1].operator + t.number);
            else t._val = t.number;
            dice.push(t);
          }
          return dice;
        }, [])
        .map((d) => {
          if (d instanceof NumericTerm)
            return {
              formula: d._val,
              total: d._val,
              flavor: d.flavor,
            };
          return d.getTooltipData();
        })
        .concat(this._dice);
      return renderTemplate(this.constructor.TOOLTIP_TEMPLATE, { parts });
    }

    /**
     * For Legacy reasons.
     */
    get flavorFormula() {
      return this.formula;
    }

    toJSON() {
      let ret = super.toJSON();
      ret.class = "Mars5eRoll";
      if (this.mars5e) ret.mars5e = this.mars5e;
      ret.formula = this.flavorFormula;
      return ret;
    }

    static fromData(data) {
      let r = super.fromData(data);
      r.mars5e = data.mars5e;
      return r;
    }

    /**
    // I don't think this is still useful

    static replaceFormulaData(formula, data, { missing, warn = false } = {}) {
      // Check for replacement data, and add it as flavor
      // Mars v1.2: Added check for whether its inside of parentheses, if yes, ignore, since evaluating numerical terms inside of parentheses results in errors thrown by fvtt. Consider creating an issue for this or see if it will change when Atro introduces the concept of flavored integers at some point.

      // This flag is only set to true (as far as i can see) when the whole roll object is constructed
      // Check for this to avoid issues with stuff where, like in Item5e#prepareData, where only the formula is replaced and evaluated and no complete roll object is created
      if (!warn) {
        // DAE compat: Check if ternary operation, by checking that its not followed by /or is not following a "?"
        formula = formula.replace(dataRgx, (match, term) => {
          return `${match} [${term}]`;
        });
      }
      return super.replaceFormulaData(formula, data, { missing, warn });
    }
    */
  };

function replaceClass() {
  class Mars5eRoll extends marsRollMixin(Roll) {}
  class MarsD20Roll extends marsRollMixin(CONFIG.Dice.D20Roll) {}
  class MarsDamageRoll extends marsRollMixin(CONFIG.Dice.DamageRoll) {}

  //  Roll = Mars5eRoll;
  // else chat message stuff won't work....... cause they use Roll.create and that uses the class defined here......
  CONFIG.Dice.rolls = [Mars5eRoll, MarsD20Roll, MarsDamageRoll, ...CONFIG.Dice.rolls];
  Roll = Mars5eRoll;
  CONFIG.Dice.D20Roll = MarsD20Roll;
  CONFIG.Dice.DamageRoll = MarsDamageRoll;
}

export function initRollChanges() {
  Roll.CHAT_TEMPLATE = "modules/mars-5e/html/roll.hbs";
  replaceClass();
}
