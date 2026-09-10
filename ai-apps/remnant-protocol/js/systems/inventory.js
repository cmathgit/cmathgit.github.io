export const ITEMS = {
    rahu_ketu_crown: {
        name: 'Crown of the Eclipse Herald',
        slot: 'head',
        weight: 5.5,
        armor: 0.045,
        poise: 10
    },
    eclipse_herald_blade: {
        name: 'Eclipse Herald Blade',
        slot: 'weapon',
        weight: 4,
        armor: 0,
        poise: 0
    },
    initiate_mask: {
        name: 'Initiate Mask',
        slot: 'head',
        weight: 2,
        armor: 0.015,
        poise: 3
    },
    initiate_vestments: {
        name: 'Initiate Vestments',
        slot: 'torso',
        weight: 8,
        armor: 0.07,
        poise: 12
    },
    initiate_sash: {
        name: 'Initiate Sash',
        slot: 'waist',
        weight: 1,
        armor: 0.005,
        poise: 1
    },
    initiate_wrappings: {
        name: 'Initiate Wrappings',
        slot: 'legs',
        weight: 3.5,
        armor: 0.03,
        poise: 5
    },
    enforcer_helm: {
        name: 'Enforcer Helm',
        slot: 'head',
        weight: 5,
        armor: 0.04,
        poise: 9
    },
    enforcer_cuirass: {
        name: 'Enforcer Cuirass',
        slot: 'torso',
        weight: 21,
        armor: 0.18,
        poise: 34
    },
    enforcer_warbelt: {
        name: 'Enforcer Warbelt',
        slot: 'waist',
        weight: 3.5,
        armor: 0.015,
        poise: 4
    },
    enforcer_greaves: {
        name: 'Enforcer Greaves',
        slot: 'legs',
        weight: 9,
        armor: 0.075,
        poise: 16
    },
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

        this.owned = new Set([
            'helmet', 'breastplate', 'iron', 'siege',
            'belt', 'greaves', 'shield', 'sword'
        ]);

        // Kept through death/rest; recreated on browser refresh.
        this.heraldSoul = {
            awarded: false,
            spent: false,
            reward: null
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

    owns(id) {
        return this.owned.has(id);
    }

    acquire(id) {
        if (!Object.prototype.hasOwnProperty.call(ITEMS, id)) return false;
        if (this.owns(id)) return false;

        this.owned.add(id);
        return true;
    }

    get hasHeraldSoul() {
        return this.heraldSoul.awarded && !this.heraldSoul.spent;
    }

    awardHeraldSoul() {
        if (this.heraldSoul.awarded) return false;

        this.heraldSoul.awarded = true;
        return true;
    }

    tradeHeraldSoul(id) {
        const allowed = (
            id === 'rahu_ketu_crown' ||
            id === 'eclipse_herald_blade'
        );

        if (!allowed || !this.hasHeraldSoul || this.owns(id)) {
            return false;
        }

        // Synchronous exchange: repeated clicks cannot grant another reward.
        if (!this.acquire(id)) return false;

        this.heraldSoul.spent = true;
        this.heraldSoul.reward = id;
        return true;
    }

    equip(slot, id) {
        if (!Object.prototype.hasOwnProperty.call(this.equipped, slot)) return;
        if (slot === 'weapon' && !id) return;
        if (id && (!this.owns(id) || ITEMS[id]?.slot !== slot)) return;

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