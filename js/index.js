import { initRollChanges } from './rolls/roll.js';

import initItemClass from './item/entity.js';

import { hideNamesForNonGM } from './settings.js';

import Mars5eMessage from './chat/message.js';

const replacementName = '???';

Hooks.on('init', () => {
	const MarsItem5e = initItemClass();
	CONFIG.Item.entityClass = MarsItem5e;

	Mars5eMessage.init();
})

initRollChanges();

// ActorSheet5e.prototype._onItemRoll = function(event) {
//   event.preventDefault();
//   const itemId = event.currentTarget.closest(".item").dataset.itemId;
//   const item = this.actor.getOwnedItem(itemId);

//   // Roll spells through the actor
//   if ( item.data.type === "spell" ) {
//     return this.actor.useSpell(item, {configureDialog: !event.shiftKey});
//   }

//   // Otherwise roll the Item directly
//   else return item.roll({configureDialog:false, createMessage:false});
// }


TextEditor._createInlineRoll(null, null, '1d20[mod]', {'asd': 3})

Hooks.on('renderChatMessage', async (app, html, options) => {

	const sender = html[0].querySelector('.message-sender');
	// if (!game.user.isGM) {
		const div = html[0].querySelector('[data-token-id]')
		if (div && !isTokenViewable(div))
			html[0].querySelector('.message-sender').innerText = replacementName;
		html[0].querySelectorAll('[data-target-id]').forEach(e => {
			
		});
	// }
	
	// Only color one border, not the whole border...
	if (html[0].style.borderColor) {
		html[0].style.borderColor = null;
		// html[0].style.borderRightColor = app.user.color;
		html[0].style.borderTopColor = app.user.color;

	} else
		html[0].style.borderLeftColor = app.user.color;
});

// Hooks.on('preCreateChatMessage', (entity, options, id) => {

// 	console.log(args);
// })

function isTokenViewable(div) {
	const sceneId = div.closest('mars-card')?.dataset.sceneId;
	const tokenId = div.dataset.targetId || div.dataset.tokenId;
	if (!tokenId || !sceneId) return false;
	const scene = game.scenes.get(sceneId);
	const tokenData = scene?.data.tokens.find(e => e._id === tokenId);
	if (!tokenData) return false;
	const token = new Token(tokenData, sceneId);
	console.log(token, token.nameplate);
	const viewmode = token.data.displayName
	return token.owner || viewmode === CONST.TOKEN_DISPLAY_MODES.HOVER || viewmode === CONST.TOKEN_DISPLAY_MODES.ALWAYS;
}

Hooks.on('init', () => {
	loadTemplates([
		'modules/mars-5e/html/dice/d4.html',
		'modules/mars-5e/html/dice/d6.html',
		'modules/mars-5e/html/dice/d8.html',
		'modules/mars-5e/html/dice/d10.html',
		'modules/mars-5e/html/dice/d12.html',
		'modules/mars-5e/html/dice/d20.html'
	]);
});

Hooks.on('ready', async () => {
	document.head.insertAdjacentHTML('beforeend', await renderTemplate('modules/mars-5e/html/definitions.html', {}));
})
