import { Injectable } from '@nestjs/common';
import { CartEntity, CartItemEntity } from '../entity'

import { v4 } from 'uuid';

import { Cart } from '../models';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity) private readonly cartRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity) private readonly cartItemRepository: Repository<CartItemEntity>
  ){}

  private userCarts: Record<string, Cart> = {};

  // findByUserId(userId: string): Cart {
  //   return this.userCarts[ userId ];
  // }

  async findByUserId(userId: string): Promise<CartEntity> {
    return this.cartRepository.findOne({ where: { userId } });
  }

  // createByUserId(userId: string) {
  //   const id = v4();
  //   const userCart = {
  //     id,
  //     items: [],
  //   };

  //   this.userCarts[ userId ] = userCart;

  //   return userCart;
  // }

  async createByUserId(userId: string): Promise<CartEntity> {
    const userCart = this.cartRepository.create({ userId, items: [] });
    return this.cartRepository.save(userCart);
  }

  // findOrCreateByUserId(userId: string): Cart {
  //   const userCart = this.findByUserId(userId);

  //   if (userCart) {
  //     return userCart;
  //   }

  //   return this.createByUserId(userId);
  // }

  async findOrCreateByUserId(userId: string): Promise<CartEntity> {
    let userCart = await this.findByUserId(userId);
    if (!userCart) {
      userCart = this.cartRepository.create({ userId, items: [] });
      await this.cartRepository.save(userCart);
    }
    return userCart;
  }

  // updateByUserId(userId: string, { items }: Cart): Cart {
  //   const { id, ...rest } = this.findOrCreateByUserId(userId);

  //   const updatedCart = {
  //     id,
  //     ...rest,
  //     items: [ ...items ],
  //   }

  //   this.userCarts[ userId ] = { ...updatedCart };

  //   return { ...updatedCart };
  // }

  async updateByUserId(userId: string, items: CartItemEntity[]): Promise<CartEntity> {
    let userCart = await this.findOrCreateByUserId(userId);
    userCart.items = items;
    return this.cartRepository.save(userCart);
  }

  // removeByUserId(userId): void {
  //   this.userCarts[ userId ] = null;
  // }

  async removeByUserId(userId: string): Promise<void> {
    await this.cartRepository.delete({ userId });
  }
}
