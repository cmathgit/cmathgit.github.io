export class Progression {
    constructor() {
        this.level = 1;
        this.grace = 0;
        this.scrap = 0;
        this.converts = 0;

        this.stats = {
            Vigor: 10,
            Endurance: 10,
            Faith: 10,
            Fortitude: 10,
            Discernment: 10
        };
    }

    get maxHP() {
        return 480 + (this.stats.Vigor - 10) * 24;
    }

    get maxStamina() {
        return 120 + (this.stats.Endurance - 10) * 6;
    }

    get maxLoad() {
        return 53 + (this.stats.Endurance - 10) * 1.8;
    }

    get damageScale() {
        return 1 + (this.stats.Faith - 10) * 0.045;
    }

    get armor() {
        return (this.stats.Fortitude - 10) * 0.008;
    }

    get poise() {
        return (this.stats.Fortitude - 10) * 2;
    }

    get extraParryFrames() {
        // Fixed 60 Hz simulation: fractional frames accumulate into whole ticks.
        return Math.floor((this.stats.Discernment - 10) * 0.05);
    }

    get cost() {
        const level = this.level;
        return Math.floor(
            0.04 * level ** 3 + 0.8 * level ** 2 + 2 * level + 80
        );
    }

    levelUp(attribute) {
        if (!(attribute in this.stats) || this.grace < this.cost) return false;

        this.grace -= this.cost;
        this.stats[attribute]++;
        this.level++;
        return true;
    }
}