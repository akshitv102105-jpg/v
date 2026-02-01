import { ExchangeConfig } from '../types';

export const EXCHANGE_PRESETS: ExchangeConfig[] = [
    // Crypto
    {
        name: 'Binance',
        category: 'Crypto',
        makerFee: 0.02,
        takerFee: 0.05,
        feeType: 'PERCENTAGE',
        maxLeverage: 125,
        icon: 'fa-brands fa-bitcoin'
    },
    {
        name: 'Bybit',
        category: 'Crypto',
        makerFee: 0.02,
        takerFee: 0.055,
        feeType: 'PERCENTAGE',
        maxLeverage: 100,
        icon: 'fa-solid fa-coins'
    },
    {
        name: 'OKX',
        category: 'Crypto',
        makerFee: 0.02,
        takerFee: 0.05,
        feeType: 'PERCENTAGE',
        maxLeverage: 100,
        icon: 'fa-solid fa-cube'
    },
    {
        name: 'KuCoin',
        category: 'Crypto',
        makerFee: 0.02,
        takerFee: 0.06,
        feeType: 'PERCENTAGE',
        maxLeverage: 100,
        icon: 'fa-solid fa-chart-line'
    },
    {
        name: 'Bitget',
        category: 'Crypto',
        makerFee: 0.02,
        takerFee: 0.04,
        feeType: 'PERCENTAGE',
        maxLeverage: 125,
        icon: 'fa-solid fa-bolt'
    },
    // Forex
    {
        name: 'IC Markets',
        category: 'Forex',
        makerFee: 3.5, // Per lot fixed
        takerFee: 3.5,
        feeType: 'FIXED',
        maxLeverage: 500,
        icon: 'fa-solid fa-money-bill-transfer'
    },
    {
        name: 'Pepperstone',
        category: 'Forex',
        makerFee: 3.5,
        takerFee: 3.5,
        feeType: 'FIXED',
        maxLeverage: 500,
        icon: 'fa-solid fa-money-bill-transfer'
    },
    {
        name: 'Exness',
        category: 'Forex',
        makerFee: 0,
        takerFee: 0,
        feeType: 'PERCENTAGE', // Spread based usually, but we'll use 0 for now or symbolic
        maxLeverage: 2000,
        icon: 'fa-solid fa-money-bill-transfer'
    },
    {
        name: 'OANDA',
        category: 'Forex',
        makerFee: 0.005,
        takerFee: 0.005,
        feeType: 'PERCENTAGE',
        maxLeverage: 50,
        icon: 'fa-solid fa-building-columns'
    },
    {
        name: 'IG',
        category: 'Forex',
        makerFee: 0.01,
        takerFee: 0.01,
        feeType: 'PERCENTAGE',
        maxLeverage: 200,
        icon: 'fa-solid fa-landmark'
    }
];
