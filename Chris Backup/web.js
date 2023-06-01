import {chris} from '../../helperFunctions.js';
async function wbestZone(token) {
    let templates = chris.tokenTemplates(token.document);
    let bestDC = null;
    let bestOriginUuid;
    for (let i of templates) {
        let testTemplate = canvas.scene.collections.templates.get(i);
        if (!testTemplate) continue;
        let testOriginUuid = testTemplate.flags['midi-qol']?.originUuid;
        if (!testOriginUuid) continue;
        let testOriginItem = await fromUuid(testOriginUuid);
        if (testOriginItem.name != 'Web') continue;
        let testDC = chris.getSpellDC(testOriginItem);
        if (testDC > bestDC) {
            bestDC = testDC;
            bestOriginUuid = testOriginUuid;
        }
    }
    return bestOriginUuid;
}
async function winZone (token, template) {
    let originUuid = template.flags['midi-qol']?.originUuid;
    if (!originUuid) return;
    if (chris.inCombat()) {
        let turnEntered = template.flags['chris-premades']?.spell?.web?.tokens?.[token.id];
        let currentTurn = game.combat.round + '-' + game.combat.turn;
        if (currentTurn === turnEntered) return;
        await template.setFlag('chris-premades', 'spell.web.tokens.' + token.id, currentTurn);
    }
    let bestOriginUuid = await wbestZone(token);
    if (bestOriginUuid != originUuid) return;
    let originItem = await fromUuid(originUuid);
    if (!originItem) return;
    let effectData = {
        'label': originItem.name,
        'icon': originItem.img,
        'duration': {
            'seconds': 600
        },
        'changes': [
                    {
                    'key': 'macro.CE',
                    'mode': 0,
                    'value': 'Restrained',
                    'priority': 20
                    }
                ],
        'origin': originItem.uuid,
    };
    let effect = chris.findEffect(token.actor, 'Web');
    if (effect) {
        if (effect.origin === originUuid) return;
        await chris.removeEffect(effect);
        await chris.createEffect(token.actor, effectData);
        return;
    }
    let spellObject = duplicate(originItem.toObject());
    delete(spellObject.flags.templatemacro);
    spellObject.system.range = {
        'value': null,
        'long': null,
        'units': ''
    };
    spellObject.system.target = {
        'value': 1,
        'width': null,
        'units': '',
        'type': 'creature'
    }
    spellObject.system.actionType = 'save';
    spellObject.system.save = {
        'ability': 'dex',
        'dc': chris.getSpellDC(originItem),
        'scaling': 'flat'
    }
    spellObject.system.preparation.mode = 'atwill';
    let spell = new CONFIG.Item.documentClass(spellObject, {parent: originItem.actor});
    let options = {
        'showFullCard': false,
        'createWorkflow': true,
        'targetUuids': [token.document.uuid],
        'configureDialog': false,
        'versatile': false,
        'consumeResource': false,
        'consumeSlot': false,
        'workflowOptions': {
            'autoRollDamage': 'always',
            'autoFastDamage': true
        }
    };
    let spellWorkflow = await MidiQOL.completeItemUse(spell, {}, options);
    if (spellWorkflow.failedSaves.size != 1) return;
    await chris.createEffect(token.actor, effectData);
}
async function wleaveZone(token, template) {
    if (chris.inCombat()) {
        await template.setFlag('chris-premades', 'spell.web.tokens.' + token.id, '');
    }
    let effect = chris.findEffect(token.actor, 'Web');
    if (!effect) return;
    let originUuid = template.flags['midi-qol']?.originUuid;
    if (!originUuid) return;
    if (effect.origin != originUuid) return;
    let bestOriginUuid = await wbestZone(token);
    if (!bestOriginUuid) await chris.removeEffect(effect);
}
export let web = {
    'winZone': winZone,
    'wleaveZone': wleaveZone
}
