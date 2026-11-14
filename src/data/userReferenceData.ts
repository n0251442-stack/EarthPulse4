/**
 * User-Supplied Land-Ocean Temperature Index (°C) Reference Dataset (1880–2025)
 * 
 * Columns:
 * - Year: Observation year
 * - No_Smoothing: Annual global temperature anomaly without smoothing (°C)
 * - Lowess(5): 5-year locally weighted scatterplot smoothing (°C)
 * 
 * Source: Land-Ocean Temperature Index (C), NASA GISS published tables & user-supplied reference records.
 */

export interface UserReferenceRecord {
  year: number;
  noSmoothing: number;
  lowess5: number;
}

export const USER_REFERENCE_DATASET: UserReferenceRecord[] = [
  {
    "year": 1880,
    "noSmoothing": -0.17,
    "lowess5": -0.1
  },
  {
    "year": 1881,
    "noSmoothing": -0.09,
    "lowess5": -0.13
  },
  {
    "year": 1882,
    "noSmoothing": -0.11,
    "lowess5": -0.17
  },
  {
    "year": 1883,
    "noSmoothing": -0.18,
    "lowess5": -0.2
  },
  {
    "year": 1884,
    "noSmoothing": -0.28,
    "lowess5": -0.24
  },
  {
    "year": 1885,
    "noSmoothing": -0.33,
    "lowess5": -0.26
  },
  {
    "year": 1886,
    "noSmoothing": -0.31,
    "lowess5": -0.27
  },
  {
    "year": 1887,
    "noSmoothing": -0.36,
    "lowess5": -0.27
  },
  {
    "year": 1888,
    "noSmoothing": -0.18,
    "lowess5": -0.27
  },
  {
    "year": 1889,
    "noSmoothing": -0.11,
    "lowess5": -0.26
  },
  {
    "year": 1890,
    "noSmoothing": -0.36,
    "lowess5": -0.25
  },
  {
    "year": 1891,
    "noSmoothing": -0.22,
    "lowess5": -0.26
  },
  {
    "year": 1892,
    "noSmoothing": -0.27,
    "lowess5": -0.26
  },
  {
    "year": 1893,
    "noSmoothing": -0.31,
    "lowess5": -0.26
  },
  {
    "year": 1894,
    "noSmoothing": -0.3,
    "lowess5": -0.24
  },
  {
    "year": 1895,
    "noSmoothing": -0.23,
    "lowess5": -0.22
  },
  {
    "year": 1896,
    "noSmoothing": -0.11,
    "lowess5": -0.21
  },
  {
    "year": 1897,
    "noSmoothing": -0.11,
    "lowess5": -0.18
  },
  {
    "year": 1898,
    "noSmoothing": -0.28,
    "lowess5": -0.17
  },
  {
    "year": 1899,
    "noSmoothing": -0.18,
    "lowess5": -0.18
  },
  {
    "year": 1900,
    "noSmoothing": -0.08,
    "lowess5": -0.2
  },
  {
    "year": 1901,
    "noSmoothing": -0.16,
    "lowess5": -0.23
  },
  {
    "year": 1902,
    "noSmoothing": -0.28,
    "lowess5": -0.26
  },
  {
    "year": 1903,
    "noSmoothing": -0.37,
    "lowess5": -0.28
  },
  {
    "year": 1904,
    "noSmoothing": -0.47,
    "lowess5": -0.31
  },
  {
    "year": 1905,
    "noSmoothing": -0.26,
    "lowess5": -0.34
  },
  {
    "year": 1906,
    "noSmoothing": -0.22,
    "lowess5": -0.36
  },
  {
    "year": 1907,
    "noSmoothing": -0.38,
    "lowess5": -0.37
  },
  {
    "year": 1908,
    "noSmoothing": -0.42,
    "lowess5": -0.39
  },
  {
    "year": 1909,
    "noSmoothing": -0.48,
    "lowess5": -0.41
  },
  {
    "year": 1910,
    "noSmoothing": -0.44,
    "lowess5": -0.41
  },
  {
    "year": 1911,
    "noSmoothing": -0.44,
    "lowess5": -0.39
  },
  {
    "year": 1912,
    "noSmoothing": -0.37,
    "lowess5": -0.35
  },
  {
    "year": 1913,
    "noSmoothing": -0.34,
    "lowess5": -0.32
  },
  {
    "year": 1914,
    "noSmoothing": -0.15,
    "lowess5": -0.31
  },
  {
    "year": 1915,
    "noSmoothing": -0.14,
    "lowess5": -0.3
  },
  {
    "year": 1916,
    "noSmoothing": -0.36,
    "lowess5": -0.3
  },
  {
    "year": 1917,
    "noSmoothing": -0.46,
    "lowess5": -0.29
  },
  {
    "year": 1918,
    "noSmoothing": -0.3,
    "lowess5": -0.3
  },
  {
    "year": 1919,
    "noSmoothing": -0.27,
    "lowess5": -0.29
  },
  {
    "year": 1920,
    "noSmoothing": -0.27,
    "lowess5": -0.27
  },
  {
    "year": 1921,
    "noSmoothing": -0.18,
    "lowess5": -0.26
  },
  {
    "year": 1922,
    "noSmoothing": -0.28,
    "lowess5": -0.25
  },
  {
    "year": 1923,
    "noSmoothing": -0.26,
    "lowess5": -0.24
  },
  {
    "year": 1924,
    "noSmoothing": -0.27,
    "lowess5": -0.23
  },
  {
    "year": 1925,
    "noSmoothing": -0.22,
    "lowess5": -0.22
  },
  {
    "year": 1926,
    "noSmoothing": -0.11,
    "lowess5": -0.22
  },
  {
    "year": 1927,
    "noSmoothing": -0.22,
    "lowess5": -0.21
  },
  {
    "year": 1928,
    "noSmoothing": -0.2,
    "lowess5": -0.2
  },
  {
    "year": 1929,
    "noSmoothing": -0.36,
    "lowess5": -0.19
  },
  {
    "year": 1930,
    "noSmoothing": -0.15,
    "lowess5": -0.19
  },
  {
    "year": 1931,
    "noSmoothing": -0.09,
    "lowess5": -0.19
  },
  {
    "year": 1932,
    "noSmoothing": -0.16,
    "lowess5": -0.18
  },
  {
    "year": 1933,
    "noSmoothing": -0.28,
    "lowess5": -0.17
  },
  {
    "year": 1934,
    "noSmoothing": -0.13,
    "lowess5": -0.16
  },
  {
    "year": 1935,
    "noSmoothing": -0.2,
    "lowess5": -0.14
  },
  {
    "year": 1936,
    "noSmoothing": -0.15,
    "lowess5": -0.11
  },
  {
    "year": 1937,
    "noSmoothing": -0.03,
    "lowess5": -0.06
  },
  {
    "year": 1938,
    "noSmoothing": 0,
    "lowess5": -0.02
  },
  {
    "year": 1939,
    "noSmoothing": -0.02,
    "lowess5": 0.03
  },
  {
    "year": 1940,
    "noSmoothing": 0.12,
    "lowess5": 0.06
  },
  {
    "year": 1941,
    "noSmoothing": 0.18,
    "lowess5": 0.09
  },
  {
    "year": 1942,
    "noSmoothing": 0.06,
    "lowess5": 0.1
  },
  {
    "year": 1943,
    "noSmoothing": 0.09,
    "lowess5": 0.1
  },
  {
    "year": 1944,
    "noSmoothing": 0.2,
    "lowess5": 0.07
  },
  {
    "year": 1945,
    "noSmoothing": 0.09,
    "lowess5": 0.04
  },
  {
    "year": 1946,
    "noSmoothing": -0.07,
    "lowess5": 0
  },
  {
    "year": 1947,
    "noSmoothing": -0.03,
    "lowess5": -0.04
  },
  {
    "year": 1948,
    "noSmoothing": -0.11,
    "lowess5": -0.07
  },
  {
    "year": 1949,
    "noSmoothing": -0.11,
    "lowess5": -0.08
  },
  {
    "year": 1950,
    "noSmoothing": -0.17,
    "lowess5": -0.08
  },
  {
    "year": 1951,
    "noSmoothing": -0.07,
    "lowess5": -0.07
  },
  {
    "year": 1952,
    "noSmoothing": 0.01,
    "lowess5": -0.07
  },
  {
    "year": 1953,
    "noSmoothing": 0.08,
    "lowess5": -0.07
  },
  {
    "year": 1954,
    "noSmoothing": -0.13,
    "lowess5": -0.07
  },
  {
    "year": 1955,
    "noSmoothing": -0.14,
    "lowess5": -0.06
  },
  {
    "year": 1956,
    "noSmoothing": -0.19,
    "lowess5": -0.05
  },
  {
    "year": 1957,
    "noSmoothing": 0.05,
    "lowess5": -0.04
  },
  {
    "year": 1958,
    "noSmoothing": 0.06,
    "lowess5": -0.01
  },
  {
    "year": 1959,
    "noSmoothing": 0.03,
    "lowess5": 0.01
  },
  {
    "year": 1960,
    "noSmoothing": -0.02,
    "lowess5": 0.03
  },
  {
    "year": 1961,
    "noSmoothing": 0.06,
    "lowess5": 0.01
  },
  {
    "year": 1962,
    "noSmoothing": 0.03,
    "lowess5": -0.01
  },
  {
    "year": 1963,
    "noSmoothing": 0.05,
    "lowess5": -0.03
  },
  {
    "year": 1964,
    "noSmoothing": -0.2,
    "lowess5": -0.04
  },
  {
    "year": 1965,
    "noSmoothing": -0.11,
    "lowess5": -0.05
  },
  {
    "year": 1966,
    "noSmoothing": -0.06,
    "lowess5": -0.06
  },
  {
    "year": 1967,
    "noSmoothing": -0.02,
    "lowess5": -0.05
  },
  {
    "year": 1968,
    "noSmoothing": -0.08,
    "lowess5": -0.03
  },
  {
    "year": 1969,
    "noSmoothing": 0.05,
    "lowess5": -0.02
  },
  {
    "year": 1970,
    "noSmoothing": 0.03,
    "lowess5": 0
  },
  {
    "year": 1971,
    "noSmoothing": -0.08,
    "lowess5": 0
  },
  {
    "year": 1972,
    "noSmoothing": 0.01,
    "lowess5": 0
  },
  {
    "year": 1973,
    "noSmoothing": 0.16,
    "lowess5": 0
  },
  {
    "year": 1974,
    "noSmoothing": -0.07,
    "lowess5": 0.01
  },
  {
    "year": 1975,
    "noSmoothing": -0.01,
    "lowess5": 0.02
  },
  {
    "year": 1976,
    "noSmoothing": -0.1,
    "lowess5": 0.04
  },
  {
    "year": 1977,
    "noSmoothing": 0.18,
    "lowess5": 0.07
  },
  {
    "year": 1978,
    "noSmoothing": 0.07,
    "lowess5": 0.12
  },
  {
    "year": 1979,
    "noSmoothing": 0.16,
    "lowess5": 0.16
  },
  {
    "year": 1980,
    "noSmoothing": 0.26,
    "lowess5": 0.2
  },
  {
    "year": 1981,
    "noSmoothing": 0.32,
    "lowess5": 0.21
  },
  {
    "year": 1982,
    "noSmoothing": 0.14,
    "lowess5": 0.22
  },
  {
    "year": 1983,
    "noSmoothing": 0.31,
    "lowess5": 0.21
  },
  {
    "year": 1984,
    "noSmoothing": 0.16,
    "lowess5": 0.21
  },
  {
    "year": 1985,
    "noSmoothing": 0.12,
    "lowess5": 0.22
  },
  {
    "year": 1986,
    "noSmoothing": 0.18,
    "lowess5": 0.24
  },
  {
    "year": 1987,
    "noSmoothing": 0.32,
    "lowess5": 0.27
  },
  {
    "year": 1988,
    "noSmoothing": 0.39,
    "lowess5": 0.31
  },
  {
    "year": 1989,
    "noSmoothing": 0.27,
    "lowess5": 0.33
  },
  {
    "year": 1990,
    "noSmoothing": 0.45,
    "lowess5": 0.33
  },
  {
    "year": 1991,
    "noSmoothing": 0.41,
    "lowess5": 0.33
  },
  {
    "year": 1992,
    "noSmoothing": 0.22,
    "lowess5": 0.33
  },
  {
    "year": 1993,
    "noSmoothing": 0.23,
    "lowess5": 0.33
  },
  {
    "year": 1994,
    "noSmoothing": 0.31,
    "lowess5": 0.34
  },
  {
    "year": 1995,
    "noSmoothing": 0.45,
    "lowess5": 0.37
  },
  {
    "year": 1996,
    "noSmoothing": 0.33,
    "lowess5": 0.4
  },
  {
    "year": 1997,
    "noSmoothing": 0.47,
    "lowess5": 0.42
  },
  {
    "year": 1998,
    "noSmoothing": 0.61,
    "lowess5": 0.44
  },
  {
    "year": 1999,
    "noSmoothing": 0.38,
    "lowess5": 0.47
  },
  {
    "year": 2000,
    "noSmoothing": 0.39,
    "lowess5": 0.5
  },
  {
    "year": 2001,
    "noSmoothing": 0.53,
    "lowess5": 0.52
  },
  {
    "year": 2002,
    "noSmoothing": 0.63,
    "lowess5": 0.55
  },
  {
    "year": 2003,
    "noSmoothing": 0.62,
    "lowess5": 0.58
  },
  {
    "year": 2004,
    "noSmoothing": 0.53,
    "lowess5": 0.61
  },
  {
    "year": 2005,
    "noSmoothing": 0.68,
    "lowess5": 0.62
  },
  {
    "year": 2006,
    "noSmoothing": 0.64,
    "lowess5": 0.62
  },
  {
    "year": 2007,
    "noSmoothing": 0.66,
    "lowess5": 0.63
  },
  {
    "year": 2008,
    "noSmoothing": 0.54,
    "lowess5": 0.64
  },
  {
    "year": 2009,
    "noSmoothing": 0.66,
    "lowess5": 0.64
  },
  {
    "year": 2010,
    "noSmoothing": 0.72,
    "lowess5": 0.65
  },
  {
    "year": 2011,
    "noSmoothing": 0.61,
    "lowess5": 0.66
  },
  {
    "year": 2012,
    "noSmoothing": 0.65,
    "lowess5": 0.7
  },
  {
    "year": 2013,
    "noSmoothing": 0.67,
    "lowess5": 0.74
  },
  {
    "year": 2014,
    "noSmoothing": 0.75,
    "lowess5": 0.78
  },
  {
    "year": 2015,
    "noSmoothing": 0.89,
    "lowess5": 0.83
  },
  {
    "year": 2016,
    "noSmoothing": 1.01,
    "lowess5": 0.87
  },
  {
    "year": 2017,
    "noSmoothing": 0.91,
    "lowess5": 0.91
  },
  {
    "year": 2018,
    "noSmoothing": 0.85,
    "lowess5": 0.93
  },
  {
    "year": 2019,
    "noSmoothing": 0.98,
    "lowess5": 0.94
  },
  {
    "year": 2020,
    "noSmoothing": 1.01,
    "lowess5": 0.96
  },
  {
    "year": 2021,
    "noSmoothing": 0.85,
    "lowess5": 1.01
  },
  {
    "year": 2022,
    "noSmoothing": 0.89,
    "lowess5": 1.06
  },
  {
    "year": 2023,
    "noSmoothing": 1.17,
    "lowess5": 1.18
  },
  {
    "year": 2024,
    "noSmoothing": 1.28,
    "lowess5": 1.22
  },
  {
    "year": 2025,
    "noSmoothing": 1.18,
    "lowess5": 1.22
  }
];

export const USER_DATASET_METADATA = {
  title: "Land-Ocean Temperature Index (°C)",
  columns: ["Year", "No_Smoothing", "Lowess(5)"],
  coverage: "1880–2025 (146 annual records)",
  nature: "User-supplied reference dataset with 5-year LOWESS smoothing",
  baseline: "1951–1980 Base Period (0.0°C)",
  latestRecords: [
    { year: 2023, noSmoothing: 1.17, lowess5: 1.18 },
    { year: 2024, noSmoothing: 1.28, lowess5: 1.22 },
    { year: 2025, noSmoothing: 1.18, lowess5: 1.22 },
  ],
};
