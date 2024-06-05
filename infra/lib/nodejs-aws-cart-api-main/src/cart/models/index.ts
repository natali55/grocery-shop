enum CartStatuses {
  OPEN = 'OPEN',
  ORDERED = 'ORDERED'
}

// export type Product = {
//   id: string,
//   title: string,
//   description: string,
//   price: number,
// };


// export type CartItem = {
//   cart_id: string,
//   product_id: string,
//   count: number,
// }

// export type Cart = {
//   id: string,
//   user_id: string,
//   status: CartStatuses,
//   items: CartItem[],
// }


export type Product = {
  id: string,
  title: string,
  description: string,
  price: number,
};


export type CartItem = {
  product: Product,
  count: number,
}

export type Cart = {
  id: string,
  items: CartItem[],
}
