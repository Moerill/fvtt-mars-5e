import { TweenMax } from '/scripts/greensock/esm/all.js';

export default class Mars5eMessage extends ChatMessage {
	/**
	 * Stop rerendering if mars5e adds some information.
	 * Why? Because we want to manually edit t he card then to allow for animatinos to play!
	 * @override
	 * @param {*} data
	 * @param {*} options
	 * @param {*} userId
	 */
	_onUpdate(data, options, userId) {
		if (!options.mars5e) return super._onUpdate(data, options, userId);
		// changes were already done for the current user!
		// We do not want to defer them until the update is complete, so it feels more responsive.
		if (options.mars5e.userId === game.user.id || options.mars5e.skip) return;
		try {
			this[options.mars5e.fun](options.mars5e);
		} catch (e) {
			// on error just rerender the message...
			console.error(`Mars 5e | ${e}`);
			super._onUpdate(data, options, userId);
		}
		return;
	}

	static init() {
		CONFIG.ChatMessage.entityClass = Mars5eMessage;

		Hooks.on('renderChatLog', (app, html) => {
			const log = html[0].querySelector('#chat-log');
			log.addEventListener('contextmenu', (ev) => {
				const message = Mars5eMessage.fromChatEvent(ev);
				if (message) message.onContextmenu(ev);
			});
			log.addEventListener('click', async (ev) => {
				const message = Mars5eMessage.fromChatEvent(ev);
				if (message) message.onClick(ev);
			});
		});
	}

	static fromChatEvent(ev) {
		const card = ev.target.closest('li.chat-message');
		const messageId = card?.dataset.messageId;
		const message = game.messages.get(messageId);
		message._card = card;
		return message;
	}

	onClick(ev) {
		if (!this._eventAllowed(ev)) return;

		if (this._onClickAttack(ev)) return;

		if (this._onClickDmg(ev)) return;
	}

	onContextmenu(ev) {
		if (!this._eventAllowed(ev)) return;

		if (this._toggleAdv(ev)) return;
	}

	_eventAllowed(ev) {
		return this.permission >= CONST.ENTITY_PERMISSIONS.OWNER;
	}

	_toggleAdv(ev) {
		const targetRoll = ev.target.closest('.roll-d20');
		if (
			targetRoll &&
			!targetRoll.closest('.mars5e-roll')?.classList.contains('rolled')
		) {
			ev.preventDefault();
			ev.stopPropagation();
			const target = targetRoll.closest('.mars5e-target');
			const options = {
				idx: this._getTargetIdx(target),
				advantage: !!target.querySelector('.mars5e-adv'),
				disadvantage: !!target.querySelector('.mars5e-dis'),
				type: targetRoll.closest('.mars5e-action').classList.contains('attack')
					? 'attack'
					: 'save',
				fun: '_onToggleAdv',
				userId: game.user.id,
			};
			if (options.advantage) {
				options.advantage = false;
				options.disadvantage = true;
			} else if (options.disadvantage) {
				options.disadvantage = false;
			} else {
				options.advantage = true;
			}
			this._onToggleAdv(options);

			this.update(
				{
					content: this._content,
				},
				{
					mars5e: options,
				}
			);
			return true;
		} else {
			return false;
		}
	}

	_onToggleAdv(options) {
		const target = this._getTarget(options);
		const targetRoll = target.querySelector(`.${options.type} .roll-d20`);
		if (options.advantage) {
			targetRoll.classList.remove('mars5e-dis');
			targetRoll.classList.add('mars5e-adv');
		} else if (options.disadvantage) {
			targetRoll.classList.remove('mars5e-adv');
			targetRoll.classList.add('mars5e-dis');
		} else {
			targetRoll.classList.remove('mars5e-adv');
			targetRoll.classList.remove('mars5e-dis');
		}
	}

	_onClickAttack(ev) {
		const attack = ev.target.closest('.attack');
		if (
			!attack ||
			attack.querySelector('.mars5e-roll').classList.contains('rolled')
		)
			return false;

		ev.preventDefault();
		ev.stopPropagation();

		this.item
			.rollAttack({
				target: attack.closest('.mars5e-target'),
			})
			.then((roll) => {
				const options = {
					idx: this._getTargetIdx(attack),
					roll: JSON.stringify(roll.toJSON()),
					fun: '_onRollAttack',
					userId: game.user.id,
				};

				this._onRollAttack(options, true);

				this.update(
					{
						content: this._content,
					},
					{
						mars5e: options,
					}
				);
			});
		return true;
		// console.log(roll, rollContainer);

		// let target = ev.target.closest('.roll-d20');
		// if (target) {
		// 	ev.preventDefault(); ev.stopPropagation();
		// 	if (target.parentNode.classList.contains('rolled')) {
		// 		target = target.parentNode.querySelector('.mars5e-result');
		// 		target.dispatchEvent(new MouseEvent('click', {
		// 			view: window,
		// 			bubbles: true,
		// 			cancelable: true,
		// 			currentTarget: target,
		// 			target
		// 		}));
		// 	} else {
		// 		const item = getItemFromCard(ev);
		// 		const roll = await item.rollAttack({target: target.parentNode});
		// 	}
		// }
	}

	_onRollAttack(options, update = false) {
		const roll = Roll.fromJSON(options.roll);
		const target = this._getTarget(options);
		const attack = target.querySelector('.attack');
		const diceContainer = Array.from(
			attack.querySelectorAll('.mars5e-dice-container')
		);

		this._onRolld20(diceContainer, roll);
		let resultOptions = {};
		if (update) {
			resultOptions.onComplete = () => {
				options.skip = true;
				this.update(
					{
						content: this._content,
					},
					{
						mars5e: options,
					}
				);
			};
		}
		this._renderResult(attack, roll, resultOptions);
	}

	_onClickDmg(ev) {
		const dmg = ev.target.closest('.roll-dmg');
		const rollDiv = ev.target.closest('.mars5e-roll');
		if (!dmg || rollDiv.classList.contains('rolled')) return false;

		ev.preventDefault();
		ev.stopPropagation();

		const roll = new Roll(dmg.dataset.formula).roll();

		// const roll = await this.item.rollAttack({target: attack.closest('.mars5e-target')});

		const options = {
			idx: this._getTargetIdx(dmg),
			roll: JSON.stringify(roll.toJSON()),
			fun: '_onRollDmg',
			rollIdx: Array.from(rollDiv.parentNode.children).indexOf(rollDiv),
			userId: game.user.id,
		};

		this._onRollDmg(options, true);

		// this.update({content: this._content}, {mars5e: options});
	}

	async _onRollDmg(options, update = false) {
		const roll = Roll.fromJSON(options.roll);
		const target = this._getTarget(options);
		const damageDiv = target.querySelector('.damage');
		const rollDiv = Array.from(
			damageDiv.querySelector('.mars5e-rolls').children
		)[options.rollIdx];

		const diceTerms = roll.terms.filter((term) => term instanceof Die);
		const faces = diceTerms.reduce(
			(acc, dice) => [...acc, ...dice.results],
			[]
		);

		const diceContainer = Array.from(
			rollDiv.querySelectorAll('.mars5e-dice-container')
		);

		if (diceContainer.length !== faces.length)
			throw new Error('WAAAAAAAAAAAAAH');

		// for (let i = 0 ; i < diceContainer.length; i++) {
		// 	diceContainer[i].dataset.roll = faces[i].result;
		// 	if (faces[i].discarded) diceContainer[i].classList.add('mars5e-discarded');
		// }
		let i = 0;
		TweenMax.to(diceContainer, {
			stagger: {
				amount: Math.min(1, 0.1 * diceContainer.length),
				onComplete: () => {
					diceContainer[i].dataset.roll = faces[i].result;
					if (faces[i].discarded)
						diceContainer[i].classList.add('mars5e-discarded');
					i++;
				},
			},
			onComplete: () => {
				TweenMax.to(rollDiv, 0.3, {
					height: 0,
					opacity: 0,
					delay: 30,
					onComplete: () => {
						rollDiv.remove();
					},
				});
			},
		});
		rollDiv.classList.add('rolled');
	}

	_onRolld20(diceContainer, roll) {
		const term = roll.terms.find((e) => e.faces === 20);
		if (!term) throw new Error('Incorrect d20 roll object! No d20 found.');
		if (term.results.length == 1) diceContainer[1].remove();
		for (let i = 0; i < term.results.length; i++) {
			const die = term.results[i];
			diceContainer[i].dataset.roll = die.result;
			if (die.discarded) diceContainer[i].classList.add('mars5e-discarded');
			else diceContainer[i].classList.remove('mars5e-discarded');

			if (die.result >= term.options.critical)
				diceContainer[i].classList.add('mars5e-success');
			else diceContainer[i].classList.remove('mars5e-success');

			if (die.result <= term.options.fumble)
				diceContainer[i].classList.add('mars5e-fail');
			else diceContainer[i].classList.remove('mars5e-fail');
		}
	}

	async _renderResult(
		container,
		roll,
		{ onComplete = null, classes = '' } = {}
	) {
		const target = container.querySelector('.mars5e-roll');
		const templateData = {
			roll: escape(JSON.stringify(roll)),
			cls: `inline-roll inline-result ${roll.flags?.resultClasses || ''}`,
			title: roll.formula,
			total: roll.total,
		};
		target.classList.add('rolled');
		const html = await renderTemplate(
			'modules/mars-5e/html/chat/result.html',
			templateData
		);
		target.insertAdjacentHTML('afterend', html);
		const result = target.querySelector('.mars5e-result');
		result.style.overflow = 'hidden';
		TweenMax.from(result, 0.3, {
			height: 0,
			onComplete: () => {
				if (onComplete) onComplete();
			},
		});
	}

	_getTargetIdx(el) {
		const target = el.closest('.mars5e-target');
		return Array.from(target.parentNode.children).indexOf(target);
	}

	_getTarget(options) {
		const card = this.card;
		const targets = Array.from(card.querySelector('.mars5e-targets').children);
		const target = targets[options.idx];

		if (!target) throw new Error('Target not found in  chat message!');
		return target;
	}

	get _content() {
		return this._card?.querySelector('.message-content').innerHTML;
	}

	get card() {
		if (this._card) return this._card;
		this._card = ui.chat.element[0].querySelector(
			`.message[data-message-id="${this.id}"]`
		);
		return this._card;
	}

	get item() {
		if (this._item) return this._item;
		const card = this.card;
		if (!this.card) return null;
		const content = card.querySelector('.mars5e-card');
		if (!content) return null;
		const sceneId = content.dataset.sceneId,
			tokenId = content.dataset.tokenId,
			itemId = content.dataset.itemId;
		if (!itemId) return null;
		const scene = game.scenes.get(sceneId);
		const tokenData = scene?.data.tokens.find((e) => e._id === tokenId);
		const actor = tokenData
			? new Token(tokenData).actor
			: game.actors.get(content.dataset.actorId);
		this._item = actor.getOwnedItem(itemId);
		return this._item;
	}
}
