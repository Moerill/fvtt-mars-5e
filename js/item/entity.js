import { hideNamesForNonGM } from '../settings.js';

/**
 * Make sure that CONFIG.Item.entityClass was predefined.
 * Why am i not importing the 5e item class here? 
 * I want to catch changes from other modules extending the base class and allow for better forge CDN compatiblity. (though last one is only a guess and hope!)
 */
export default function initItemClass() {
	return class MarsItem5e extends CONFIG.Item.entityClass {

		/**
		 * Code heavily based on https://gitlab.com/foundrynet/dnd5e , but partially modified.
		 * The original code is licensed under GNU GPLv3 https://gitlab.com/foundrynet/dnd5e/-/blob/master/LICENSE.txt
		 */
		async roll({configureDialog=false, rollMode=null, createMessage=true}={}) {
			// const roll = await super.roll({configureDialog, rollMode, createMessage:true});
			// console.log(roll);

			// Basic template rendering data
			const token = this.actor.token;
			const hideNames = hideNamesForNonGM();
			const templateData = {
				actor: this.actor,
				sceneId: token?.scene._id || null,
				tokenId: token?.id || null,
				item: this.data,
				data: this.getChatData(),
				labels: this.labels,
				hasAttack: this.hasAttack,
				isHealing: this.isHealing,
				hasDamage: this.hasDamage,
				isVersatile: this.isVersatile,
				isSpell: this.data.type === "spell",
				hasSave: this.hasSave,
				hasAreaTarget: this.hasAreaTarget,
			};

			// For feature items, optionally show an ability usage dialog
			if (this.data.type === "feat") {
				let configured = await this._rollFeat(configureDialog);
				if ( configured === false ) return;
			} else if ( this.data.type === "consumable" ) {
				let configured = await this._rollConsumable(configureDialog);
				if ( configured === false ) return;
			}


			if (templateData.hasAttack) {
				const mod = (await this.rollAttack()).modifier;
				templateData.attackModifier = (mod >= 0 ? '+ ' : '- ') + Math.abs(mod);
			}

			if (templateData.hasDamage) {
				const rolls = await this.rollDamage();
				templateData.damageParts = []
				for (let roll of rolls) {
					templateData.damageParts.push({template: await roll.render3dDiceTemplate(), type: roll.dmgType, formula: roll.flavorFormula})
				}
			}

			templateData.targets = Array.from(game.user.targets).map(target => this._getTargetChatData(target, templateData));
			if (!templateData.targets.length)
				templateData.targets.push(this._getTargetChatData(undefined, templateData));
			console.log(templateData.targets);

			// For items which consume a resource, handle that here
			const allowed = await this._handleResourceConsumption({isCard: true, isAttack: false});
			if ( allowed === false ) return;
	    const template = `modules/mars-5e/html/item-card.html`;
			const html = await renderTemplate(template, templateData);
			// console.log(html);
			// Basic chat message data
			const chatData = {
				user: game.user._id,
				type: CONST.CHAT_MESSAGE_TYPES.OTHER,
				content: html,
				flavor: this.name,
				speaker: {
					actor: this.actor._id,
					token: this.actor.token,
					alias: this.actor.name,
					user: game.user.name
				},
				flags: {"core.canPopout": true}
			};

			// If the consumable was destroyed in the process - embed the item data in the surviving message
			if ( (this.data.type === "consumable") && !this.actor.items.has(this.id) ) {
				chatData.flags["dnd5e.itemData"] = this.data;
			}

			// Toggle default roll mode
			rollMode = rollMode || game.settings.get("core", "rollMode");
			if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
			if ( rollMode === "blindroll" ) chatData["blind"] = true;

			// Create the chat message
			if ( createMessage ) return ChatMessage.create(chatData);
			else return chatData;
		}

		_getTargetChatData(target = {name: game.i18n.localize('MARS5E.chat-card.targets.unknown')}, templateData) {
			let targetData = {
				id: target.id,
				name: target.name,
				img: target.data?.img
			}
			const actor = target.actor;
			if (!actor) return targetData;
			if (templateData.hasAttack) {
				targetData.ac = actor.data.data.attributes.ac.value;
			}
			if (templateData.hasDamage) {
				const traits = actor.data.data.traits;
				targetData.dmgMultiplier = {}
				console.log(templateData)
				for (let [roll, type] of templateData.item.data.damage.parts) {
					targetData.dmgMultiplier[type] = traits.dr.value.find(e => e === type) ? '0.5'
																				 : traits.di.value.find(e => e === type) ? '0'
																				 : traits.dv.value.find(e => e === type) ? '2'
																				 : undefined;
				}
			}
			// Nothing todo here?
			// if (templateData.hasSave) {

			// }
			return targetData;
		}
		
		async rollAttack(options={}) {
			options = mergeObject({
					fastForward: true, 
					chatMessage: false
				},
				options);
			const {target} = options;
			if (target) {
				options.advantage = !!target.querySelector('.mars5e-adv');
				options.disadvantage = !!target.querySelector('.mars5e-dis');
			}
			console.log(options);
			const roll = await super.rollAttack(options);
			console.log(roll);
			if (target) {
				const targetId = target.dataset.targetId;
				if (targetId) {
					const sceneId = target.closest('.mars5e-card').dataset.sceneId;
					const token = new Token(await fromUuid(`Scene.${sceneId}.Token.${targetId}`));
					const actor = token.actor;
					const ac = actor.data.data.attributes.ac.value;
					roll.flags = {resultClasses: roll.total >= ac ? 'mars5e-hit' : 'mars5e-miss'};
				}
			}

			return roll;
		}

		async rollDamage(options={}) {
			options = mergeObject({
				fastForward: true,
				chatMessage: false
			}, options);

			let rolls = [];
			for (let part of this.data.data.damage.parts) {
				let roll = await super.rollDamage({options: mergeObject(options, {parts: [part[0]]})});
				roll.dmgType = part[1];
				rolls.push(roll);
			}
			console.log(rolls);
			return rolls;
		}
	};
}