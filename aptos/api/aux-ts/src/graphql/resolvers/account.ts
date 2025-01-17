import * as aux from "../../";
import { AU } from "../../";
import AuxAccount from "../../account";
import { auxClient } from "../connection";
import {
  Account,
  AccountPoolPositionsArgs,
  AccountOpenOrdersArgs,
  AccountOrderHistoryArgs,
  AccountTradeHistoryArgs,
  Balance,
  Deposit,
  Order,
  OrderStatus,
  OrderType,
  Side,
  Transfer,
  Withdrawal,
  Position,
  Trade,
} from "../types";

export const account = {
  async balances(parent: Account): Promise<Balance[]> {
    const account = new AuxAccount(auxClient, parent.address);
    const balances = await account.balances();

    return await Promise.all(
      balances.balances.map(async (e) => ({
        coinInfo: await auxClient.getCoinInfo(e.key.name),
        availableBalance: e.value.available_balance.toNumber(),
        balance: e.value.balance.toNumber(),
      }))
    );
  },
  async deposits(parent: Account): Promise<Deposit[]> {
    const account = new AuxAccount(auxClient, parent.address);
    const deposits = await account.deposits();
    // console.log(deposits);
    return deposits.map((deposit) => ({
      // @ts-ignore
      coinType: deposit.data.coinType,
      // @ts-ignore
      owner: deposit.data.owner,
      // @ts-ignore
      amount: deposit.data.amount.toNumber(),
    }));
  },
  async withdrawals(parent: Account): Promise<Withdrawal[]> {
    const account = new AuxAccount(auxClient, parent.address);
    const withdrawals = await account.withdrawals();
    console.log(withdrawals);
    return withdrawals.map((withdrawal) => ({
      // @ts-ignore
      coinType: withdrawal.data.coinType,
      // @ts-ignore
      owner: withdrawal.data.owner,
      // @ts-ignore
      amount: withdrawal.data.amount.toNumber(),
    }));
  },
  async transfers(parent: Account): Promise<Transfer[]> {
    const account = new AuxAccount(auxClient, parent.address);
    const transfers = await account.transfers();
    return transfers.map((transfer) => ({
      // @ts-ignore
      coinType: transfer.data.coinType,
      // @ts-ignore
      from: transfer.data.from,
      // @ts-ignore
      to: transfer.data.to,
      // @ts-ignore
      amount: transfer.data.amount.toNumber(),
    }));
  },
  async poolPositions(
    parent: Account,
    args: AccountPoolPositionsArgs
  ): Promise<Position[]> {
    const poolInputs = args.poolInputs ?? (await aux.Pool.index(auxClient));
    const auxPositions = await Promise.all(
      poolInputs.map((poolInput) =>
        aux.amm.core.query.position(auxClient, parent.address, poolInput)
      )
    );
    return auxPositions
      .filter((auxPosition) => auxPosition !== undefined)
      .map((auxPosition) => {
        const pos = auxPosition!;
        return {
          ...pos,
          amountX: pos.amountX.toNumber(),
          amountY: pos.amountY.toNumber(),
          amountLP: pos.amountLP.toNumber(),
        };
      });
  },
  async openOrders(
    parent: Account,
    args: AccountOpenOrdersArgs
  ): Promise<Order[]> {
    const marketInputs =
      args.marketInputs ?? (await aux.Market.index(auxClient));
    const account = new aux.Account(auxClient, parent.address);
    const orderss = await Promise.all(
      marketInputs.map(async (marketInput) => {
        const market = await aux.Market.read(auxClient, marketInput);
        const orders = await account.openOrders(marketInput);
        return orders.map((order) => {
          return {
            baseCoinType: market.baseCoinInfo.coinType,
            quoteCoinType: market.quoteCoinInfo.coinType,
            orderId: order.id.toString(),
            owner: order.ownerId.hex(),
            orderType: OrderType.Limit,
            orderStatus: OrderStatus.Open,
            side: order.side === "bid" ? Side.Buy : Side.Sell,
            auxBurned: order.auxBurned
              .toDecimalUnits(6) // FIXME
              .toNumber(),
            time: order.time.toString(),
            price: AU(order.price)
              .toDecimalUnits(market.quoteCoinInfo.decimals)
              .toNumber(),
            quantity: AU(order.quantity)
              .toDecimalUnits(market.baseCoinInfo.decimals)
              .toNumber(),
          };
        });
      })
    );
    return orderss.flat();
  },
  async orderHistory(
    parent: Account,
    args: AccountOrderHistoryArgs
  ): Promise<Order[]> {
    const marketInputs =
      args.marketInputs ?? (await aux.Market.index(auxClient));
    const account = new aux.Account(auxClient, parent.address);
    const orderss = await Promise.all(
      marketInputs.map(async (marketInput) => {
        const market = await aux.Market.read(auxClient, marketInput);
        const orders = await account.orderHistory(marketInput);
        return orders.map((order) => {
          return {
            baseCoinType: market.baseCoinInfo.coinType,
            quoteCoinType: market.quoteCoinInfo.coinType,
            orderId: order.orderId.toString(),
            owner: order,
            orderType: OrderType.Limit,
            orderStatus: OrderStatus.Open,
            side: order.isBid ? Side.Buy : Side.Sell,
            // FIXME
            auxBurned: 0,
            // FIXME
            time: "0",
            price: order.price
              .toDecimalUnits(market.quoteCoinInfo.decimals)
              .toNumber(),
            quantity: order.quantity
              .toDecimalUnits(market.baseCoinInfo.decimals)
              .toNumber(),
          };
        });
      })
    );
    return orderss.flat();
  },
  async tradeHistory(
    parent: Account,
    args: AccountTradeHistoryArgs
  ): Promise<Trade[]> {
    const marketInputs =
      args.marketInputs ?? (await aux.Market.index(auxClient));
    const account = new aux.Account(auxClient, parent.address);
    const tradess = await Promise.all(
      marketInputs.map(async (marketInput) => {
        const market = await aux.Market.read(auxClient, marketInput);
        const fills = await account.tradeHistory(marketInput);
        return fills.map((fill) => {
          const price = fill.price
            .toDecimalUnits(market.quoteCoinInfo.decimals)
            .toNumber();
          const quantity = fill.baseQuantity
            .toDecimalUnits(market.baseCoinInfo.decimals)
            .toNumber();
          return {
            baseCoinType: market.baseCoinInfo.coinType,
            quoteCoinType: market.quoteCoinInfo.coinType,
            orderId: fill.orderId.toString(),
            owner: fill.owner,
            market: `${market.baseCoinInfo.symbol}-${market.quoteCoinInfo.symbol}`,
            side: fill.isBid ? Side.Buy : Side.Sell,
            quantity,
            price,
            value: price * quantity,
            // FIXME
            auxBurned: 0,
            // FIXME
            time: "0",
          };
        });
      })
    );
    return tradess.flat();
  },

  // async account(owner: string) {
  //   const account = new aux.Account(auxClient, owner);
  //   const orders = (await account.orderHistory(undefined))["data"]!
  //     .data as aux.clob.core.query.OrderPlacedEvent[];

  //   const openOrders = orders.map((order) => {
  //     return {
  //       orderId: order.orderId.toString(),
  //       owner: order,
  //       // market: `${parent.baseCoinInfo.symbol}-${parent.quoteCoinInfo.symbol}`,
  //       market: "NOT IMPLEMENTED",
  //       orderType: OrderType.Limit,
  //       orderStatus: OrderStatus.Open,
  //       side: order.isBid ? Side.Buy : Side.Sell,
  //       // FIXME
  //       auxBurned: 0,
  //       // FIXME
  //       time: "0",
  //       price: order.price
  //         .toDecimalUnits(parent.quoteCoinInfo.decimals)
  //         .toNumber(),
  //       quantity: order.quantity
  //         .toDecimalUnits(parent.baseCoinInfo.decimals)
  //         .toNumber(),
  //     };
  //   });
  //   return {
  //     async orderHistory(): Promise<Order[]> {},

  //     async tradeHistory(
  //       account: aux.Account,
  //       parent: Market
  //     ): Promise<Trade[]> {
  //       const fills = (await account.tradeHistory(undefined))["data"]!
  //         .data as aux.clob.core.query.OrderFillEvent[];

  //       return fills.map((fill) => {
  //         const price = fill.price
  //           .toDecimalUnits(parent.quoteCoinInfo.decimals)
  //           .toNumber();
  //         const quantity = fill.baseQuantity
  //           .toDecimalUnits(parent.baseCoinInfo.decimals)
  //           .toNumber();
  //         return {
  //           orderId: fill.orderId.toString(),
  //           owner: fill.owner,
  //           market: `${parent.baseCoinInfo.symbol}-${parent.quoteCoinInfo.symbol}`,
  //           side: fill.isBid ? Side.Buy : Side.Sell,
  //           quantity,
  //           price,
  //           value: price * quantity,
  //           // FIXME
  //           auxBurned: 0,
  //           // FIXME
  //           time: "0",
  //         };
  //       });
  //     },
  //   };
  // }
};
