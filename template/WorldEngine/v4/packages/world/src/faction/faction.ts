import type { EntityId } from '@engine/common'

export enum FactionRelation {
	Allied = 2,
	Friendly = 1,
	Neutral = 0,
	Hostile = -1,
	War = -2
}

export interface FactionDef {
	id: string
	name: string
	desc: string
	color: string
	icon: string
	baseRelation: FactionRelation
}

export interface FactionMember {
	entId: EntityId
	factionId: string
	rank: number
	rep: number
	joinTime: number
}

export interface WarState {
	faction1: string
	faction2: string
	startTime: number
	kills1: number
	kills2: number
	score1: number
	score2: number
}

export class FactionLayer {
	factions: Map<string, FactionDef>
	relations: Map<string, FactionRelation>
	members: Map<EntityId, FactionMember>
	wars: WarState[]

	constructor() {
		this.factions = new Map()
		this.relations = new Map()
		this.members = new Map()
		this.wars = []
	}

	addFaction(faction: FactionDef) {
		this.factions.set(faction.id, faction)
	}

	getFaction(id: string): FactionDef | undefined {
		return this.factions.get(id)
	}

	private relKey(f1: string, f2: string): string {
		return f1 < f2 ? `${f1}:${f2}` : `${f2}:${f1}`
	}

	setRelation(f1: string, f2: string, rel: FactionRelation) {
		this.relations.set(this.relKey(f1, f2), rel)
		if (rel === FactionRelation.War) {
			this.startWar(f1, f2)
		} else {
			this.endWar(f1, f2)
		}
	}

	getRelation(f1: string, f2: string): FactionRelation {
		if (f1 === f2) return FactionRelation.Allied
		return this.relations.get(this.relKey(f1, f2)) ?? FactionRelation.Neutral
	}

	isHostile(f1: string, f2: string): boolean {
		const rel = this.getRelation(f1, f2)
		return rel === FactionRelation.Hostile || rel === FactionRelation.War
	}

	isFriendly(f1: string, f2: string): boolean {
		const rel = this.getRelation(f1, f2)
		return rel === FactionRelation.Friendly || rel === FactionRelation.Allied
	}

	join(entId: EntityId, factionId: string) {
		if (!this.factions.has(factionId)) return
		this.members.set(entId, {
			entId,
			factionId,
			rank: 0,
			rep: 0,
			joinTime: Date.now()
		})
	}

	leave(entId: EntityId) {
		this.members.delete(entId)
	}

	getMember(entId: EntityId): FactionMember | undefined {
		return this.members.get(entId)
	}

	getEntFaction(entId: EntityId): string | undefined {
		return this.members.get(entId)?.factionId
	}

	addRep(entId: EntityId, amount: number) {
		const member = this.members.get(entId)
		if (member) {
			member.rep += amount
		}
	}

	promote(entId: EntityId) {
		const member = this.members.get(entId)
		if (member) {
			member.rank++
		}
	}

	demote(entId: EntityId) {
		const member = this.members.get(entId)
		if (member && member.rank > 0) {
			member.rank--
		}
	}

	startWar(f1: string, f2: string) {
		const existing = this.wars.find(w =>
			(w.faction1 === f1 && w.faction2 === f2) ||
			(w.faction1 === f2 && w.faction2 === f1)
		)
		if (existing) return
		this.wars.push({
			faction1: f1,
			faction2: f2,
			startTime: Date.now(),
			kills1: 0,
			kills2: 0,
			score1: 0,
			score2: 0
		})
	}

	endWar(f1: string, f2: string) {
		this.wars = this.wars.filter(w =>
			!((w.faction1 === f1 && w.faction2 === f2) ||
			(w.faction1 === f2 && w.faction2 === f1))
		)
	}

	getWar(f1: string, f2: string): WarState | undefined {
		return this.wars.find(w =>
			(w.faction1 === f1 && w.faction2 === f2) ||
			(w.faction1 === f2 && w.faction2 === f1)
		)
	}

	recordKill(killer: EntityId, victim: EntityId) {
		const killerFaction = this.getEntFaction(killer)
		const victimFaction = this.getEntFaction(victim)
		if (!killerFaction || !victimFaction) return
		const war = this.getWar(killerFaction, victimFaction)
		if (!war) return
		if (war.faction1 === killerFaction) {
			war.kills1++
			war.score1 += 10
		} else {
			war.kills2++
			war.score2 += 10
		}
	}

	getFactionMembers(factionId: string): FactionMember[] {
		const result: FactionMember[] = []
		for (const member of this.members.values()) {
			if (member.factionId === factionId) {
				result.push(member)
			}
		}
		return result
	}
}
