
import type { Timestamp } from 'firebase/firestore';

export type MenuItemOptionChoice = {
  name: string;
  priceDelta?: number; // Optional price increase for this choice
};

export type MenuItemOptionGroup = {
  id: string;
  name: string;
  type: 'radio' | 'checkbox';
  choices: string[];
  minSelections?: number;
  maxSelections?: number;
  isRequired?: boolean;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  promotionalPrice?: number;
  imageUrl: string;
  restaurantId: string;
  isSoldOut?: boolean;
  category: string;
  options?: MenuItemOptionGroup[];
};

export type Restaurant = {
  id: string;
  name: string;
  logoUrl: string;
  rating: number;
  ratingCount?: number;
  category: string;
  bannerUrl: string;
  storeOwnerId: string;
  address: string;
  openingHours: string;
  promotionBannerText?: string;
  deliveryFee?: number;
  deliveryTime?: string;
  minOrder?: number;
  status: 'active' | 'pending' | 'inactive';
};

export type Driver = {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  vehicleType: string;
  licenseNumber: string;
  vehicleRegistration: string;
  status: 'active' | 'pending' | 'inactive';
  rating?: number;
  ratingCount?: number;
};

export type OrderStatus = 'Placed' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export type Order = {
  id: string;
  customerId: string;
  restaurantId: string;
  driverId: string | null;
  orderDate: Timestamp;
  deliveredAt?: Timestamp;
  status: OrderStatus;
  itemsTotal: number;
  deliveryFee: number;
  serviceFee: number;
  totalAmount: number;
  deliveryAddress: string;
  notes?: string;
  isRated?: boolean;
  participantUids: string[];
};

export type OrderItem = {
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    itemPrice: number;
    name: string;
    selectedOptions?: Record<string, string[]>; // Group Name -> Array of choice names
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
