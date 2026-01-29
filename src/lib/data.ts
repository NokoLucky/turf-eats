import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';
import type { Timestamp } from 'firebase/firestore';


const findImage = (id: string): ImagePlaceholder => {
  const image = PlaceHolderImages.find((img) => img.id === id);
  if (!image) {
    // Fallback to a default image if not found
    return { id: 'fallback', description: 'Placeholder', imageUrl: 'https://picsum.photos/seed/fallback/200/200', imageHint: 'placeholder' };
  }
  return image;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  promotionalPrice?: number;
  image: ImagePlaceholder;
  restaurantId: string;
  imageUrl: string;
};

export type Restaurant = {
  id: string;
  name: string;
  logoUrl: string;
  rating: number;
  category: string;
  bannerUrl: string;
  storeOwnerId: string;
  address: string;
  openingHours: string;
  promotionBannerText?: string;
};

export type OrderStatus = 'Placed' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export type Order = {
  id: string;
  customerId: string;
  restaurantId: string;
  driverId: string | null;
  orderDate: Timestamp;
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: string;
  notes?: string;
  isRated?: boolean;
  // This is a denormalized field for easier display on the customer side.
  // It won't be fetched on the owner side.
  restaurantName?: string;
};

export type OrderItem = {
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    itemPrice: number;
    name: string; // Denormalized for display
};

export type Rating = {
    id: string;
    orderId: string;
    customerId: string;
    restaurantId: string;
    driverId: string | null;
    restaurantRating: number;
    restaurantComment?: string;
    driverRating?: number;
    driverComment?: string;
    createdAt: Timestamp;
}

// This is placeholder and will be removed from pages that use it.
export const orders: any[] = [];
