/**
 * Collection of changes and additions to the different core roll, dice, term, ... classes
 */

import NumberTerm from './number-term.js';

class Mars5eRoll extends Roll {
	get diceTemplates() {
		return {
			4: 'mod5ules/mars-5e/html/dice/d4.html',
			6: 'modules/mars-5e/html/dice/d6.html',
			8: 'modules/mars-5e/html/dice/d8.html',
			10: 'modules/mars-5e/html/dice/d10.html',
			12: 'modules/mars-5e/html/dice/d12.html',
			20: 'modules/mars-5e/html/dice/d20.html',
		};
	}

	_splitDiceTerms(formula) {
		const terms = super._splitDiceTerms(formula);

		// make sure that number terms have the correct sign!
		return terms.map((e, idx) => {
			// transform every number to a NumberTerm, for consistenc
			if (Number.isNumeric(terms[idx + 1])) {
				terms[idx + 1] = new NumberTerm({ number: terms[idx + 1] });
			}
			// remove unecessary + terms infront of -, which will get overlooked by cleanterms, due to the addition of NumberTerm
			if (e === '+' && terms[idx + 1] === '-') return '';
			if (e !== '-') return e;
			if (terms[idx + 1] instanceof NumberTerm) {
				terms[idx + 1].number *= -1;
				return '';
			}
			return e;
		});
	}

	get modifier() {
		const vals = this.terms.filter((e) => e instanceof NumberTerm).map((e) => e.number);
		return this._safeEval(vals.join('+'));
	}

	toJSON() {
		let data = super.toJSON();
		data.flags = this.flags;
		data.id = this.id;
		return data;
	}

	static fromJSON(data) {
		const roll = super.fromJSON(data);
		roll.flags = data.flags;
		return roll;
	}

	async render3dDiceTemplate() {
		return (
			await Promise.all(
				this.terms.map(async (term) => {
					if (this.diceTemplates[term.faces]) {
						let html = '';
						for (let i = 0; i < term.number; i++) {
							console.log(this.diceTemplates[term.faces]);
							html += await renderTemplate(this.diceTemplates[term.faces]);
						}
						return html;
					} else {
						return `<span class="mars5e-term">${term.formula || term}</span>`;
					}
				})
			)
		)
			.join('')
			.replace(new RegExp('</span><span class="mars5e-term">', 'g'), ' ');
	}

	get flavorFormula() {
		return this.terms
			.map((e) => {
				if (!(e instanceof DiceTerm)) return e;
				console.log(e);
				return `${e.formula}${e?.options.flavor ? `[${e?.options.flavor}]` : ''}`;
			})
			.join(' ');
	}
}

const diceTemplates = {
	4: 'mod5ules/mars-5e/html/dice/d4.html',
	6: 'modules/mars-5e/html/dice/d6.html',
	8: 'modules/mars-5e/html/dice/d8.html',
	10: 'modules/mars-5e/html/dice/d10.html',
	12: 'modules/mars-5e/html/dice/d12.html',
	20: 'modules/mars-5e/html/dice/d20.html',
};

export function initRollChanges() {
	CONFIG.Dice.terms[NumberTerm.DENOMINATION] = NumberTerm;
	Roll = Mars5eRoll;

	const oldMatchTerm = DiceTerm.matchTerm;

	DiceTerm.matchTerm = function (expression) {
		const match = oldMatchTerm(expression);
		if (match) return match;
		const rgx = new RegExp(`^([0-9]+)${DiceTerm.FLAVOR_TEXT_REGEX}`);
		const ret = expression.match(rgx);
		if (ret) return [null, ret[1], 'n', null, ret[2]]; // is sliced, number, denomination, no modifier, flavor
		return null;
	};

	return;

	const oldSplitDiceTerms = Roll.prototype._splitDiceTerms;
	Roll.prototype._splitDiceTerms = function (formula) {
		const terms = oldSplitDiceTerms.call(this, formula);
		// make sure that number terms have the correct sign!
		return terms.map((e, idx) => {
			// transform every number to a NumberTerm, for consistenc
			if (Number.isNumeric(terms[idx + 1])) {
				terms[idx + 1] = new NumberTerm({ number: terms[idx + 1] });
			}
			// remove unecessary + terms infront of -, which will get overlooked by cleanterms, due to the addition of NumberTerm
			if (e === '+' && terms[idx + 1] === '-') return '';
			if (e !== '-') return e;
			if (terms[idx + 1] instanceof NumberTerm) {
				terms[idx + 1].number *= -1;
				return '';
			}
			return e;
		});
	};

	// Create a getter for the Roll class to get the total modifier of a formula
	Object.defineProperty(Roll.prototype, 'modifier', {
		get: function () {
			const vals = this.terms.filter((e) => e instanceof NumberTerm).map((e) => e.number);
			return this._safeEval(vals.join('+'));
		},
	});

	const oldToJSON = Roll.prototype.toJSON;
	Roll.prototype.toJSON = function () {
		let data = oldToJSON.call(this);
		data.flags = this.flags;
		return data;
	};

	const oldFromData = Roll.fromData;
	Roll.fromData = function (data) {
		let roll = oldFromData.call(this, data);
		roll.flags = data.flags;
		return roll;
	};

	// Add data paths as flavor. Flavor being existent already is kinda impossible, since the whole NumberTerm stuff was added by me.
	const oldreplaceFormulaData = Roll.replaceFormulaData;
	Roll.replaceFormulaData = function (formula, data, { missing, warn = false } = {}) {
		let dataRgx = new RegExp(/@([a-z.0-9_\-]+)/gi);
		formula = formula.replace(dataRgx, (match, term) => {
			return `${match}[${term}]`;
		});
		return oldreplaceFormulaData(formula, data, { missing, warn });
	};

	Roll.prototype.render3dDiceTemplate = async function () {
		return (
			await Promise.all(
				this.terms.map(async (term) => {
					if (diceTemplates[term.faces]) {
						let html = '';
						for (let i = 0; i < term.number; i++) {
							console.log(diceTemplates[term.faces]);
							html += await renderTemplate(diceTemplates[term.faces]);
						}
						return html;
					} else {
						return `<span class="mars5e-term">${term.formula || term}</span>`;
					}
				})
			)
		)
			.join('')
			.replace(new RegExp('</span><span class="mars5e-term">', 'g'), ' ');
	};

	Object.defineProperty(Roll.prototype, 'flavorFormula', {
		get: function () {
			return this.terms
				.map((e) => {
					if (!(e instanceof DiceTerm)) return e;
					console.log(e);
					return `${e.formula}${e?.options.flavor ? `[${e?.options.flavor}]` : ''}`;
				})
				.join(' ');
		},
	});
}
