export const ITEMS = {
    helmet: {
        name: 'Helmet of Salvation',
        slot: 'head',
        weight: 3.5,
        armor: 0.025,
        poise: 5
    },
    breastplate: {
        name: 'Breastplate of Righteousness',
        slot: 'torso',
        weight: 14,
        armor: 0.12,
        poise: 22
    },
    iron: {
        name: 'Mark of Iron',
        slot: 'torso',
        weight: 26,
        armor: 0.23,
        poise: 42
    },
    siege: {
        name: 'Siege Panoply',
        slot: 'torso',
        weight: 40,
        armor: 0.3,
        poise: 60
    },
    belt: {
        name: 'Belt of Truth',
        slot: 'waist',
        weight: 2,
        armor: 0,
        poise: 0
    },
    greaves: {
        name: 'Greaves of Peace',
        slot: 'legs',
        weight: 6.5,
        armor: 0.055,
        poise: 10
    },
    shield: {
        name: 'Shield of Faith',
        slot: 'offhand',
        weight: 5,
        armor: 0,
        poise: 0
    },
    sword: {
        name: 'Sword of the Spirit',
        slot: 'weapon',
        weight: 4,
        armor: 0,
        poise: 0
    }
};

export const ROLL_TIERS = {
    light: {
        name: 'LIGHT',
        start: 2,
        end: 15,
        travel: 6.2,
        motion: 20,
        duration: 28,
        regen: 54
    },
    medium: {
        name: 'MEDIUM',
        start: 3,
        end: 13,
        travel: 4.8,
        motion: 24,
        duration: 36,
        regen: 45
    },
    heavy: {
        name: 'HEAVY',
        start: 4,
        end: 10,
        travel: 3.2,
        motion: 28,
        duration: 50,
        regen: 31
    },
    overloaded: {
        name: 'OVERBURDENED',
        start: 0,
        end: -1,
        travel: 0,
        motion: 0,
        duration: 30,
        regen: 18
    }
};

export class Inventory {
    constructor() {
        this.equipped = {
            head: 'helmet',
            torso: 'breastplate',
            waist: 'belt',
            legs: 'greaves',
            offhand: 'shield',
            weapon: 'sword'
        };
    }

    get items() {
        return Object.values(this.equipped).filter(Boolean).map(id => ITEMS[id]);
    }

    get weight() {
        return this.items.reduce((sum, item) => sum + item.weight, 0);
    }

    get armor() {
        return this.items.reduce((sum, item) => sum + item.armor, 0);
    }

    get poise() {
        return this.items.reduce((sum, item) => sum + item.poise, 0);
    }

    has(id) {
        return Object.values(this.equipped).includes(id);
    }

    equip(slot, id) {
        if (slot === 'weapon' && !id) return;
        if (id && ITEMS[id]?.slot !== slot) return;
        this.equipped[slot] = id || null;
    }

    tier(maxLoad) {
        const ratio = this.weight / maxLoad;

        if (ratio < 0.3) return ROLL_TIERS.light;
        if (ratio < 0.7) return ROLL_TIERS.medium;
        if (ratio <= 1) return ROLL_TIERS.heavy;
        return ROLL_TIERS.overloaded;
    }
}