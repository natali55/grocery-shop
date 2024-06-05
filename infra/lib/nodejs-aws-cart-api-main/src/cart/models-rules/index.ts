// import { Cart, CartItem } from '../models';

// /**
//  * @param {Cart} cart
//  * @returns {number}
//  */
// export function calculateCartTotal(cart: Cart): number {
//   return cart ? cart.items.reduce((acc: number, { product: { price }, count }: CartItem) => {
//     return acc += price * count;
//   }, 0) : 0;
// }

import { CartEntity, CartItemEntity } from '../entity';

/**
 * @param {CartEntity} cartEntity
 * @returns {number}
 */
export function calculateCartTotal(cartEntity: CartEntity): number {
  return cartEntity && cartEntity.items ? cartEntity.items.reduce((acc: number, cartItemEntity: CartItemEntity) => {
    const { price, count } = cartItemEntity;
    return acc += price * count;
  }, 0) : 0;
}