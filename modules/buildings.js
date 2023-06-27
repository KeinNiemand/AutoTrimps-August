MODULES["buildings"] = {};
MODULES["buildings"].storageMainCutoff = 0.85;
MODULES["buildings"].storageLowlvlCutoff1 = 0.7;
MODULES["buildings"].storageLowlvlCutoff2 = 0.5;
MODULES["buildings"].smithiesBoughtThisZone = 0;

function safeBuyBuilding(building, amt) {
	if (!building || !amt)
		return false;
	if (isBuildingInQueue(building))
		return false;
	if (game.buildings[building].locked)
		return false;
	if (!canAffordBuilding(building, false, false, false, false, amt))
		return false;

	//Cap the amount we purchase to ensure we don't spend forever building
	if (!bwRewardUnlocked("Foremany") && game.global.world <= 10) amt = 1;

	const currBuyAmt = game.global.buyAmt;
	game.global.buyAmt = amt;

	if (!game.buildings[building].locked && canAffordBuilding(building)) {
		buyBuilding(building, true, true, amt);
	}

	game.global.buyAmt = currBuyAmt;
	if (building !== 'Trap') debug('Building ' + amt + ' ' + building + (amt > 1 ? 's' : ''), "buildings", '*hammer2');
	return true;
}

function buyStorage(hypoZone) {
	var customVars = MODULES["buildings"];
	var buildings = {
		'Barn': 'food',
		'Shed': 'wood',
		'Forge': 'metal'
	};
	for (var resource in buildings) {
		//Initialising variables
		var curRes = game.resources[buildings[resource]].owned;
		var maxRes = game.resources[buildings[resource]].max;
		//Identifying our max for the resource that's being checked
		maxRes = game.global.universe === 1 ? maxRes *= 1 + game.portal.Packrat.level * game.portal.Packrat.modifier :
			maxRes *= 1 + game.portal.Packrat.radLevel * game.portal.Packrat.modifier;
		maxRes = calcHeirloomBonus("Shield", "storageSize", maxRes);

		//Identifying the amount of resources you'd get from a Jestimp when inside a map otherwise setting the value to 1.1x current resource to ensure no storage issues
		var exoticValue = 0;
		if (game.global.mapsActive) {
			exoticValue = (getCurrentMapObject().name === 'Atlantrimp' || getCurrentMapObject().name === 'Trimple Of Doom') ? curRes :
				game.unlocks.imps.Jestimp ? scaleToCurrentMap(simpleSeconds(buildings[resource], 45)) :
					game.unlocks.imps.Chronoimp ? scaleToCurrentMap(simpleSeconds(buildings[resource], 5)) :
						exoticValue
		}
		//Skips buying sheds if you're not on one of your specified bonfire zones
		if (challengeActive('Hypothermia') && hypoZone > game.global.world && resource === 'Shed') continue;
		if ((game.global.world === 1 && curRes > maxRes * customVars.storageLowlvlCutoff1) ||
			(game.global.world >= 2 && game.global.world < 10 && curRes > maxRes * customVars.storageLowlvlCutoff2) ||
			(curRes + exoticValue > maxRes * customVars.storageMainCutoff)) {
			if (canAffordBuilding(resource, null, null, null, null, null) && game.triggers[resource].done) {
				safeBuyBuilding(resource, 1);
			}
		}
	}
}

function getPsStringLocal(what, rawNum) {
	if (what === "helium") return;
	var resOrder = ["food", "wood", "metal", "science", "gems", "fragments"];
	var books = ["farming", "lumber", "miner", "science"];
	var jobs = ["Farmer", "Lumberjack", "Miner", "Scientist", "Dragimp", "Explorer"];
	var index = resOrder.indexOf(what);
	var job = game.jobs[jobs[index]];
	var book = game.upgrades["Speed" + books[index]];
	var base = (what === "fragments") ? 0.4 : 0.5;
	//Add base
	//Add job count
	var currentCalc = job.owned * base;
	//Add books
	if (what !== "gems" && game.permaBoneBonuses.multitasking.owned > 0) {
		var str = (game.resources.trimps.owned >= game.resources.trimps.realMax()) ? game.permaBoneBonuses.multitasking.mult() : 0;
		currentCalc *= (1 + str);
	}
	//Add books
	if (typeof book !== 'undefined' && book.done > 0) {
		var bookStrength = Math.pow(1.25, book.done);
		currentCalc *= bookStrength;
	}
	//Add bounty
	if (what !== "gems" && game.upgrades.Bounty.done > 0) {
		currentCalc *= 2;
	}
	//Add Tribute
	if (what === "gems" && game.buildings.Tribute.owned > 0) {
		var tributeStrength = Math.pow(game.buildings.Tribute.increase.by, game.buildings.Tribute.owned);
		currentCalc *= tributeStrength;
	}
	//Add Whipimp
	if (game.unlocks.impCount.Whipimp > 0) {
		var whipStrength = Math.pow(1.003, game.unlocks.impCount.Whipimp);
		currentCalc *= (whipStrength);
	}
	//Add motivation
	if (getPerkLevel("Motivation") > 0) {
		var motivationStrength = (getPerkLevel("Motivation") * game.portal.Motivation.modifier);
		currentCalc *= (motivationStrength + 1);
	}
	if (!game.portal.Observation.radLocked && game.global.universe === 2 && game.portal.Observation.trinkets > 0) {
		var mult = game.portal.Observation.getMult();
		currentCalc *= mult;
	}
	//Add Fluffy Gatherer
	if (Fluffy.isRewardActive('gatherer')) {
		currentCalc *= 2;
	}
	var potionFinding;
	if (challengeActive('Alchemy')) potionFinding = alchObj.getPotionEffect("Potion of Finding");
	if (potionFinding > 1 && what !== "fragments" && what !== "science") {
		currentCalc *= potionFinding;
	}
	if (game.upgrades.Speedexplorer.done > 0 && what === "fragments") {
		var bonus = Math.pow(4, game.upgrades.Speedexplorer.done);
		currentCalc *= bonus;
	}
	if (challengeActive('Melt')) {
		currentCalc *= 10;
		var stackStr = Math.pow(game.challenges.Melt.decayValue, game.challenges.Melt.stacks);
		currentCalc *= stackStr;
	}
	if (challengeActive('Archaeology') && what !== "fragments") {
		var mult = game.challenges.Archaeology.getStatMult("science");
		currentCalc *= mult;
	}
	if (challengeActive('Insanity')) {
		var mult = game.challenges.Insanity.getLootMult();
		currentCalc *= mult;
	}
	if (game.challenges.Nurture.boostsActive() && what !== "fragments") {
		var mult = game.challenges.Nurture.getResourceBoost();
		currentCalc *= mult;
	}
	if (game.global.pandCompletions && what !== "fragments") {
		var mult = game.challenges.Pandemonium.getTrimpMult();
		currentCalc *= mult;
	}
	if (game.global.desoCompletions && what !== "fragments") {
		var mult = game.challenges.Desolation.getTrimpMult();
		currentCalc *= mult;
	}
	if (challengeActive('Daily')) {
		var mult = 0;
		if (typeof game.global.dailyChallenge.dedication !== 'undefined') {
			mult = dailyModifiers.dedication.getMult(game.global.dailyChallenge.dedication.strength);
			currentCalc *= mult;
		}
		if (typeof game.global.dailyChallenge.famine !== 'undefined' && what !== "fragments" && what !== "science") {
			mult = dailyModifiers.famine.getMult(game.global.dailyChallenge.famine.strength);
			currentCalc *= mult;
		}
	}
	if (challengeActive('Hypothermia') && what === "wood") {
		var mult = game.challenges.Hypothermia.getWoodMult(true);
		currentCalc *= mult;
	}
	if (((what === "food" || (what === "wood")) && game.buildings.Antenna.owned >= 5) || (what === "metal" && game.buildings.Antenna.owned >= 15)) {
		var mult = game.jobs.Meteorologist.getExtraMult();
		currentCalc *= mult;
	}
	if ((what === "food" || what === "metal" || what === "wood") && getParityBonus() > 1) {
		var mult = getParityBonus();
		currentCalc *= mult;
	}
	if ((what === "food" || what === "metal" || what === "wood") && autoBattle.oneTimers.Gathermate.owned && game.global.universe === 2) {
		var mult = autoBattle.oneTimers.Gathermate.getMult();
		currentCalc *= mult;
	}
	var heirloomBonus = calcHeirloomBonus("Staff", jobs[index] + "Speed", 0, true);
	if (heirloomBonus > 0) {
		currentCalc *= ((heirloomBonus / 100) + 1);
	}
	//Add player
	if (game.global.playerGathering === what) {
		if ((game.talents.turkimp2.purchased || game.global.turkimpTimer > 0) && (what === "food" || what === "wood" || what === "metal")) {
			var tBonus = 50;
			if (game.talents.turkimp2.purchased) tBonus = 100;
			else if (game.talents.turkimp2.purchased) tBonus = 75;
			currentCalc *= (1 + (tBonus / 100));
		}
		var playerStrength = getPlayerModifier();
		currentCalc += playerStrength;

	}
	//Add Loot	ALWAYS LAST
	if (game.options.menu.useAverages.enabled) {
		var avg = getAvgLootSecond(what);
		if (avg > 0.001) {
			currentCalc += avg;
		}
	}
	if (rawNum) return currentCalc;
	game.global.lockTooltip = false;
}

function advancedNurseries() {
	if (!getPageSetting('advancedNurseries')) return false;
	if (game.stats.highestLevel.valueTotal() < 230) return false;
	//Builds nurseries if lacking health & shouldn't HD farm.
	//Only build nurseries if: A) Lacking Health & B) Doesn't need to HD farm & C) Has max health map stacks
	//Also, it requires less health during spire
	const a = hdStats.hitsSurvived < targetHitsSurvived();
	const b = !hdFarm(true).shouldRun;
	const c = game.global.mapBonus >= getPageSetting('mapBonusHealth');
	return (a && b && c);
}

function mostEfficientHousing() {

	//Housing
	const HousingTypes = ['Hut', 'House', 'Mansion', 'Hotel', 'Resort', 'Gateway', 'Collector'];
	// Which houses we actually want to check
	var housingTargets = [];

	const buildingSettings = getPageSetting('buildingSettingsArray');
	const resourcefulMod = game.global.universe === 1 ? Math.pow(1 - game.portal.Resourceful.modifier, game.portal.Resourceful.level) : 1;

	for (var house of HousingTypes) {
		var maxHousing = buildingSettings[house].buyMax === 0 ? Infinity : buildingSettings[house].buyMax;
		if (!game.buildings[house].locked && game.buildings[house].owned < maxHousing) {
			housingTargets.push(house);
		}
	}

	var mostEfficient = {
		name: "",
		time: Infinity
	}
	var dontbuy = [];

	for (var housing of housingTargets) {

		var worstTime = -Infinity;
		var currentOwned = game.buildings[housing].owned;
		var buildingspending = buildingSettings[housing].percent / 100
		//If setting is disabled then don't buy building.
		if (!buildingSettings[housing].enabled) dontbuy.push(housing);
		//Stops Collectors being purchased when on Quest gem quests.
		if (challengeActive('Quest') && currQuest() === 4 && housing === 'Collector') dontbuy.push(housing);
		//Stops buildings that cost wood from being pushed if we're running Hypothermia and have enough wood for a bonfire.
		if (challengeActive('Hypothermia') && (housing !== 'Collector' || housing !== 'Gateway') && game.resources.wood.owned > game.challenges.Hypothermia.bonfirePrice()) dontbuy.push(housing);
		//Stops Food buildings being pushed to queue if Tribute Farming with Buy Buildings toggle disabled.
		if (mapSettings.mapName === 'Tribute Farm' && !mapSettings.buyBuildings && housing !== 'Collector') dontbuy.push(housing);

		var housingBonus = game.buildings[housing].increase.by;
		if (!game.buildings.Hub.locked) {
			var hubAmt = 1;
			if (housing === 'Collector') hubAmt = autoBattle.oneTimers.Collectology.owned ? (2 + Math.floor((autoBattle.maxEnemyLevel - 1) / 30)) : 1;
			housingBonus += (hubAmt * 25000);
		}

		for (var resource in game.buildings[housing].cost) {
			// Get production time for that resource
			var baseCost = game.buildings[housing].cost[resource][0];
			var costScaling = game.buildings[housing].cost[resource][1];
			var avgProduction = getPsStringLocal(resource, true);
			if (avgProduction <= 0) avgProduction = 1;
			if (challengeActive('Transmute') && resource === 'metal') avgProduction = getPsStringLocal('wood', true);
			if (Math.max(baseCost * Math.pow(costScaling, currentOwned) * resourcefulMod) > (game.resources[resource].owned// - resourceNeeded[resource]
			) * buildingspending) dontbuy.push(housing);
			if (game.global.universe === 2 && housing === 'Gateway' && resource === 'fragments' && buildingSettings.SafeGateway.enabled && (buildingSettings.SafeGateway.zone === 0 || buildingSettings.SafeGateway.zone > game.global.world)) {
				if (game.resources[resource].owned < ((perfectMapCost_Actual(10, getAvailableSpecials('lmc', true)) * buildingSettings.SafeGateway.mapCount) + Math.max(baseCost * Math.pow(costScaling, currentOwned)))) dontbuy.push(housing);
			}
			// Only keep the slowest producer, aka the one that would take the longest to generate resources for
			worstTime = Math.max((baseCost * Math.pow(costScaling, currentOwned - 1) * resourcefulMod) / (avgProduction * housingBonus), worstTime);
		}

		if (mostEfficient.time > worstTime && !dontbuy.includes(housing)) {
			mostEfficient.name = housing;
			mostEfficient.time = worstTime;
		}
	}
	if (mostEfficient.name === "") mostEfficient.name = null;

	return mostEfficient.name;
}

function buyBuildings() {

	if (game.jobs.Farmer.locked || game.resources.trimps.owned === 0) return;
	if (game.global.world === 1 && game.upgrades.Miners.allowed && !game.upgrades.Miners.done) return;

	//Disabling autoBuildings if AT AutoStructure is disabled.
	if (!getPageSetting('buildingsType')) return;

	const buildingSettings = getPageSetting('buildingSettingsArray');

	var hypoZone = 0;
	if (challengeActive('Hypothermia') && getPageSetting('hypothermiaDefaultSettings').active && getPageSetting('hypothermiaDefaultSettings').autostorage && getPageSetting('hypothermiaSettings').length > 0) {
		const rHFBaseSettings = getPageSetting('hypothermiaSettings');
		for (var y = 0; y < rHFBaseSettings.length; y++) {
			if (!rHFBaseSettings[y].active) {
				continue;
			}
			hypoZone = rHFBaseSettings[y].world;
			break;
		}
	}
	// Storage, shouldn't be needed anymore that autostorage is lossless. Hypo fucked this statement :(
	//Turn on autostorage if you're past your last farmzone and you don't need to save wood anymore. Else will have to force it to purchase enough storage up to the cost of whatever bonfires
	if (!game.global.autoStorage && game.global.world >= hypoZone)
		toggleAutoStorage(false);

	//Disables AutoStorage when our Hypo farm zone is greater than current world zone
	if (game.global.world < hypoZone) {
		if (game.global.autoStorage)
			toggleAutoStorage(false);
	}

	//Buys storage buildings when about to cap resources
	if (!game.global.improvedAutoStorage) {
		buyStorage(hypoZone);
	}

	//Disable buying buildings inside of unique maps
	if (game.global.mapsActive && (getCurrentMapObject().name === 'Trimple Of Doom' || getCurrentMapObject().name === 'Atlantrimp' || getCurrentMapObject().name === 'Melting Point' || getCurrentMapObject().name === 'Frozen Castle') || runningAtlantrimp) {
		if (game.global.repeatMap) repeatClicked();
		return;
	}

	if (typeof runningAtlantrimp !== 'undefined' && runningAtlantrimp)
		return;

	if (challengeActive('Quest') && getPageSetting('quest') && game.global.world >= game.challenges.Quest.getQuestStartZone()) {
		//Still allows you to buy tributes during gem quests
		if (([4].indexOf(currQuest()) >= 0))
			buyTributes();
		//Return when shouldn't run during quest
		if ((game.global.lastClearedCell < 90 && ([1, 2, 3, 4].indexOf(currQuest()) >= 0)))
			return
	}

	if (game.global.universe === 1) {
		//Nurseries Init
		if (!game.buildings.Nursery.locked) {
			const nurseryZoneOk = buildingSettings.Nursery.enabled && game.global.world >= buildingSettings.Nursery.fromZ;
			const dailyPrefix = challengeActive('Daily') ? 'd' : '';

			var nurseryPreSpire = isDoingSpire() && game.buildings.Nursery.owned < getPageSetting(dailyPrefix + 'PreSpireNurseries') ? getPageSetting(dailyPrefix + 'PreSpireNurseries') : 0;

			var nurseryAmt = nurseryPreSpire > 0 ? nurseryPreSpire : Math.max(nurseryPreSpire, buildingSettings.Nursery.buyMax);
			if (nurseryAmt === 0 && !getPageSetting('advancedNurseries')) nurseryAmt = Infinity;

			var nurseryPct = buildingSettings.Nursery.percent / 100;
			var nurseryCanAfford = calculateMaxAffordLocal(game.buildings.Nursery, true, false, false, Math.max(0, (nurseryAmt - game.buildings.Nursery.owned)), nurseryPct);
			var nurseryCanAffordNoNurseryLimit = calculateMaxAffordLocal(game.buildings.Nursery, true, false, false, Infinity, nurseryPct);
			if (nurseryZoneOk || nurseryPreSpire > 0) {
				if (nurseryPreSpire > 0 && nurseryCanAfford > 0) safeBuyBuilding('Nursery', nurseryCanAfford);
				else if (advancedNurseries() && calculateMaxAffordLocal(game.buildings.Nursery, true, false, false, 1, nurseryPct) > 0) { safeBuyBuilding('Nursery', Math.max(Math.min(nurseryCanAffordNoNurseryLimit, getPageSetting('advancedNurseriesAmount')),1)); }
				else if (nurseryCanAfford > 0) safeBuyBuilding('Nursery', nurseryCanAfford);
			}
		}

		//Gyms
		if (!game.buildings.Gym.locked && buildingSettings.Gym.enabled) {
			var gymAmt = buildingSettings.Gym.buyMax === 0 ? Infinity : buildingSettings.Gym.buyMax;
			var gymPct = buildingSettings.Gym.percent / 100;
			var gymCanAfford = calculateMaxAffordLocal(game.buildings.Gym, true, false, false, (gymAmt - game.buildings.Gym.purchased), gymPct);
			if (gymAmt > game.buildings.Gym.purchased && gymCanAfford > 0) {
				if (!needGymystic())
					safeBuyBuilding('Gym', gymCanAfford);
			}
		}

		//Wormhole
		if (!game.buildings.Wormhole.locked && buildingSettings.Wormhole.enabled) {
			var wormholeAmt = buildingSettings.Wormhole.buyMax === 0 ? Infinity : buildingSettings.Wormhole.buyMax;
			var wormholePct = buildingSettings.Wormhole.percent / 100;
			var wormholeCanAfford = calculateMaxAffordLocal(game.buildings.Wormhole, true, false, false, (wormholeAmt - game.buildings.Wormhole.purchased), wormholePct);
			if (wormholeAmt > game.buildings.Wormhole.purchased && wormholeCanAfford > 0) {
				safeBuyBuilding('Wormhole', wormholeCanAfford);
			}
		}

		//Warpstations
		if (!game.buildings.Warpstation.locked && getPageSetting('warpstation')) {
			var firstGigaOK = MODULES["upgrades"].autoGigas === false || game.upgrades.Gigastation.done > 0;
			var warpstationAmt = Math.floor(game.upgrades.Gigastation.done * getPageSetting('deltaGigastation')) + getPageSetting('firstGigastation');
			if (game.upgrades.Gigastation.done === 0 && getPageSetting('autoGigas')) warpstationAmt = Infinity;
			var gigaCapped = game.buildings.Warpstation.owned >= warpstationAmt;
			var warpstationCanAfford = calculateMaxAffordLocal(game.buildings.Warpstation, true, false, false, (warpstationAmt - game.buildings.Warpstation.owned), 1)

			if (!(firstGigaOK && gigaCapped) && warpstationCanAfford > 0)
				safeBuyBuilding('Warpstation', warpstationCanAfford);
		}
	}

	if (game.global.universe === 2) {
		//Smithy purchasing
		if (!game.buildings.Smithy.locked) {
			var smithyAmt = buildingSettings.Smithy.buyMax === 0 ? Infinity : buildingSettings.Smithy.buyMax;
			var smithyPct = buildingSettings.Smithy.percent / 100;
			var smithyCanAfford = calculateMaxAffordLocal(game.buildings.Smithy, true, false, false, (smithyAmt - game.buildings.Smithy.purchased), smithyPct);

			//Purchasing a smithy whilst on Quest
			if (challengeActive('Quest') && getPageSetting('quest')) {
				//Resetting smithyCanAfford to avoid any accidental purchases during Quest.
				smithyCanAfford = 0;
				if ((MODULES["buildings"].smithiesBoughtThisZone < game.global.world || currQuest() === 10) && canAffordBuilding('Smithy', null, null, false, false, 1)) {
					var smithycanBuy = calculateMaxAfford(game.buildings.Smithy, true, false, false, true, 1);
					var questEndZone = !game.global.runningChallengeSquared ? 85 : getPageSetting('questSmithyZone') === -1 ? Infinity : getPageSetting('questSmithyZone')
					var questZones = Math.floor(((questEndZone - game.global.world) / 2) - 1);
					if (questZones < 0) questZones = 0;
					//Buying smithies that won't be needed for quests before user entered end goal or for Smithy quests
					smithyCanAfford = smithycanBuy > questZones ? smithycanBuy - questZones : currQuest() === 10 ? 1 : 0;
				}
			}
			//Don't buy Smithies when you can afford a bonfire on Hypo.
			if (challengeActive('Hypothermia') && game.resources.wood.owned > game.challenges.Hypothermia.bonfirePrice()) smithyCanAfford = 0;

			if (((buildingSettings.Smithy.enabled && smithyAmt > game.buildings.Smithy.purchased) || challengeActive('Quest')) && smithyCanAfford > 0) {
				safeBuyBuilding("Smithy", smithyCanAfford);
				MODULES["buildings"].smithiesBoughtThisZone = game.global.world;
			}
		}

		//Laboratory Purchasing (Nurture)
		if (challengeActive('Nurture') && !game.buildings.Laboratory.locked && buildingSettings.Laboratory.enabled) {
			var labAmt = buildingSettings.Laboratory.buyMax === 0 ? Infinity : buildingSettings.Laboratory.buyMax;
			var labPct = buildingSettings.Laboratory.percent / 100;
			var labCanAfford = calculateMaxAffordLocal(game.buildings.Laboratory, true, false, false, (labAmt - game.buildings.Laboratory.purchased), labPct);
			if (labAmt > game.buildings.Laboratory.purchased && labCanAfford > 0) {
				safeBuyBuilding('Laboratory', labCanAfford);
			}
		}

		//Microchip
		if (!game.buildings.Microchip.locked && canAffordBuilding('Microchip', null, null, false, false, 1)) {
			safeBuyBuilding('Microchip', 1);
		}
	}

	buyTributes();

	//Housing 
	var boughtHousing = false;
	do {
		boughtHousing = false;
		var housing = mostEfficientHousing();
		if (housing === null) continue;
		if (isBuildingInQueue(housing)) continue;
		if (!canAffordBuilding(housing)) continue;

		var housingAmt = buildingSettings[housing].buyMax === 0 ? Infinity : buildingSettings[housing].buyMax;
		var buildingspending = buildingSettings[housing].percent / 100;
		var maxCanAfford = calculateMaxAffordLocal(game.buildings[housing], true, false, false, (housingAmt - game.buildings[housing].purchased), buildingspending);
		if (((housing !== null && canAffordBuilding(housing, false, false, false, false, 1)) && (game.buildings[housing].purchased < (housingAmt === -1 ? Infinity : housingAmt)))) {
			if (mapSettings.mapName === 'Smithy Farm' && housing !== 'Gateway')
				return;
			else if (mapSettings.mapName === 'Tribute Farm' && !mapSettings.buyBuildings)
				return;
			else if (maxCanAfford > 0) {
				if (!canAffordBuilding(housing)) continue;
				safeBuyBuilding(housing, maxCanAfford);
			}
			else
				return;
			boughtHousing = true;
		}
	} while (boughtHousing)
}

function buyTributes() {
	const buildingSettings = getPageSetting('buildingSettingsArray');
	var affordableMets = 0;
	if (game.global.universe === 2) {
		const jobSettings = getPageSetting('jobSettingsArray');
		if (jobSettings.Meteorologist.enabled || mapSettings.shouldTribute || (mapSettings.mapName === 'Smithy Farm' && mapSettings.gemFarm)) {
			affordableMets = getMaxAffordable(
				game.jobs.Meteorologist.cost.food[0] * Math.pow(game.jobs.Meteorologist.cost.food[1], game.jobs.Meteorologist.owned),
				game.resources.food.owned * (jobSettings.Meteorologist.percent / 100),
				game.jobs.Meteorologist.cost.food[1],
				true
			);
		}
	}
	//Won't buy Tributes if they're locked or if a meteorologist can be purchased as that should always be the more efficient purchase
	if (!game.buildings.Tribute.locked && (game.jobs.Meteorologist.locked || !(affordableMets > 0 && !game.jobs.Meteorologist.locked && !mapSettings.shouldTribute))) {
		if ((!buildingSettings.Tribute.enabled || mapSettings.shouldMeteorologist || mapSettings.mapName === 'Worshipper Farm') && !mapSettings.shouldTribute) return;
		//Spend 100% of food on Tributes if Tribute Farming otherwise uses the value in RTributeSpendingPct.
		var tributePct = mapSettings.mapName === 'Tribute Farm' && mapSettings.tribute > 0 ? 1 : buildingSettings.Tribute.percent > 0 ? buildingSettings.Tribute.percent / 100 : 1;

		var tributeAmt = buildingSettings.Tribute.buyMax === 0 ? Infinity : mapSettings.mapName === 'Tribute Farm' && mapSettings.tribute > buildingSettings.Tribute.buyMax ? mapSettings.tribute : buildingSettings.Tribute.buyMax;
		if ((mapSettings.mapName === 'Smithy Farm' && mapSettings.gemFarm) || currQuest() === 4) {
			tributeAmt = Infinity;
			tributePct = 1;
		}
		var tributeCanAfford = calculateMaxAffordLocal(game.buildings.Tribute, true, false, false, (tributeAmt - game.buildings.Tribute.purchased), tributePct);
		if (tributeAmt > game.buildings.Tribute.purchased && tributeCanAfford > 0) {
			safeBuyBuilding('Tribute', tributeCanAfford);
		}
	}
}
