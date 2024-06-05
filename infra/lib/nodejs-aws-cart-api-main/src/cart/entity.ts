import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';

@Entity()
export class CartEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @OneToMany(() => CartItemEntity, item => item.cart, { cascade: true })
  items: CartItemEntity[];
}

@Entity()
export class CartItemEntity {
  @PrimaryGeneratedColumn()
  id: number;
  count: number;

  @Column('float')
  price: number;

  @ManyToOne(() => CartEntity, cart => cart.items)
  cart: CartEntity;
}