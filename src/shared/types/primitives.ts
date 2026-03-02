export type ISODateString = string;
export type UUID = string;

export type Brand<T, TBrand extends string> = T & {
  readonly __brand: TBrand;
};

export type Cents = Brand<number, 'Cents'>;

export const toCents = (value: number): Cents => Math.round(value) as Cents;
