import { products } from './products';

export const getProductsList = async () => {
    if (!products){
        return {
            statusCode: 404,
            message: 'Products not found'
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(products)
    };
}
