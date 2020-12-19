/**
 * Custom DiceTerm class representing numbers, to allow for flavor
 */
export default class NumberTerm extends DiceTerm {
  constructor(termData) {
    super(termData);
    this.faces = null;
  }

  roll() {
    return this.number;
  }

  static get DENOMINATION() {
    return "n";
  }

  // get formula() {
  //   return `${this.number < 0 ? "- " : ""}${Math.abs(this.number)}`;
  // }

  get total() {
    return this.expression;
  }

  get values() {
    return this.formula;
  }

  alter() {
    return this;
  }

  get expression() {
    return `${this.number < 0 ? "- " : ""}${Math.abs(this.number)}`;
  }

  evaluate({ minimize = false, maximize = false } = {}) {
    if (this._evaluated) {
      throw new Error(
        `This ${this.constructor.name} has already been evaluated and is immutable`
      );
    }

    return this;
  }
}
