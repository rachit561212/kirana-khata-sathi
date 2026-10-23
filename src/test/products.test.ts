import { describe, expect, it } from 'vitest';
import { filterProducts, receiptProducts } from '@/lib/products';
import type { Item, Receipt } from '@/lib/khata';
const item: Item = { name: 'Rice 1kg', qty: 10, rate: 90, gst: 0, cat: 'Staples' };
const purchase: Receipt = { id: 'buy', vendor: 'Supplier', date: '2026-10-23', source: 'Bill', kind: 'spent', payment: 'Credit', status: 'accepted', conf: 100, stockMovement: 'purchase', items: [item] };
const sale: Receipt = { ...purchase, id: 'sale', stockMovement: 'sale', kind: 'received', items: [{ ...item, qty: 4 }] };
describe('Automatic product stock', () => {
 it('adds purchased quantities', () => { expect(receiptProducts([purchase])[0]).toMatchObject({ quantity: 10, in_stock: true }); });
 it('subtracts sold quantities', () => { expect(receiptProducts([purchase, sale])[0]?.quantity).toBe(6); });
 it('marks a fully sold product out of stock without removing it', () => { const rows = receiptProducts([purchase, {...sale, items: purchase.items}]); expect(rows[0]).toMatchObject({quantity: 0, in_stock: false}); expect(filterProducts(rows, '', 'out')).toHaveLength(1); });
 it('ignores drafts until reviewed', () => { expect(receiptProducts([{...purchase,status:'new'}])).toEqual([]); });
 it('excludes duplicates and dismissed bills', () => { expect(receiptProducts([{...purchase,dupOf:'other'}, {...purchase,status:'dismissed'}])).toEqual([]); });
 it('recalculates edits without counting the old quantity twice', () => { expect(receiptProducts([{...purchase,items: [{...item,qty: 7}]}])[0]?.quantity).toBe(7); });
 it('does not infer purchases from money spent or pending orders', () => { expect(receiptProducts([{...purchase,stockMovement:'none'}, {...purchase,stockMovement:'none'}])).toEqual([]); });
 it('subtracts credit sales irrespective of payment direction', () => { expect(receiptProducts([purchase,{...sale,kind:'spent',payment:'Credit'}])[0]?.quantity).toBe(6); });
 it('preserves negative balance for missing-purchase warning', () => { expect(receiptProducts([sale])[0]).toMatchObject({quantity:-4,in_stock:false}); });
 it('keeps different pack sizes separate', () => { expect(receiptProducts([purchase,{...purchase,id:'pack',items:[{...item,name:'Rice 25kg'}]}])).toHaveLength(2); });
 it('matches same product ignoring case and extra spaces', () => { expect(receiptProducts([purchase,{...sale,items:[{...item,name:' rice  1kg '}]}])[0]?.quantity).toBe(6); });
});
