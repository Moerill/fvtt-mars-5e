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

  get formula() {
    return `${this.number < 0 ? "- " : ""}${Math.abs(this.number)}`;
  }

  get total() {
    return this.formula;
  }

  get values() {
    return this.formula;
  }

  alter() {
    return this;
  }

  get expression() {
    return this.number;
  }
}
