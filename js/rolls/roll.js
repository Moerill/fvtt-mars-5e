/**
 * Collection of changes and additions to the different core roll, dice, term, ... classes
 */

import NumberTerm from "./number-term.js";
import { log, markFail, markSuccess } from "../util.js";
import Mars5eUserStatistics from "../statistics.js";

function replaceClass() {
  class Mars5eRoll extends Roll {
    constructor(formula, data = {}) {
      super(formula, data);
      this.origFormula = formula;
    }

    _splitDiceTerms(formula) {
      const terms = super._splitDiceTerms(formula);

      // make sure that number terms have the correct sign!
      return terms.map((e, idx) => {
        // transform every number to a NumberTerm, for consistenc
        if (Number.isNumeric(terms[idx + 1])) {
          terms[idx + 1] = new NumberTerm({ number: terms[idx + 1] });
        }
        if (e instanceof NumberTerm && e.number === 0 && !e.flavor) return "";
        // remove unecessary + terms infront of -, which will get overlooked by cleanterms, due to the addition of NumberTerm
        // also remove if the next one is a 0 without flavor, cause thats useless data (but increases the unreadability of this code part, so a good choice! :s)
        if (
          e === "+" &&
          (terms[idx + 1] === "-" ||
            (terms[idx + 1]?.number === 0 && !terms[idx + 1].flavor))
        )
          return "";
        if (e !== "-") return e;
        if (terms[idx + 1] instanceof NumberTerm) {
          terms[idx + 1].number *= -1;
          return "";
        }
        return e;
      });
    }

    get modifier() {
      const vals = this.terms
        .filter((e) => e instanceof NumberTerm)
        .map((e) => e.number);
      return this._safeEval(vals.join("+"));
    }

    // Do math on non dice values to combine tem into one term
    get shortenedFormula() {
      const dice = this.terms
        .filter((e) => !(e instanceof NumberTerm))
        .map((e) => (e.formula ? e.formula : e));
      const terms = this._identifyTerms(
        dice.join(" ") + "+" + (this.modifier || "")
      );
      return this.constructor.cleanFormula(terms);
    }

    get flavorFormula() {
      return this.terms
        .map((e) => {
          if (!(e instanceof DiceTerm)) return e;
          return e.formula;
        })
        .join(" ");
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
      super.toMessage(messageData, { rollMode, create });
    }

    static replaceFormulaData(formula, data, { missing, warn = false } = {}) {
      // Check for replacement data, and add it as flavor
      // Mars v1.2: Added check for whether its inside of parentheses, if yes, ignore, since evaluating numerical terms inside of parentheses results in errors thrown by fvtt. Consider creating an issue for this or see if it will change when Atro introduces the concept of flavored integers at some point.

      // This flag is only set to true (as far as i can see) when the whole roll object is constructed
      // Check for this to avoid issues with stuff where, like in Item5e#prepareData, where only the formula is replaced and evaluated and no complete roll object is created
      if (warn) {
        // DAE compat: Check if ternary operation, by checking that its not followed by /or is not following a "?"
        let dataRgx = new RegExp(
          /(?<![\(\\?].*)@([a-z.0-9_\-]+)(?!.*[\)\\?])/gi
        );
        formula = formula.replace(dataRgx, (match, term) => {
          return `${match} [${term}]`;
        });
      }
      return super.replaceFormulaData(formula, data, { missing, warn });
    }

    async render(chatOptions = {}) {
      chatOptions = mergeObject(
        {
          flavor: null,
          template: "modules/mars-5e/html/roll.hbs",
        },
        chatOptions
      );
      if (!this._rolled) this.roll();

      const user = game.users.get(chatOptions.user);
      const chatData = {
        roll: this,
        flavor: chatOptions.flavor,
        user: chatOptions.user,
        tooltip: await this.getTooltip(),
        mars5e: {
          //advantage: this.mars5e?.advantage,
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
  }
  Roll = Mars5eRoll;
  // else chat message stuff won't work....... cause they use Roll.create and that uses the class defined here......
  CONFIG.Dice.rolls = [Mars5eRoll, ...CONFIG.Dice.rolls];
}

export function initRollChanges() {
  CONFIG.Dice.terms[NumberTerm.DENOMINATION] = NumberTerm;

  const oldMatchTerm = DiceTerm.matchTerm;

  DiceTerm.matchTerm = function (expression) {
    const match = oldMatchTerm(expression);
    if (match) return match;
    // const possible_operators = "\\?\\:\\<\\>\\&\\|\\*\\+";
    // const negative_lookahead_for_dae_ternaries = `(?!.*[${possible_operators}])`;
    // DAE compat: Check if ternary operation, by checking if followed by a "?"
    const rgx = new RegExp(`^([0-9]+)${DiceTerm.FLAVOR_TEXT_REGEX}(?!.*[:?])`);
    const ret = expression.match(rgx);
    if (ret) return [null, ret[1], "n", null, ret[2]]; // is sliced, number, denomination, no modifier, flavor
    return null;
  };
  // allow for spaces before the flavor.. makes it more readable!
  DiceTerm.FLAVOR_TEXT_REGEX = "(?:\\s*\\[(.*)\\])?";

  // Hooks.once("ready", replaceClass);
  replaceClass();
}
