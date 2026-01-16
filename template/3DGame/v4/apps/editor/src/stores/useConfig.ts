import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { GameConfig, LawConfig, RulesConfig, WorldConfig, SpaceConfig, EntityConfig, SkillConfig, LLMConfig, PostProcessConfig, LODConfig, PhysicsAdvancedConfig, AudioConfig, NetworkConfig, UIConfig, SaveConfig, InputConfig, AIAdvancedConfig, ParticleConfig, WeatherConfig, TimeEffectConfig, VehicleConfig, AnimationConfig, TerrainConfig, LightingConfig, I18nConfig, PerformanceConfig, BuffConfig } from '@/types/config'
import { CfgHotLoader, type CfgLsnOpt, type CfgLsnCbk, type CfgSnapshot } from '@engine/common'

export const useConfigStore = defineStore('config', () => {
	const proMode = ref(false)
	const editingAsset = ref<{ type: string; id: string } | null>(null)

	const laws = reactive<Record<string, LawConfig>>({
		causality: { enabled: true, costType: 'soul', costAmount: 100, costReduction: 0, exemptTags: [] },
		equivalent_exchange: { enabled: true, costType: 'resource', costAmount: 100, costReduction: 0, exemptTags: [] },
		conservation: { enabled: true, costType: 'lifespan', costAmount: 100, costReduction: 0, exemptTags: [] },
		contract: { enabled: true, costType: 'karma', costAmount: 100, costReduction: 0, exemptTags: [] },
		mortality: { enabled: true, costType: 'permanent', costAmount: 100, costReduction: 0, exemptTags: [] },
		identity: { enabled: true, costType: 'health', costAmount: 100, costReduction: 0, exemptTags: [] }
	})

	const rules = reactive<RulesConfig>({
		combat: {
			friendlyFire: false,
			pvp: true,
			levelScaling: false,
			resistanceCap: 0.75,
			dodgeCap: 0.5,
			critMul: 1.5,
			damageFormula: ''
		},
		death: {
			permaDeath: false,
			expLoss: 0.05,
			itemDrop: false,
			respawnDelay: 5,
			respawnLoc: 'checkpoint',
			soulRecovery: true
		},
		progression: {
			levelCap: 100,
			expCurve: 'exponential',
			skillPerLevel: 3,
			attrPerLevel: 5,
			canRespec: true,
			respecCost: 1000
		},
		economy: {
			tradeTax: 0.05,
			inflation: 0,
			maxInventory: 100,
			bankInterest: 0.01
		},
		social: {
			maxParty: 6,
			maxGuild: 100,
			marriage: true
		}
	})

	const world = reactive<WorldConfig>({
		era: 'modern',
		techLevel: 5,
		magicLevel: 5,
		plane: 'material',
		gravityMul: 1,
		timeFlow: 1,
		manaLevel: 5,
		physics: {
			gravityX: 0,
			gravityY: -9.8,
			gravityZ: 0,
			maxSubSteps: 4,
			tps: 60,
			sleepEnabled: true,
			defaultRestitution: 0.3,
			defaultFriction: 0.5,
			solverIterations: 10,
			broadphaseMargin: 0.04,
			ccdEnabled: false,
			ccdVelThreshold: 1.0
		},
		render: {
			mode: 'realistic',
			shadowIntensity: 0.5,
			aoStrength: 1.0,
			specularPower: 32,
			rimPower: 3.0,
			smoothness: 0.5,
			steps: 2,
			outlineWidth: 0.02,
			outlineColor: '#000000',
			outlineEntity: true,
			outlineTerrain: false
		},
		camera: {
			fov: 0.785,
			near: 0.1,
			far: 1000
		},
		physicsAdvanced: {
			ragdoll: {
				enabled: true,
				damping: 0.8
			},
			cloth: {
				enabled: true,
				iterations: 4,
				stiffness: 0.9
			},
			fluid: {
				enabled: false,
				viscosity: 0.01,
				density: 1000
			},
			rope: {
				enabled: true,
				segments: 20,
				stiffness: 0.9
			},
			destruction: {
				enabled: true,
				fragments: 8,
				debrisLife: 10
			}
		},
		postProcess: {
			shadow: {
				enabled: true,
				resolution: 2048,
				bias: 0.005,
				intensity: 0.7,
				cascades: 3,
				distance: 100
			},
			ssao: {
				enabled: true,
				radius: 0.5,
				intensity: 1.0,
				samples: 32,
				bias: 0.025
			},
			bloom: {
				enabled: true,
				threshold: 1.0,
				intensity: 0.5,
				radius: 0.4
			},
			gi: {
				enabled: false,
				intensity: 1.0,
				probeSpacing: 4.0
			},
			fog: {
				enabled: false,
				type: 0,
				density: 0.01,
				start: 10,
				end: 100,
				color: '#a0a0b0'
			},
			volumetric: {
				enabled: false,
				intensity: 0.5,
				samples: 32
			},
			tonemap: {
				enabled: true,
				exposure: 1.0,
				gamma: 2.2,
				contrast: 1.0,
				saturation: 1.0
			},
			ssr: {
				enabled: false,
				maxSteps: 64,
				thickness: 0.5
			},
			dof: {
				enabled: false,
				focusDist: 10,
				aperture: 0.05
			}
		},
		lod: {
			enabled: true,
			tier: 2,
			distMul: 1.0,
			maxInstances: 1000,
			cullDist: 500
		}
	})

	const space = reactive<SpaceConfig>({
		style: 'forest',
		ruined: false,
		temp: 20,
		daylight: 80,
		sunColor: '#fffaed',
		sunIntensity: 100,
		pocket: {
			sizeX: 100,
			sizeY: 50,
			sizeZ: 100,
			timeFlow: 0.5,
			pvp: false,
			godMode: true
		},
		mapGen: {
			seed: 12345,
			seaLevel: 32,
			mountainHeight: 48,
			continentScale: 0.002,
			detailScale: 0.02,
			tempScale: 0.00002,
			humidScale: 0.00002,
			biomeMinSize: 50000
		},
		light: {
			ambientR: 0.3,
			ambientG: 0.3,
			ambientB: 0.35,
			sunDirX: 0.5,
			sunDirY: 0.3,
			sunDirZ: 0.8,
			sunColorR: 1.0,
			sunColorG: 0.95,
			sunColorB: 0.9
		},
		plane: 'material',
		dimension: {
			type: 'domain',
			radius: 100,
			duration: 60
		}
	})

	const entities = ref<EntityConfig[]>([
		{
			id: 'entity_1',
			name: '人类',
			desc: '最常见的智慧生物，拥有高度的适应性和学习能力。',
			tags: ['humanoid', 'sentient'],
			hp: 100,
			atk: 10,
			def: 5,
			spd: 5,
			locomotion: 'biped',
			locomotionMod: 'none',
			size: 'medium',
			rarity: 'common',
			collider: 'capsule',
			mass: 70,
			drag: 0.1,
			angDrag: 0.05,
			gravityScale: 1,
			bounce: 0,
			friction: 0.5
		}
	])

	const factions = ref<{ id: string; name: string; color: string }[]>([
		{ id: 'faction_1', name: '默认势力', color: '#166d3b' }
	])

	const skills = ref<SkillConfig[]>([
		{
			id: 'skill_1',
			name: '火球术',
			icon: '🔥',
			type: 'active',
			category: 'attack',
			target: 'enemy',
			range: 10,
			radius: 0,
			cd: 5,
			castTime: 0,
			costType: 'mp',
			costVal: 20,
			costItem: '',
			canCrit: true,
			canDodge: true,
			canBlock: false,
			ignoreArmor: false,
			interrupt: false,
			effects: []
		}
	])

	const modules = reactive({
		core: {
			physics: true, animation: true, combat: true, ability: true,
			equipment: true, progression: true, behavior: true, render: true,
			audio: true, lifecycle: true, interaction: true, network: true
		} as Record<string, boolean>,
		advanced: {
			transformation: false, dimension: false, contract: false, soul: false,
			fate: false, crafting: false, territory: false, evolution: false
		} as Record<string, boolean>,
		worldview: {
			hacking: false, magic: false, qi: false, martial: false,
			ninjutsu: false, haki: false, jujutsu: false, force: false,
			breath: false, magecraft: false, esper: false, stand: false,
			companion: false, nen: false, alchemy: false
		} as Record<string, boolean>
	})

	const systems = reactive({
		time: {
			speed: 60, initTime: '08:00', initDate: '2024-01-01',
			canPause: true, canRewind: false, rewindMax: 10
		},
		economy: { currencyName: '金币', currencyMax: 999999999, autoLoot: true },
		faction: { repMax: 100000, repMin: -100000, repKill: 10 },
		quest: { maxActive: 20, dailyCount: 5, autoTrack: true },
		dialogue: { speed: 50, autoPlay: false, canSkip: true },
		inventory: { initSlots: 30, maxSlots: 100, stackLimit: 99, weightLimit: false },
		combat: { lockMode: 'hard', lockRange: 30, comboWindow: 500, iframeDuration: 200 }
	})

	const ai = reactive({
		behavior: { template: 'neutral' as const, alertRadius: 15, chaseRadius: 30, returnRadius: 50 },
		state: { initial: 'idle', transDelay: 0.5 },
		utility: { evalInterval: 0.5, randomFactor: 10 },
		pathfind: { algo: 'astar' as const, updateFreq: 0.5, avoidRadius: 0.5 },
		perception: { sightRange: 30, sightAngle: 120, hearRange: 15 },
		dialogue: {
			canTalk: false,
			personality: '',
			knowledge: [] as string[],
			talkRange: 5,
			greeting: ''
		}
	})

	const llm = reactive<LLMConfig>({
		provider: 'openai',
		endpoint: '',
		apiKey: '',
		model: 'gpt-4'
	})

	const audio = reactive<AudioConfig>({
		master: {
			volume: 1.0,
			muted: false
		},
		channels: {
			music: 0.8,
			sfx: 1.0,
			voice: 1.0,
			ambient: 0.6
		},
		spatial: {
			enabled: true,
			maxDist: 50,
			rolloff: 1.0,
			refDist: 1
		},
		occlusion: {
			enabled: true,
			maxAttenuation: 0.9,
			lowpassFreq: 800,
			highpassFreq: 200
		},
		doppler: {
			enabled: true,
			speedOfSound: 343,
			maxShift: 2.0
		},
		compressor: {
			enabled: true,
			threshold: -24,
			ratio: 4,
			attack: 0.003,
			release: 0.25
		},
		dynamicMusic: {
			enabled: true,
			fadeTime: 2.0,
			syncLayers: true
		}
	})

	const network = reactive<NetworkConfig>({
		transport: {
			url: 'ws://localhost:8080',
			reconnect: true,
			reconnectDelay: 1000,
			reconnectMaxAttempts: 5,
			heartbeatInterval: 30000,
			timeout: 10000
		},
		sync: {
			tickRate: 60,
			sendRate: 20,
			interpDelay: 100,
			maxPredictedInputs: 64,
			reconciliationThreshold: 0.1,
			snapshotBufferSize: 32
		},
		prediction: {
			enabled: true
		},
		compression: {
			enabled: true
		},
		lobby: {
			maxRooms: 100,
			maxPlayersPerRoom: 16,
			roomTimeout: 300000
		}
	})

	const ui = reactive<UIConfig>({
		hpBar: {
			showValue: true,
			showShield: false,
			bgColor: '#1a1a1a',
			hpColor: '#44cc44',
			hpLowColor: '#cc4444',
			shieldColor: '#6688cc',
			lowThreshold: 0.3,
			animSpeed: 5
		},
		minimap: {
			enabled: true,
			worldW: 1000,
			worldH: 1000,
			bgColor: '#1a2a1a',
			borderColor: '#446644',
			playerColor: '#00ff00',
			playerSize: 6,
			showGrid: true,
			gridColor: 'rgba(68, 102, 68, 0.3)',
			gridSize: 100,
			maskShape: 'rect',
			fogEnabled: false,
			viewRadius: 50
		},
		damageNumbers: {
			enabled: true,
			duration: 1000,
			fontSize: 16,
			critColor: '#ff4444',
			healColor: '#44ff44',
			normalColor: '#ffffff'
		}
	})

	const save = reactive<SaveConfig>({
		maxSlots: 10,
		backend: 'auto',
		autoSave: {
			enabled: true,
			interval: 300000
		},
		checkpoint: {
			enabled: true,
			maxCheckpoints: 5
		}
	})

	const input = reactive<InputConfig>({
		keyboard: {
			enabled: true,
			repeatDelay: 500,
			repeatRate: 50
		},
		mouse: {
			enabled: true,
			sensitivity: 1.0,
			invertY: false,
			rawInput: false
		},
		gamepad: {
			enabled: true,
			deadzone: 0.15,
			vibration: true,
			axisThreshold: 0.5
		},
		touch: {
			enabled: true,
			multiTouch: true,
			tapThreshold: 200
		},
		gesture: {
			enabled: true,
			swipeThreshold: 50,
			pinchThreshold: 0.1,
			rotateThreshold: 15,
			holdDuration: 500
		}
	})

	const aiAdvanced = reactive<AIAdvancedConfig>({
		pathfind: {
			enabled: true,
			gridSize: 1.0,
			maxNodes: 1000,
			algo: 'astar',
			updateFreq: 0.5,
			avoidRadius: 0.5
		},
		perception: {
			enabled: true,
			viewAngle: 120,
			viewDist: 50,
			hearDist: 20,
			memoryDuration: 10,
			updateRate: 0.2
		},
		goap: {
			enabled: true,
			maxActions: 10,
			replanInterval: 1.0,
			costThreshold: 100
		},
		tactical: {
			enabled: true,
			coverWeight: 1.0,
			flankWeight: 0.8,
			heightWeight: 0.5,
			distanceWeight: 0.6
		},
		flock: {
			enabled: true,
			separation: 1.5,
			alignment: 1.0,
			cohesion: 1.0,
			maxSpeed: 5,
			neighborDist: 10,
			avoidDist: 2
		},
		aggro: {
			enabled: true,
			decayRate: 5,
			maxTargets: 5,
			threatMul: 1.0,
			healThreatMul: 0.5,
			proximityBonus: 10
		},
		navmesh: {
			enabled: true,
			cellSize: 0.3,
			cellHeight: 0.2,
			agentHeight: 2.0,
			agentRadius: 0.5,
			maxSlope: 45,
			maxStepHeight: 0.4,
			minRegionArea: 8
		}
	})

	const particle = reactive<ParticleConfig>({
		maxParticles: 10000,
		gpuAcceleration: true,
		sortMode: 'distance',
		cullMode: 'frustum',
		cullDistance: 100,
		lodBias: 1.0
	})

	const weather = reactive<WeatherConfig>({
		enabled: true,
		current: 'clear',
		transitionTime: 5,
		windStrength: 0.5,
		windDirection: 0,
		precipitation: 0,
		temperature: 20,
		humidity: 50
	})

	const timeEffect = reactive<TimeEffectConfig>({
		slowMo: {
			enabled: true,
			minScale: 0.1,
			transitionSpeed: 2.0
		},
		freeze: {
			enabled: true,
			duration: 3
		},
		rewind: {
			enabled: false,
			maxDuration: 10,
			recordRate: 30
		}
	})

	const vehicle = reactive<VehicleConfig>({
		enabled: true,
		physics: {
			wheelFriction: 1.0,
			suspensionStiffness: 50,
			suspensionDamping: 2.3,
			maxSteerAngle: 35,
			enginePower: 1000,
			brakePower: 3000,
			mass: 1500
		},
		camera: {
			followDist: 8,
			followHeight: 3,
			lookAhead: 2
		}
	})

	const animation = reactive<AnimationConfig>({
		skeleton: {
			maxBones: 64,
			ikEnabled: true,
			ikIterations: 10
		},
		blend: {
			crossfadeTime: 0.2,
			blendMode: 'replace'
		},
		lod: {
			enabled: true,
			distThreshold: 30,
			reduceBones: true
		}
	})

	const terrain = reactive<TerrainConfig>({
		generation: {
			chunkSize: 64,
			maxChunks: 256,
			detailScale: 1.0
		},
		vegetation: {
			enabled: true,
			density: 0.5,
			maxInstances: 10000,
			windStrength: 0.3
		},
		water: {
			enabled: true,
			waveAmplitude: 0.5,
			waveFrequency: 1.0,
			reflections: true,
			refractions: true
		}
	})

	const lighting = reactive<LightingConfig>({
		probes: {
			enabled: true,
			spacing: 4,
			resolution: 32
		},
		dynamic: {
			maxLights: 16,
			shadowCasters: 4,
			updateRate: 30
		},
		ambient: {
			mode: 'gradient',
			intensity: 0.3
		}
	})

	const i18n = reactive<I18nConfig>({
		defaultLocale: 'zh-CN',
		fallbackLocale: 'en',
		supportedLocales: ['zh-CN', 'en', 'ja'],
		dateFormat: 'YYYY-MM-DD',
		numberFormat: '0,0.00',
		currencyCode: 'CNY'
	})

	const performance = reactive<PerformanceConfig>({
		profiling: {
			enabled: false,
			sampleRate: 60,
			maxSamples: 300
		},
		debugUI: {
			enabled: false,
			position: 'top-left',
			showFPS: true,
			showMemory: true,
			showDrawCalls: false
		},
		budget: {
			targetFPS: 60,
			maxDrawCalls: 2000,
			maxTriangles: 500000
		}
	})

	const buff = reactive<BuffConfig>({
		display: {
			maxVisible: 10,
			iconSize: 32,
			showDuration: true,
			showStacks: true
		},
		limits: {
			maxBuffs: 20,
			maxDebuffs: 20,
			maxStacks: 99
		},
		update: {
			tickRate: 20,
			batchSize: 10
		}
	})

	function collectAll(): GameConfig {
		return {
			laws: { ...laws },
			rules: { ...rules },
			world: { ...world },
			space: { ...space },
			entities: entities.value.reduce((acc: Record<string, EntityConfig>, e) => ({ ...acc, [e.id]: e }), {}),
			factions: factions.value.reduce((acc: Record<string, { id: string; name: string; color: string }>, f) => ({ ...acc, [f.id]: f }), {}),
			skills: skills.value.reduce((acc: Record<string, SkillConfig>, s) => ({ ...acc, [s.id]: s }), {}),
			modules: { ...modules },
			systems: { ...systems },
			ai: { ...ai },
			aiAdvanced: { ...aiAdvanced },
			llm: { ...llm },
			audio: { ...audio },
			network: { ...network },
			ui: { ...ui },
			save: { ...save },
			input: { ...input },
			particle: { ...particle },
			weather: { ...weather },
			timeEffect: { ...timeEffect },
			vehicle: { ...vehicle },
			animation: { ...animation },
			terrain: { ...terrain },
			lighting: { ...lighting },
			i18n: { ...i18n },
			performance: { ...performance },
			buff: { ...buff }
		}
	}

	function loadAll(cfg: GameConfig) {
		if (cfg.laws) Object.assign(laws, cfg.laws)
		if (cfg.rules) Object.assign(rules, cfg.rules)
		if (cfg.world) Object.assign(world, cfg.world)
		if (cfg.space) Object.assign(space, cfg.space)
		if (cfg.entities) entities.value = Object.entries(cfg.entities).map(([id, e]) => ({ ...(e as EntityConfig), id }))
		if (cfg.factions) factions.value = Object.entries(cfg.factions).map(([id, f]) => ({ ...(f as { name: string; color: string }), id }))
		if (cfg.skills) skills.value = Object.entries(cfg.skills).map(([id, s]) => ({ ...(s as SkillConfig), id }))
		if (cfg.modules) Object.assign(modules, cfg.modules)
		if (cfg.systems) Object.assign(systems, cfg.systems)
		if (cfg.ai) Object.assign(ai, cfg.ai)
		if (cfg.aiAdvanced) Object.assign(aiAdvanced, cfg.aiAdvanced)
		if (cfg.llm) Object.assign(llm, cfg.llm)
		if (cfg.audio) Object.assign(audio, cfg.audio)
		if (cfg.network) Object.assign(network, cfg.network)
		if (cfg.ui) Object.assign(ui, cfg.ui)
		if (cfg.save) Object.assign(save, cfg.save)
		if (cfg.input) Object.assign(input, cfg.input)
		if (cfg.particle) Object.assign(particle, cfg.particle)
		if (cfg.weather) Object.assign(weather, cfg.weather)
		if (cfg.timeEffect) Object.assign(timeEffect, cfg.timeEffect)
		if (cfg.vehicle) Object.assign(vehicle, cfg.vehicle)
		if (cfg.animation) Object.assign(animation, cfg.animation)
		if (cfg.terrain) Object.assign(terrain, cfg.terrain)
		if (cfg.lighting) Object.assign(lighting, cfg.lighting)
		if (cfg.i18n) Object.assign(i18n, cfg.i18n)
		if (cfg.performance) Object.assign(performance, cfg.performance)
		if (cfg.buff) Object.assign(buff, cfg.buff)
	}

	function reset() {
		Object.assign(laws, {
			causality: { enabled: true, costType: 'soul', costAmount: 100, costReduction: 0, exemptTags: [] },
			equivalent_exchange: { enabled: true, costType: 'resource', costAmount: 100, costReduction: 0, exemptTags: [] },
			conservation: { enabled: true, costType: 'lifespan', costAmount: 100, costReduction: 0, exemptTags: [] },
			contract: { enabled: true, costType: 'karma', costAmount: 100, costReduction: 0, exemptTags: [] },
			mortality: { enabled: true, costType: 'permanent', costAmount: 100, costReduction: 0, exemptTags: [] },
			identity: { enabled: true, costType: 'health', costAmount: 100, costReduction: 0, exemptTags: [] }
		})
		entities.value = [{
			id: 'entity_1',
			name: '人类',
			desc: '最常见的智慧生物，拥有高度的适应性和学习能力。',
			tags: ['humanoid', 'sentient'],
			hp: 100,
			atk: 10,
			def: 5,
			spd: 5,
			locomotion: 'biped',
			locomotionMod: 'none',
			size: 'medium',
			rarity: 'common',
			collider: 'capsule',
			mass: 70,
			drag: 0.1,
			angDrag: 0.05,
			gravityScale: 1,
			bounce: 0,
			friction: 0.5
		}]
		factions.value = [{ id: 'faction_1', name: '默认势力', color: '#166d3b' }]
		skills.value = [{
			id: 'skill_1', name: '火球术', icon: '🔥', type: 'active', category: 'attack', target: 'enemy',
			range: 10, radius: 0, cd: 5, castTime: 0, costType: 'mp', costVal: 20, costItem: '',
			canCrit: true, canDodge: true, canBlock: false, ignoreArmor: false, interrupt: false, effects: []
		}]
	}

	const hotLoader = new CfgHotLoader<GameConfig>(collectAll(), 50)

	function syncToHotLoader() {
		hotLoader.lodFromObj(collectAll())
	}

	function syncFromHotLoader() {
		loadAll(hotLoader.getRaw())
	}

	function subCfgChg(path: string, cbk: CfgLsnCbk, opt?: CfgLsnOpt): string {
		return hotLoader.sub(path, cbk, opt)
	}

	function unsubCfgChg(id: string) {
		hotLoader.unsub(id)
	}

	function snapshotCfg(desc?: string): string {
		syncToHotLoader()
		return hotLoader.snapshot(desc)
	}

	function bakCfg(id?: string): boolean {
		const result = hotLoader.bak(id)
		if (result) syncFromHotLoader()
		return result
	}

	function bakToPrvCfg(): boolean {
		syncToHotLoader()
		const result = hotLoader.bakToPrv()
		if (result) syncFromHotLoader()
		return result
	}

	function bakToNxtCfg(): boolean {
		const result = hotLoader.bakToNxt()
		if (result) syncFromHotLoader()
		return result
	}

	function getCfgSnapshots(): CfgSnapshot[] {
		return hotLoader.getSnapshots()
	}

	async function lodCfgFromUrl(url: string): Promise<boolean> {
		const result = await hotLoader.lodFromUrl(url)
		if (result) syncFromHotLoader()
		return result
	}

	async function lodCfgFromFile(file: File): Promise<boolean> {
		const result = await hotLoader.lodFromFile(file)
		if (result) syncFromHotLoader()
		return result
	}

	function lodCfgFromObj(obj: Partial<GameConfig>) {
		hotLoader.lodFromObj(obj)
		syncFromHotLoader()
	}

	const canUndo = computed(() => hotLoader.canUndo())
	const canRedo = computed(() => hotLoader.canRedo())

	return {
		proMode, editingAsset,
		laws, rules, world, space, entities, factions, skills, modules, systems, ai, aiAdvanced, llm,
		audio, network, ui, save, input, particle, weather, timeEffect, vehicle,
		animation, terrain, lighting, i18n, performance, buff,
		collectAll, loadAll, reset,
		subCfgChg, unsubCfgChg,
		snapshotCfg, bakCfg, bakToPrvCfg, bakToNxtCfg, getCfgSnapshots,
		lodCfgFromUrl, lodCfgFromFile, lodCfgFromObj,
		canUndo, canRedo, syncToHotLoader
	}
})
