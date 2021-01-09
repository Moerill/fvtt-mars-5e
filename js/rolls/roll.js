/**
 * Collection of changes and additions to the different core roll, dice, term, ... classes
 */

import NumberTerm from "./number-term.js";

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

    /**
     * Overwrite this, set the class to "Roll", so we can render rolls before we replace this class.
     * Why? Due to DaE i had to push class Creation to the ready hook, but rendering rolls happens before..
     */
    toJSON() {
      let ret = super.toJSON();
      ret.class = "Roll";
      return ret;
    }

    static replaceFormulaData(formula, data, { missing, warn = false } = {}) {
      // Check for replacement data, and add it as flavor
      // Mars v1.2: Added check for whether its inside of parentheses, if yes, ignore, since evaluating numerical terms inside of parentheses results in errors thrown by fvtt. Consider creating an issue for this or see if it will change when Atro introduces the concept of flavored integers at some point.

      // DAE compat: Check if ternary operation, by checking that its not followed by /or is not following a "?"
      let dataRgx = new RegExp(/(?<![\(\\?].*)@([a-z.0-9_\-]+)(?!.*[\)\\?])/gi);
      formula = formula.replace(dataRgx, (match, term) => {
        return `${match} [${term}]`;
      });
      return super.replaceFormulaData(formula, data, { missing, warn });
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
    const rgx = new RegExp(`^([0-9]+)${DiceTerm.FLAVOR_TEXT_REGEX}(?!.*\\?)`);
    const ret = expression.match(rgx);
    if (ret) return [null, ret[1], "n", null, ret[2]]; // is sliced, number, denomination, no modifier, flavor
    return null;
  };
  // allow for spaces before the flavor.. makes it more readable!
  DiceTerm.FLAVOR_TEXT_REGEX = "(?:\\s*\\[(.*)\\])?";

  // Hooks.once("ready", replaceClass);
  replaceClass();
}
