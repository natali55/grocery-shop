import { products } from './products';

export const getProductsById = async (event: {productId: string}) => {
    const productById: any = products.find((product: any) => product.id === event.productId)

    if (!productById){
        return {
            statusCode: 404,
            message: 'Product not found'
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(productById)
    };
}
