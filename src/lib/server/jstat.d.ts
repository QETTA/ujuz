declare module 'jstat' {
  export const jStat: {
    negbin: {
      cdf(x: number, r: number, p: number): number;
      pdf(x: number, r: number, p: number): number;
    };
    gamma: {
      cdf(x: number, shape: number, scale: number): number;
      pdf(x: number, shape: number, scale: number): number;
    };
  };
}
