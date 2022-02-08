import { Optional, Inject, InjectionToken } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import localeData from 'dayjs/plugin/localeData';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

export interface DayJsDateAdapterOptions {
  /**
   * Turns the use of utc dates on or off.
   * Changing this will change how Angular Material components like DatePicker output dates.
   * {@default false}
   */
  useUtc?: boolean;
}

/** InjectionToken for dayjs date adapter to configure options. */
export const MAT_DAYJS_DATE_ADAPTER_OPTIONS = new InjectionToken<DayJsDateAdapterOptions>(
  'MAT_DAYJS_DATE_ADAPTER_OPTIONS', {
  providedIn: 'root',
  factory: MAT_DAYJS_DATE_ADAPTER_OPTIONS_FACTORY
});

export function MAT_DAYJS_DATE_ADAPTER_OPTIONS_FACTORY(): DayJsDateAdapterOptions {
  return {
    useUtc: false
  };
}


/** Adapts Dayjs Dates for use with Angular Material. */
export class DayjsDateAdapter extends DateAdapter<Dayjs> {
  private localeData: {
    firstDayOfWeek: number,
    longMonths: string[],
    shortMonths: string[],
    dates: string[],
    longDaysOfWeek: string[],
    shortDaysOfWeek: string[],
    narrowDaysOfWeek: string[]
  };

  constructor(
    @Optional() @Inject(MAT_DATE_LOCALE) public dateLocale: string,
    @Optional() @Inject(MAT_DAYJS_DATE_ADAPTER_OPTIONS) private options?: DayJsDateAdapterOptions
  ) {
    super();

    if (this.shouldUseUtc) {
      dayjs.extend(utc);
    }

    dayjs.extend(localizedFormat);
    dayjs.extend(customParseFormat);
    dayjs.extend(localeData);
    dayjs.extend(relativeTime);

    this.setLocale(dateLocale);
  }

  setLocale(locale: string) {
    super.setLocale(locale);

    const dayJsLocaleData = this.dayJs().localeData();
    this.localeData = {
      firstDayOfWeek: dayJsLocaleData.firstDayOfWeek(),
      longMonths: dayJsLocaleData.months(),
      shortMonths: dayJsLocaleData.monthsShort(),
      dates: this.range(31, (i) => this.createDate(2017, 0, i + 1).format('D')),
      longDaysOfWeek: this.range(7, (i) => this.dayJs().set('day', i).format('dddd')),
      shortDaysOfWeek: dayJsLocaleData.weekdaysShort(),
      narrowDaysOfWeek: dayJsLocaleData.weekdaysMin(),
    };
  }

  getYear(date: Dayjs): number {
    return this.dayJs(date).year();
  }

  getMonth(date: Dayjs): number {
    return this.dayJs(date).month();
  }

  getDate(date: Dayjs): number {
    return this.dayJs(date).date();
  }

  getDayOfWeek(date: Dayjs): number {
    return this.dayJs(date).day();
  }

  getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
    return style === 'long' ? this.localeData.longMonths : this.localeData.shortMonths;
  }

  getDateNames(): string[] {
    return this.localeData.dates;
  }

  getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
    if (style === 'long') {
      return this.localeData.longDaysOfWeek;
    }
    if (style === 'short') {
      return this.localeData.shortDaysOfWeek;
    }
    return this.localeData.narrowDaysOfWeek;
  }

  getYearName(date: Dayjs): string {
    return this.dayJs(date).format('YYYY');
  }

  getFirstDayOfWeek(): number {
    return this.localeData.firstDayOfWeek;
  }

  getNumDaysInMonth(date: Dayjs): number {
    return this.dayJs(date).daysInMonth();
  }

  clone(date: Dayjs): Dayjs {
    return date.clone();
  }

  createDate(year: number, month: number, date: number): Dayjs {
    const returnDayjs = this.dayJs()
      .set('year', year)
      .set('month', month)
      .set('date', date);
    return returnDayjs;
  }

  today(): Dayjs {
    return this.dayJs();
  }

  parse(value: any, parseFormat: string): Dayjs | null {
    if (value && typeof value === 'string') {
      const longDateFormat = dayjs().localeData().longDateFormat(parseFormat) as string; // MM/DD/YYY or DD-MM-YYYY, etc.

      let parsed = this.dayJs(value, longDateFormat, this.locale);

      if (parsed.isValid()) {
        // string value is exactly like long date format
        return parsed;
      }

      if (value.length === 9) {
        // user might have typed 1-12-2020 or 12/1/2020
        // try to parse with D-MM-YYYY or MM/D/YYYY (based on long date format)
        const formatWithSmallDay = longDateFormat.replace('DD', 'D');
        parsed = this.dayJs(value, formatWithSmallDay, this.locale);
        if (parsed.isValid()) {
          return parsed;
        }

        // user might have typed 25-1-2020 or 1/25/2020
        // try to parse with DD-M-YYYY or M/DD/YYYY (based on long date format)
        const formatWithSmallMonth = longDateFormat.replace('MM', 'M');
        parsed = this.dayJs(value, formatWithSmallMonth, this.locale);
        if (parsed.isValid()) {
          return parsed;
        }
      }

      if (value.length === 8) {
        // user might have typed 24012020 or 01242020
        // strip long date format of non-alphabetic characters so we get MMDDYYYY or DDMMYYYY
        const formatWithoutSeparators = longDateFormat.replace(/[\W_]+/g, '');
        parsed = this.dayJs(value, formatWithoutSeparators, this.locale);
        if (parsed.isValid()) {
          return parsed;
        }

        // user might have typed 1-2-2020 or 2/1/2020
        // try to parse with D-M-YYYY or M/D/YYYY (based on long date format)
        const formatWithSmallDayAndMonth = longDateFormat.replace('DD', 'D').replace('MM', 'M');
        parsed = this.dayJs(value, formatWithSmallDayAndMonth, this.locale);
        if (parsed.isValid()) {
          return parsed;
        }
      }

      if (value.length < 6 && value.length > 2) {
        // user might have typed 01/24, 24-01, 1/24, 24/1 or 24-1
        // try to extract month and day part and parse them with custom format
        let parts = new Array();
        if (value.indexOf('/') !== -1) {
          parts = value.split('/');
        }
        if (value.indexOf('-') !== -1) {
          parts = value.split('-');
        }
        if (value.indexOf('.') !== -1) {
          parts = value.split('.');
        }
        if (parts.length === 2) {
          let dayPart: string;
          let monthPart: string;
          if (longDateFormat.startsWith('D')) {
            dayPart = parts[0];
            monthPart = parts[1];
          } else if (parts.length > 1) {
            monthPart = parts[0];
            dayPart = parts[1];
          }
          if (monthPart.length === 1) {
            monthPart = 0 + monthPart;
          }
          if (dayPart.length === 1) {
            dayPart = 0 + dayPart;
          }
          parsed = this.dayJs(dayPart + monthPart, 'DDMM', this.locale);
          if (parsed.isValid()) {
            return parsed;
          }
        }
      }

      if (value.length === 2) {
        // user might have typed 01, parse DD only
        const format = 'DD';
        parsed = this.dayJs(value, format, this.locale);
        if (parsed.isValid()) {
          return parsed;
        }
      }

      if (value.length === 1) {
        // user might have typed 1, parse D only
        const format = 'D';
        parsed = this.dayJs(value, format, this.locale);

        if (parsed.isValid()) {
          return parsed;
        }
      }

      // not able to parse anything sensible, return something invalid so input can be corrected
      return this.dayJs(null);
    }

    return value ? this.dayJs(value).locale(this.locale) : null;
  }

  format(date: Dayjs, displayFormat: string): string {
    if (!this.isValid(date)) {
      throw Error('DayjsDateAdapter: Cannot format invalid date.');
    }
    return date.locale(this.locale).format(displayFormat);
  }

  addCalendarYears(date: Dayjs, years: number): Dayjs {
    return date.add(years, 'year');
  }

  addCalendarMonths(date: Dayjs, months: number): Dayjs {
    return date.add(months, 'month');
  }

  addCalendarDays(date: Dayjs, days: number): Dayjs {
    return date.add(days, 'day');
  }

  toIso8601(date: Dayjs): string {
    return date.toISOString();
  }

  /**
   * Attempts to deserialize a value to a valid date object. This is different from parsing in that
   * deserialize should only accept non-ambiguous, locale-independent formats (e.g. a ISO 8601
   * string). The default implementation does not allow any deserialization, it simply checks that
   * the given value is already a valid date object or null. The `<mat-datepicker>` will call this
   * method on all of it's `@Input()` properties that accept dates. It is therefore possible to
   * support passing values from your backend directly to these properties by overriding this method
   * to also deserialize the format used by your backend.
   * @param value The value to be deserialized into a date object.
   * @returns The deserialized date object, either a valid date, null if the value can be
   *     deserialized into a null date (e.g. the empty string), or an invalid date.
   */
  deserialize(value: any): Dayjs | null {
    let date: string | dayjs.Dayjs;
    if (value instanceof Date) {
      date = this.dayJs(value);
    } else if (this.isDateInstance(value)) {
      return this.clone(value);
    }
    if (typeof value === 'string') {
      if (!value) {
        return null;
      }
      date = this.dayJs(value).toISOString();
    }
    if (date && this.isValid(date)) {
      return this.dayJs(date);
    }
    return super.deserialize(value);
  }

  isDateInstance(obj: any): boolean {
    return dayjs.isDayjs(obj);
  }

  isValid(date: dayjs.Dayjs | string): boolean {
    return this.dayJs(date).isValid();
  }

  invalid(): Dayjs {
    return this.dayJs(null);
  }

  private dayJs(input?: any, format?: string, locale?: string): Dayjs {
    return dayjs(input, format, locale, true);
  }

  private range<T>(length: number, valueFunction: (index: number) => T): T[] {
    const valuesArray = Array(length);
    for (let i = 0; i < length; i++) {
      valuesArray[i] = valueFunction(i);
    }
    return valuesArray;
  }

  private get shouldUseUtc(): boolean {
    const { useUtc }: DayJsDateAdapterOptions = this.options || {};
    return !!useUtc;
  }
}
