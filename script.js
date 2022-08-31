var config = {
    wager: {
        value: 1000,
        type: "balance",
        label: "Base bet",
    },
    payout: {
        value: 2,
        type: "multiplier",
        label: "Payout",
    },
    maxBet: { label: "Max Bet", type: "balance", value: 1000000 },
    minBalance: { label: "Stop if BR <", type: "balance", value: 5000000 },
    maxBalance: { label: "Stop if BR >", type: "balance", value: 5000000 },
    change_seed_next: { label: "Change Seed After", type: "number", value: 2500 },
};
var engine = this;
const dcheck = () => {
    try {
        engine.getState();
    } catch (e) {
        return true;
    }
    return false;
};
const emitter = {
    on(name, func) {
        this._s[name] = this._s[name] || [];
        this._s[name].push(func);
    },
    _s: {},
    emit(name, ...args) {
        if (!this._s[name]) {
            return;
        }
        this._s[name].forEach((f) => f(...args));
    },
};
const dice = dcheck();
if (dice) {
    var engine = emitter;
}
let wantedProfitInBits = config.wager.value / 100;
let netProfit = 0;
let baseList = [];
let currentGamesPlayed = 0;
let maxBet = 0;
let balanceNeeded = 0;
let wins = 0;
let loses = 0;
let currentlyPlaying = true;
let SPLIT_INTO = 3;
var MAX_LOSE = 0;
var SESSION_NET_PROFIT = 0;
var SESSION_MAX_BALANCE_NEEDED = 0;
var ALL_GAMES = [];
var SESSION_TIMES_ENTERED = 0;
var SMALL_SESSION_NET_PROFIT = 0;
var minBalance = config.minBalance.value;
var maxBalance = config.maxBalance.value;
var currentBalance = balance;
var change_seed_next = config.change_seed_next.value;

initScript();

function getCurrentBetLightGuide() {
    let currentMultiplier = 0;
    let currentBet = null;
    if (netProfit >= 0 && currentGamesPlayed > 0) {
        return currentBet;
    }
    if (baseList.length >= 2) {
        currentMultiplier = baseList[0] + baseList[baseList.length - 1];
        currentBet = currentMultiplier * config.wager.value;
    } else if (baseList.length === 1) {
        currentMultiplier = baseList[0];
        currentBet = currentMultiplier * config.wager.value * 2;
    } else {
        currentMultiplier = null;
    }
    return currentBet;
}

function initScript() {
    SESSION_TIMES_ENTERED += 1;
    baseList = [1, 2, 3];
    netProfit = 0;
    currentGamesPlayed = 0;
    maxBet = 0;
    balanceNeeded = 0;
    wins = 0;
    loses = 0;
    currentlyPlaying = true;
    SMALL_SESSION_NET_PROFIT = 0;
    minBalance = config.minBalance.value;
    maxBalance = config.maxBalance.value;
    currentBalance = balance;
}

if (engine.gameState === "GAME_STARTING") {
    makeBet();
}
Alright
engine.on("GAME_STARTING", onGameStarted);
engine.on("GAME_ENDED", onGameEnded);

function onGameStarted() {
    if (!currentlyPlaying) {
        initScript();
    }
    let currentBet = getCurrentBetLightGuide();

    if (!currentBet) {
        currentlyPlaying = false;
        printEndStatus();
        initScript();
    }
    makeBet();

    if (currentBalance > maxBalance || currentBalance < minBalance) {
        console.log("Should stop due to min or max balance");
        stop();
    } else {
        console.log("Net profit is ", netProfit);
    }

    if (currentBet > maxBet) {
        console.log("Should stop due to max bet reached");
        stop();
    } else {
        console.log("Current bet is", currentBet);
    }
}

function onGameEnded() {
    ALL_GAMES.push(engine.history.first().bust);
    let lastGame = engine.history.first();
    // If we wagered, it means we played
    if (!lastGame.wager) {
        return;
    }

    let lastBet = getCurrentBetLightGuide();

    if (lastGame.cashedAt) {
        let profit = Math.round((lastBet * config.payout.value - lastBet) / 100);
        netProfit += profit;
        SESSION_NET_PROFIT += profit;
        SMALL_SESSION_NET_PROFIT += profit;
        logTime(`Won ${profit} bits`);
        if (baseList.length > 1) {
            baseList.splice(baseList.length - 1, 1);
        }
        baseList.splice(0, 1);
        wins += 1;
    } else {
        var lost = lastBet / 100;
        logTime(`Lost ${lost} bits`);
        netProfit -= lost;
        SESSION_NET_PROFIT -= lost;
        baseList.push(lastBet / config.wager.value);
        loses += 1;
    }
    currentGamesPlayed += 1;
    let currentBalanceNeeded = netProfit + (getCurrentBetLightGuide() / 100) * -1;
    if (currentBalanceNeeded < balanceNeeded) {
        balanceNeeded = currentBalanceNeeded;
    }

    if (currentBalanceNeeded < SESSION_MAX_BALANCE_NEEDED) {
        SESSION_MAX_BALANCE_NEEDED = currentBalanceNeeded;
    }

    logTime("Net profit: " + netProfit + " bits. Left to play: " + baseList.length);
}

async function seed_checking() {
    nonce++;
    if (nonce >= change_seed_next) {
        await generateSeed();
        nonce = 0;
    }
}

function printEndStatus() {
    logTime(
        `Game ended id: ${engine.history.first().id}. Played: ` +
            currentGamesPlayed +
            " Net profit: " +
            netProfit +
            " bits. Balance needed: " +
            balanceNeeded * -1 +
            " bits Max bet: " +
            maxBet / 100 +
            " bits. Wins: " +
            (wins / (wins + loses)) * 100 +
            " % Loses: " +
            (loses / (wins + loses)) * 100 +
            " %"
    );
    logTime(`SESSION NET PROFIT ${SESSION_NET_PROFIT} bits, SESSION MAX BALANCE NEEDED ${SESSION_MAX_BALANCE_NEEDED} bits, SESSION TIMES ENTERED ${SESSION_TIMES_ENTERED}`);
}

function roundBit(bet) {
    return Math.max(100, Math.round(bet / 100) * 100);
}

function makeBet() {
    let currentBet = roundBit(getCurrentBetLightGuide());
    if (!currentBet) {
        printEndStatus();
        return;
    }
    engine.bet(currentBet, config.payout.value);
    if (currentBet > maxBet) {
        maxBet = currentBet;
    }
    logTime("betting " + Math.round(currentBet / 100) + " on " + config.payout.value + " x");
}

function logTime(msg) {
    let today = new Date();
    let calendarDate = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    let now = `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;
}

if (dice) {
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    engine.bet = function (value, target) {
        this.wager = { v: value, t: target };
    };
    (engine.history = {
        first() {
            return this.lastGame;
        },
    }),
        (engine.wager = null);
    for (;;) {
        (engine.lastGame = null), (engine.wager = null);
        await engine.emit("GAME_STARTING");
        const result = engine.wager ? await this.bet(engine.wager.v, engine.wager.t) : await this.skip();
        engine.history.lastGame = {
            bust: result.multiplier,
            wager: result.value || 0,
            cashedAt: result.target && result.target <= result.multiplier ? result.target : 0,
        };
        await engine.emit("GAME_ENDED");
        await sleep(100);
    }
}
