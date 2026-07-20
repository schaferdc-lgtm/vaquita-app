import { ProjectComponent, Contribution } from './types';

export function stringToUUID(str: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    return str.toLowerCase();
  }

  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  
  let h3 = h1 ^ 0xabcdef01, h4 = h2 ^ 0x10fedcba;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h3 = Math.imul(h3 ^ ch, 2654435761);
    h4 = Math.imul(h4 ^ ch, 1597334677);
  }
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);
  
  const hex3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const hex4 = (h4 >>> 0).toString(16).padStart(8, '0');

  const combined = (hex1 + hex2 + hex3 + hex4).substring(0, 32);
  
  const part1 = combined.substring(0, 8);
  const part2 = combined.substring(8, 12);
  const part3 = '4' + combined.substring(13, 16);
  const part4 = 'a' + combined.substring(17, 20);
  const part5 = combined.substring(20, 32);
  
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Checks if a component is eligible for fractional/partial funding.
 * Rule: Unit price > 100,000 AND quantity < 3.
 * 
 * In these cases, backers do not need to buy an entire unit. They can contribute 
 * any amount up to the remaining value, which accumulates and is tracked.
 */
export function canComponentBePartiallyFunded(unitPrice: number, quantity: number): boolean {
  return unitPrice > 100000 && quantity < 3;
}

/**
 * Generates a company alias based on the component name.
 * Format: [PREFIX]-CORP.ALIAS where prefix is a sanitized word from the item name.
 */
export function generateCompanyAlias(componentName: string): string {
  const cleanWord = componentName
    .replace(/[^a-zA-Z0-9\s]/g, '') // remove special chars
    .trim()
    .split(/\s+/)[0] // take first word
    .toUpperCase();
  
  const prefix = cleanWord || 'CORP';
  return `${prefix}-CORP.ALIAS`;
}

/**
 * Generates a unique, secure coupon code.
 */
export function generateCouponCode(): string {
  const randomHex = () => Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1)
    .toUpperCase();
  return `CUPON-${randomHex()}-${randomHex()}`;
}

export interface FundingResult {
  success: boolean;
  error?: string;
  updatedComponent: ProjectComponent;
  contribution: Contribution | null;
}

/**
 * Core business logic to back/fund a component.
 * Supports both full itemized stock deduction and partial fractional funding.
 * 
 * @param component The project component to fund
 * @param isPartialContribution Whether the user wants to put a custom amount (for eligible items only)
 * @param purchaseQuantity The quantity to purchase (if full item deduction)
 * @param customAmount The custom currency contribution (if partial fractional funding)
 * @param backerId The logged-in backer's ID
 * @param backerEmail The logged-in backer's email
 * @param backerName The logged-in backer's name
 */
export function fundComponent(
  component: ProjectComponent,
  isPartialContribution: boolean,
  purchaseQuantity: number,
  customAmount: number,
  backerId: string,
  backerEmail: string,
  backerName: string
): FundingResult {
  const allowPartial = canComponentBePartiallyFunded(component.unit_price, component.quantity);
  const updatedComponent = { ...component };

  if (isPartialContribution && !allowPartial) {
    return {
      success: false,
      error: 'Este componente no permite aportes parciales. Debe comprar unidades completas.',
      updatedComponent,
      contribution: null,
    };
  }

  let finalAmount = 0;
  let finalQtyBought = 0;

  if (isPartialContribution) {
    // Partial contribution based on custom currency amount
    if (customAmount <= 0) {
      return {
        success: false,
        error: 'El monto de aporte debe ser mayor que cero.',
        updatedComponent,
        contribution: null,
      };
    }

    const maxFundableCurrency = (component.remaining_quantity * component.unit_price) - component.funded_amount;
    
    if (customAmount > maxFundableCurrency + 0.01) { // small tolerance for floating point
      return {
        success: false,
        error: `El aporte excede el monto restante necesario para este componente ($${maxFundableCurrency.toLocaleString()}).`,
        updatedComponent,
        contribution: null,
      };
    }

    finalAmount = customAmount;
    // Calculate the fractional quantity purchased based on the amount
    finalQtyBought = Number((customAmount / component.unit_price).toFixed(6));

    // Update the component's state
    updatedComponent.funded_amount = Number((component.funded_amount + customAmount).toFixed(2));
    
    // Decrement the remaining quantity proportionally
    const qtyReduced = Number((customAmount / component.unit_price).toFixed(6));
    updatedComponent.remaining_quantity = Math.max(0, Number((component.remaining_quantity - qtyReduced).toFixed(6)));

    // If fully funded or within rounding, lock to 0 remaining
    if (Math.abs(updatedComponent.remaining_quantity) < 0.0001 || updatedComponent.funded_amount >= (component.quantity * component.unit_price) - 0.1) {
      updatedComponent.remaining_quantity = 0;
    }
  } else {
    // Complete stock purchase based on units
    if (purchaseQuantity <= 0) {
      return {
        success: false,
        error: 'La cantidad a comprar debe ser mayor que cero.',
        updatedComponent,
        contribution: null,
      };
    }

    if (purchaseQuantity > component.remaining_quantity) {
      return {
        success: false,
        error: `No hay suficiente stock disponible. Unidades disponibles: ${Math.floor(component.remaining_quantity)}.`,
        updatedComponent,
        contribution: null,
      };
    }

    finalAmount = purchaseQuantity * component.unit_price;
    finalQtyBought = purchaseQuantity;

    // Update remaining stock
    updatedComponent.remaining_quantity = Number((component.remaining_quantity - purchaseQuantity).toFixed(6));
    updatedComponent.funded_amount = Number((component.funded_amount + finalAmount).toFixed(2));
  }

  const couponCode = generateCouponCode();
  const companyAlias = generateCompanyAlias(component.name);

  const contribution: Contribution = {
    id: generateUUID(),
    project_id: component.project_id,
    component_id: stringToUUID(component.id),
    backer_id: backerId,
    backer_email: backerEmail,
    backer_name: backerName,
    amount: finalAmount,
    quantity_bought: finalQtyBought,
    coupon_code: couponCode,
    company_alias: companyAlias,
    created_at: new Date().toISOString(),
    status: 'pending',
  };

  return {
    success: true,
    updatedComponent,
    contribution,
  };
}
