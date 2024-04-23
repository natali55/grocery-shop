export interface ProductBase {
    price: number;
    title: string;
    description: string;
}

export interface ProductBaseWithId extends ProductBase{
    id: string;
}

export interface Product extends ProductBaseWithId {
    count: number;
}
