import * as aux from "../../";
import { auxClient } from "../connection";
import type {
  Account,
  Market,
  Maybe,
  Pool,
  QueryAccountArgs,
  QueryMarketArgs,
  QueryMarketsArgs,
  QueryPoolArgs,
  QueryPoolsArgs,
} from "../types";

export const query = {
  address() {
    return auxClient.moduleAddress;
  },
  async pool(_parent: any, { poolInput }: QueryPoolArgs): Promise<Maybe<Pool>> {
    const pool = await aux.Pool.read(auxClient, poolInput);
    if (pool === undefined) {
      return null;
    }
    // @ts-ignore
    return {
      coinInfoX: pool.coinInfoX,
      coinInfoY: pool.coinInfoY,
      coinInfoLP: pool.coinInfoLP,
      amountX: pool.amountX.toNumber(),
      amountY: pool.amountY.toNumber(),
      amountLP: pool.amountLP.toNumber(),
      feePercent: pool.feePct,
    };
  },
  async pools(_parent: any, args: QueryPoolsArgs): Promise<Pool[]> {
    const poolReadParams = args.poolInputs
      ? args.poolInputs
      : await aux.Pool.index(auxClient);
    const pools = await Promise.all(
      poolReadParams.map((poolReadParam) =>
        aux.Pool.read(auxClient, poolReadParam)
      )
    );
    // @ts-ignore
    return pools
      .filter((maybePool) => maybePool !== undefined && maybePool !== null)
      .map((pool) => ({
        coinInfoX: pool!.coinInfoX,
        coinInfoY: pool!.coinInfoY,
        coinInfoLP: pool!.coinInfoLP,
        amountX: pool!.amountX.toNumber(),
        amountY: pool!.amountY.toNumber(),
        amountLP: pool!.amountLP.toNumber(),
        feePct: pool!.feePct,
      }));
  },
  async poolCoins(parent: any) {
    const pools = await this.pools(parent, {});
    const coinInfos = pools.flatMap((pool) => [pool.coinInfoX, pool.coinInfoY]);
    return coinInfos.filter((coinInfo, i) => coinInfos.indexOf(coinInfo) === i);
  },
  async market(_parent: any, args: QueryMarketArgs): Promise<Maybe<Market>> {
    let market: aux.Market;
    try {
      market = await aux.Market.read(auxClient, args.marketInput);
    } catch (err) {
      return null;
    }
    // @ts-ignore
    return {
      name: `${market.baseCoinInfo.name}-${market.quoteCoinInfo.name}`,
      baseCoinInfo: market.baseCoinInfo,
      quoteCoinInfo: market.quoteCoinInfo,
      lotSize: market.lotSize.toNumber(),
      tickSize: market.tickSize.toNumber(),
      orderbook: {
        bids: market.level2.bids.map((l2) => ({
          price: l2.price.toNumber(),
          quantity: l2.quantity.toNumber(),
        })),
        asks: market.level2.asks.map((l2) => ({
          price: l2.price.toNumber(),
          quantity: l2.quantity.toNumber(),
        })),
      },
    };
  },
  async markets(_parent: any, args: QueryMarketsArgs): Promise<Market[]> {
    const markets = await aux.clob.core.query.markets(auxClient);
    const marketInputs = args.marketInputs;
    const auxCoinInfo = await auxClient.getCoinInfo(
      `${auxClient.moduleAddress}::aux_coin::AuxCoin`
    );
    if (marketInputs === undefined || marketInputs === null) {
      // @ts-ignore
      return (
        await Promise.all(
          markets.map((market) =>
            aux.Market.read(auxClient, {
              baseCoinType: market.baseCoinType,
              quoteCoinType: market.quoteCoinType,
            })
          )
        )
      ).map((market) => {
        return {
          name: `${market.baseCoinInfo.name}-${market.quoteCoinInfo.name}`,
          baseCoinInfo: market.baseCoinInfo,
          quoteCoinInfo: market.quoteCoinInfo,
          lotSize: market.lotSize.toNumber(),
          tickSize: market.tickSize.toNumber(),
          auxCoinInfo,
          orderbook: {
            bids: market.level2.bids.map((l2) => ({
              price: l2.price.toNumber(),
              quantity: l2.quantity.toNumber(),
            })),
            asks: market.level2.asks.map((l2) => ({
              price: l2.price.toNumber(),
              quantity: l2.quantity.toNumber(),
            })),
          },
        };
      });
    } else {
      // @ts-ignore
      return (
        await Promise.all(
          marketInputs.map((marketInput) =>
            aux.Market.read(auxClient, marketInput)
          )
        )
      )
        .filter(
          (maybeMarket) => maybeMarket !== undefined && maybeMarket !== null
        )
        .map((market) => {
          return {
            name: `${market.baseCoinInfo.name}-${market.quoteCoinInfo.name}`,
            baseCoinInfo: market.baseCoinInfo,
            quoteCoinInfo: market.quoteCoinInfo,
            lotSize: market.lotSize.toNumber(),
            tickSize: market.tickSize.toNumber(),
            auxCoinInfo,
            orderbook: {
              bids: market.level2.bids.map((l2) => ({
                price: l2.price.toNumber(),
                quantity: l2.quantity.toNumber(),
              })),
              asks: market.level2.asks.map((l2) => ({
                price: l2.price.toNumber(),
                quantity: l2.quantity.toNumber(),
              })),
            },
          };
        });
    }
  },
  async marketCoins(parent: any) {
    const markets = await this.markets(parent, {});
    const coinInfos = markets.flatMap((market) => [
      market.baseCoinInfo,
      market.quoteCoinInfo,
    ]);
    return coinInfos.filter((coinInfo, i) => coinInfos.indexOf(coinInfo) === i);
  },
  account(_parent: any, { owner }: QueryAccountArgs): Account {
    // @ts-ignore
    return {
      address: owner,
    };
  },
};
