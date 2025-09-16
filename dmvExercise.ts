/**
 * You work for the DMV; you have a specific, sequential way of generating new license plate numbers:
 *
 * Each license plate number has 6 alphanumeric characters. The numbers always come before the letters.
 *
 * The first plate number is 000000, followed by 000001...
 * When you arrive at 999999, the next entry would be 00000A, Followed by 00001A...
 * When you arrive at 99999A, the next entry is 00000B, Followed by 00001B...
 * After following the pattern to 99999Z, the next in the sequence would be 0000AA...
 *
 * When 9999AA is reached, the next in the series would be 0000AB...0001AB
 * When 9999AB is reached, the next in the series would be 0000AC...0001AC
 * When 9999AZ is reached, the next in the series would be 0000BA...0001BA
 * When 9999ZZ is reached, the next in the series would be 000AAA...001AAA
 *
 * And so on untill the sequence completes with ZZZZZZ.
 *
 * So the pattern overview looks a bit like this:
 *
 * 000000
 * 000001
 * ...
 * 999999
 * 00000A
 * 00001A
 * ...
 * 99999A
 * 00000B
 * 00001B
 * ...
 * 99999Z
 * 0000AA
 * 0001AA
 * ...
 * 9999AA
 * 0000AB
 * 0001AB
 * ...
 * 9999AB
 * 0000AC
 * 0001AC
 * ...
 * 9999AZ
 * 0000BA
 * 0001BA
 * ...
 * 9999BZ
 * 0000CA
 * 0001CA
 * ...
 * 9999ZZ
 * 000AAA
 * 001AAA
 * ...
 * 999AAA
 * 000AAB
 * 001AAB
 * ...
 * 999AAZ
 * 000ABA
 * ...
 * ZZZZZZ
 *
 *
 * The goal is to write the most efficient function that can return the nth element in this sequence.
 * */


// Sequence: 6 chars per cell, numbers first then letters.
// We always enumerate numbers (faster counter) inside a block, and letters advance slowly
// after the numeric range completes. Time and memory are O(1).

/*
EXPLANATION BY A SINGLE EXAMPLE
Example: n = 1_000_005
1) Find the block:
   Boundaries (cumulative ends, see BOUNDARIES below):
   Since C0 <= n < C1, we are in block BLOCK=1 (5 digits + 1 letter).
   base = C0 = 1_000_000

2) Offset inside the block:
   offset = n - base = 1_000_005 - 1_000_000 = 5
   W = 6 - BLOCK = 5, pow10W = 100_000

3) Split offset into "digits" and "letters":
   num = offset % 100_000 = 5           -> zero-left-pad to width 5 => "00005"
   suf = Math.floor(offset / 100_000) = 0 -> letter index 0 => 'A'

Result: "00005A"
*/

// BOUNDARIES[L] = cumulative count up to and including block L (exclusive upper bound for the next index check)
const BOUNDARIES = [
    1_000_000,   // BLOCK=0: end of pure digits block (10^6)
    3_600_000,   // BLOCK=1: + 10^5 * 26
    10_360_000,  // BLOCK=2: + 10^4 * 26^2
    27_936_000,  // BLOCK=3: + 10^3 * 26^3
    73_633_600,  // BLOCK=4: + 10^2 * 26^4
    192_447_360, // BLOCK=5: + 10^1 * 26^5
    501_363_136  // BLOCK=6: + 26^6 (total valid plates)
] as const;

const POW10 = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000] as const;

// Static map from number -> letter
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function nthPlate(n: number): string {
    if (!Number.isInteger(n) || n < 0 || n >= BOUNDARIES[6]) {
        throw new RangeError(`n must be an integer in [0, ${BOUNDARIES[6] - 1}]`);
    }

    let BLOCK: number, base: number;
    if (n < BOUNDARIES[0]) { BLOCK = 0; base = 0; }
    else if (n < BOUNDARIES[1]) { BLOCK = 1; base = BOUNDARIES[0]; }
    else if (n < BOUNDARIES[2]) { BLOCK = 2; base = BOUNDARIES[1]; }
    else if (n < BOUNDARIES[3]) { BLOCK = 3; base = BOUNDARIES[2]; }
    else if (n < BOUNDARIES[4]) { BLOCK = 4; base = BOUNDARIES[3]; }
    else if (n < BOUNDARIES[5]) { BLOCK = 5; base = BOUNDARIES[4]; }
    else { BLOCK = 6; base = BOUNDARIES[5]; }

    const W = 6 - BLOCK;            // number of digit positions
    const off = n - base;       // offset inside block
    const pow10W = POW10[W];    // 10^W

    const num = off % pow10W;                  // fast-changing numeric part
    let suf = Math.floor(off / pow10W);        // slow-changing letter suffix index

    const numStr = W ? num.toString().padStart(W, "0") : "";

    // Build the BLOCK letters from least significant to most significant
    const letters: string[] = [];
    for (let i = 0; i < BLOCK; i++) {
        const r = suf % 26;               // 0..25
        letters.push(LETTERS[r]);         // map number -> letter
        suf = Math.floor(suf / 26);
    }
    letters.reverse();

    return numStr + letters.join("");
}

function main(): void {
    console.log(nthPlate(0)); // -> 000000
    console.log(nthPlate(1_000_005)); // -> 00005A
    console.log(nthPlate(999_999));   // -> 999999
    console.log(nthPlate(1_000_000)); // -> 00000A
    console.log(nthPlate(1_000_001)); // -> 00001A
    console.log(nthPlate(501_363_135)); // -> ZZZZZZ
    console.log(nthPlate(501_363_136)); // error
}

main();