import { formatDistance, lastDayOfMonth, format as datefnsFormat } from "date-fns";

// Salesforce saves dates as "yyyy-mm-dd" and I actually like that a lot
// it alphebetizes correctly in the firebase backend, and it's nice and conscise
// it's also just nice to have a uniform string date. I have been kinda inconsistent, but
// with an external impetus to pick a format, I'm going with this one
export function YMDFromDate(d: Date): YYYYMMDD {
  // return [d.getFullYear(), leadingZero(d.getMonth() + 1), leadingZero(d.getDate())].join("-");
  const yyyy = d.getFullYear().toString() as `${number}${number}${number}${number}`;
  const mm = leadingZero(d.getMonth() + 1);
  const dd = leadingZero(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

export type YYYYMMDD = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;
// turn a string or number into a yyyy-mm-dd date format
export function yyyymmdd(d: undefined | null): undefined;
export function yyyymmdd(d: Date): YYYYMMDD; // won't be undefined!
export function yyyymmdd(d: string | number): YYYYMMDD | undefined; // because the string could be invalid...
export function yyyymmdd(d: string | number | Date | undefined | null): YYYYMMDD | undefined;
export function yyyymmdd(d: string | number | Date | undefined | null): YYYYMMDD | undefined {
  if (d === undefined) return;
  if (d instanceof Date) return YMDFromDate(d);
  const date = myDateMaker(d);
  if (!date) return;
  return YMDFromDate(date);
}

export function leadingZero(int: number) {
  if (int > 99) throw new Error("Invalid number provided to leading zero " + int);
  if (Math.round(int) != int) throw new Error("Invalid number provided to leading zero " + int);
  return (int < 10 ? "0" + int.toString() : int.toString()) as `${number}${number}`;
}

// So the "yyyy-mm-dd" format is known as the "day only" time format. The issue is that
// this format is parsed as midnight, GMT for the indicated day, which means
// the day ends up showing up as 6pm the prior day in california time...
// Basically I shouldn't use Date.parse on this string format
export function parseYMD(ymd: string) {
  const ret = new Date();
  ret.setFullYear(parseInt(ymd.split("-")[0]));
  ret.setMonth(parseInt(ymd.split("-")[1]) - 1);
  ret.setDate(parseInt(ymd.split("-")[2]));
  return ret;
}

// new Date() of the yyyy-mm-dd format parses it as a UTC time
// which sucks and is awful, so I when parsing a date string I want to do something
// different for that situation
export function myDateMaker(input: null | undefined): undefined;
export function myDateMaker(input: string | number): Date | undefined; // because the string or whatever could be invalid
export function myDateMaker(input: Date): Date; // because the string or whatever could be invalid
export function myDateMaker(input: string | number | Date | null | undefined): Date | undefined;
export function myDateMaker(input: string | number | Date | null | undefined): Date | undefined {
  let ret: Date; // Sometimes I give bs stuff...
  if (!input) return undefined;
  if (input instanceof Date) return new Date(input); // added for the dateRange function // creates a copy just in cause I guess
  if (typeof input === "number") ret = new Date(input);
  else {
    const split = input.split("-").map((seg) => {
      if (seg.match(/[^\d.]/)) return NaN; // If it includes any characters that are not a digit or a decimal sign // I guess parseInt is a bit more forgiving that I expected. With the input string 2022-05-09T20:58:44.154Z the last segment evaluated to 9, I guess parse int just ignores everything after the first word character
      return parseInt(seg);
    });
    ret =
      // ? In the very specific case where the format is yyyy-mm-dd I want to parse differently from the default Date constructor. Otherwise I'll use the default date constructor
      split.every((seg) => !isNaN(seg)) && split.length === 3 && split[0].toString().length === 4
        ? new Date(split[0], split[1] - 1, split[2])
        : new Date(input);
  }
  // Date constructor on an invalid date returns a truthy object
  // doing this toString test is the easiest way I've found to check invalidity
  // and I want it to be falsey if it's invalid
  if (ret.toString() === "Invalid Date") return undefined;
  return ret;
}

export function monthStart(input?: Parameters<typeof myDateMaker>[0]) {
  let ret = input ? myDateMaker(input) : new Date();
  if (!ret) {
    console.warn(`Invalid Date value passed to monthEnd: "${input}" - defaulting to new Date()`);
    ret = new Date();
  }
  ret.setDate(1);
  return ret;
}

export function monthEnd(input?: Parameters<typeof myDateMaker>[0]) {
  let ret = input ? myDateMaker(input) : new Date();
  if (!ret) {
    console.warn(`Invalid Date value passed to monthEnd: "${input}" - defaulting to new Date()`);
    ret = new Date();
  }
  return lastDayOfMonth(ret);
}

export function yearStart() {
  const ret = new Date();
  ret.setDate(1);
  ret.setMonth(0);
  return ret;
}
export function lastYearStart() {
  const ret = yearStart();
  ret.setFullYear(ret.getFullYear() - 1);
  return ret;
}

export function monthNum(d: Date) {
  return d.getMonth() + 1; // because the default returns the INDEX of the month...
}

// A way to explicitly do the US toLocaleString
export function dateMDY(date: Date): string;
export function dateMDY(date: undefined | null): undefined;
export function dateMDY(date: Date | undefined | null): string | undefined;
export function dateMDY(date: Date | undefined | null): string | undefined {
  if (!date) return undefined;
  return `${monthNum(date)}/${date.getDate()}/${date.getFullYear()}`;
}
// I created this for dealing with some really annoying stuff on the date picker...
export function dateMDYLeading(date: Date): string;
export function dateMDYLeading(date: undefined | null): undefined;
export function dateMDYLeading(date: Date | undefined | null): string | undefined;
export function dateMDYLeading(date: Date | undefined | null): string | undefined {
  if (!date) return undefined;
  return `${leadingZero(monthNum(date))}/${leadingZero(date.getDate())}/${date.getFullYear()}`;
}

export function sameDay(date1: Date | undefined | null, date2: Date | undefined | null) {
  if (!date1 || !date2) return false; // undefined dates shouldn't resolve to similar...
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

export function timestampString(d: Date | undefined) {
  if (!d) return "N/A";
  try {
    return `${d.toLocaleDateString?.() || "---"} ${d.toLocaleTimeString?.() || "---"}`;
  } catch {
    return "error with date string...";
  }
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const WEEKDAY_LU: { [key: number]: string } = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export type DayOfWeek = typeof WEEKDAY_LU[keyof typeof WEEKDAY_LU];
export const DAYS_OF_WEEK: DayOfWeek[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// start and end should be the same format...
export function dateRange(startDate: string | number | Date, endDate: string | number | Date): Date[];
export function dateRange<T>(
  startDate: string | number | Date,
  endDate: string | number | Date,
  formatter: (d: Date) => T
): T[];
export function dateRange<T>(
  startDate: string | number | Date,
  endDate: string | number | Date,
  formatter?: (d: Date) => T
): T[] | Date[] {
  // DON"T pass (x) => x into here, it breaks it!!!!
  const format = formatter || ((x) => new Date(x));
  let ret = formatter ? ([] as T[]) : ([] as Date[]);
  const iDay = myDateMaker(startDate);
  const endPoint = myDateMaker(endDate);
  if (!iDay || !endPoint) throw new Error("Invalid start or end given to date range");
  while (iDay <= endPoint) {
    ret = (ret as any).concat(format(iDay));
    iDay.setDate(iDay.getDate() + 1);
  }
  return ret;
}

export function prettyDate(d?: Date) {
  return (
    d &&
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  );
}

/**
 *
 * @param d Date Object
 * @returns New date which is one day after the given date. Undefined if the given date is invalid.
 */
export function addOneDay(d: Date) {
  const ret = myDateMaker(d);
  if (!ret) return undefined;
  ret.setDate(ret.getDate() + 1);
  return ret;
}

// I'm not importing date-fns on the server, so these can't go into date-utils
export function myFormatTimeAgo(input: string | number | Date | null | undefined) {
  const parsed = myDateMaker(input);
  if (!parsed) return "N/A";
  return formatDistance(parsed, new Date(), { addSuffix: true });
}

export function myFormatDate(input: string | number | Date | null | undefined, format: string) {
  const parsed = myDateMaker(input);
  if (!parsed) return "N/A";
  return datefnsFormat(parsed, format);
}

// Reference for Intl.DateTimeFormat https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
export function caliTimestamp(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
  return formatter.format(date);
}
